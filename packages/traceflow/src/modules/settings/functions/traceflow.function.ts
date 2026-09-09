import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { TRACEFLOW_DEFAULT_REQUEST_TIMEOUT_MS, TRACEFLOW_DEFAULT_STUDIO_URL } from '../constants';
import { TraceFlowHttpExporter } from '../../traces/shared/exporters/traceflow-http.exporter';
import type { ResolvedTraceFlowOptions, TraceFlowOptions } from '../interfaces/traceflow-options.interface';
import { traceFlowRuntime } from '../traceflow.runtime';

export function startTraceFlow(options: TraceFlowOptions): void {
  const resolved = resolveOptions(options);

  if (!resolved.enabled || traceFlowRuntime.sdk) {
    return;
  }

  const nextExporter = new TraceFlowHttpExporter(resolved);
  const nextSdk = new NodeSDK({
    serviceName: resolved.serviceName,
    instrumentations: resolved.instrumentHttp ? [new HttpInstrumentation()] : [],
    spanProcessors: [
      new BatchSpanProcessor(nextExporter, {
        scheduledDelayMillis: 250,
        maxExportBatchSize: 128,
        maxQueueSize: 1_024,
        exportTimeoutMillis: Math.max(resolved.requestTimeoutMs + 500, 3_000),
      }),
    ],
  });

  try {
    nextSdk.start();
    traceFlowRuntime.exporter = nextExporter;
    traceFlowRuntime.sdk = nextSdk;
    registerSignalHandlers();

    if (resolved.debug) {
      console.info(`[TraceFlow] iniciado para ${resolved.serviceName} → ${resolved.studioUrl}`);
    }
  } catch (error: unknown) {
    if (resolved.debug) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[TraceFlow] no pudo inicializarse: ${message}`);
    }
  }
}

export async function forceFlushTraceFlow(): Promise<void> {
  await traceFlowRuntime.exporter?.forceFlush();
}

export async function shutdownTraceFlow(): Promise<void> {
  if (traceFlowRuntime.shuttingDown) {
    return;
  }

  traceFlowRuntime.shuttingDown = true;
  const currentSdk = traceFlowRuntime.sdk;
  const currentExporter = traceFlowRuntime.exporter;
  traceFlowRuntime.sdk = null;
  traceFlowRuntime.exporter = null;
  removeSignalHandlers();

  try {
    await currentExporter?.forceFlush();
    await currentSdk?.shutdown();
  } finally {
    traceFlowRuntime.shuttingDown = false;
  }
}

function resolveOptions(options: TraceFlowOptions): ResolvedTraceFlowOptions {
  const serviceName = options.serviceName.trim();
  if (!serviceName) {
    throw new Error('TraceFlow requiere un serviceName');
  }

  return {
    serviceName,
    studioUrl: options.studioUrl ?? TRACEFLOW_DEFAULT_STUDIO_URL,
    enabled: options.enabled ?? true,
    debug: options.debug ?? false,
    instrumentHttp: options.instrumentHttp ?? true,
    requestTimeoutMs: options.requestTimeoutMs ?? TRACEFLOW_DEFAULT_REQUEST_TIMEOUT_MS,
    headers: { ...options.headers },
    flows: structuredClone([...(options.flows ?? [])]),
  };
}

function registerSignalHandlers(): void {
  if (traceFlowRuntime.signalHandlersRegistered) {
    return;
  }

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
  traceFlowRuntime.signalHandlersRegistered = true;
}

function removeSignalHandlers(): void {
  if (!traceFlowRuntime.signalHandlersRegistered) {
    return;
  }

  process.off('SIGINT', handleSignal);
  process.off('SIGTERM', handleSignal);
  traceFlowRuntime.signalHandlersRegistered = false;
}

function handleSignal(signal: NodeJS.Signals): void {
  void shutdownTraceFlow().finally(() => {
    removeSignalHandlers();
    process.kill(process.pid, signal);
  });
}
