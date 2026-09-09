import { core } from '@opentelemetry/sdk-node';
import { TRACEFLOW_PROTOCOL_VERSION, TRACEFLOW_SDK_NAME, TRACEFLOW_SDK_VERSION } from '../../../settings/constants';
import { readableSpanToTraceFlowSpan } from '../functions/span-converter.function';
import { buildBatchEndpoint } from '../functions/batch-endpoint.function';
import { TRACEFLOW_EXPORTER_WARNING_INTERVAL_MS } from '../constants';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-node';
import type { TraceFlowSpanBatchDto } from '../interfaces/protocol.interface';
import type { ResolvedTraceFlowOptions } from '../../../settings/interfaces/traceflow-options.interface';

export class TraceFlowHttpExporter implements SpanExporter {
  private readonly endpoint: string;
  private readonly inFlight = new Set<Promise<void>>();
  private stopped = false;
  private lastWarningAt = 0;

  constructor(private readonly options: ResolvedTraceFlowOptions) {
    this.endpoint = buildBatchEndpoint(options.studioUrl);
  }

  export(spans: ReadableSpan[], resultCallback: Parameters<SpanExporter['export']>[1]): void {
    if (this.stopped) {
      resultCallback({
        code: core.ExportResultCode.FAILED,
        error: new Error('TraceFlow exporter detenido'),
      });
      return;
    }

    if (spans.length === 0) {
      resultCallback({ code: core.ExportResultCode.SUCCESS });
      return;
    }

    const operation = this.send(spans)
      .then(() => {
        resultCallback({ code: core.ExportResultCode.SUCCESS });
      })
      .catch((error: unknown) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        this.warnUnavailable(normalizedError);
        resultCallback({
          code: core.ExportResultCode.FAILED,
          error: normalizedError,
        });
      });

    this.inFlight.add(operation);
    void operation.finally(() => {
      this.inFlight.delete(operation);
    });
  }

  async forceFlush(): Promise<void> {
    await Promise.allSettled([...this.inFlight]);
  }

  async shutdown(): Promise<void> {
    this.stopped = true;
    await this.forceFlush();
  }

  private async send(spans: ReadableSpan[]): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.requestTimeoutMs);

    const batch: TraceFlowSpanBatchDto = {
      protocolVersion: TRACEFLOW_PROTOCOL_VERSION,
      sdkName: TRACEFLOW_SDK_NAME,
      sdkVersion: TRACEFLOW_SDK_VERSION,
      sentAt: new Date().toISOString(),
      spans: spans.map((span) => readableSpanToTraceFlowSpan(span, this.options.serviceName)),
      ...(this.options.flows.length > 0 ? { flows: this.options.flows } : {}),
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          ...this.options.headers,
          'Content-Type': 'application/json',
          'X-TraceFlow-Protocol-Version': String(TRACEFLOW_PROTOCOL_VERSION),
        },
        body: JSON.stringify(batch),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Studio respondió HTTP ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private warnUnavailable(error: Error): void {
    if (!this.options.debug) {
      return;
    }
    const now = Date.now();
    if (now - this.lastWarningAt < TRACEFLOW_EXPORTER_WARNING_INTERVAL_MS) {
      return;
    }

    this.lastWarningAt = now;
    console.warn(`[TraceFlow] Studio no disponible: ${error.message}`);
  }
}
