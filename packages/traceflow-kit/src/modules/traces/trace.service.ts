import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TRACEFLOW_PROTOCOL_VERSION } from 'traceflow/protocol';
import type { TraceFlowHealthDto, TraceFlowIngestResultDto } from 'traceflow/protocol';
import { createApiError } from '../../functions/api-error.function';
import { normalizeTraceFlows, normalizeTraceSpans } from '../../functions/protocol.function';
import { parseTraceLimit } from '../../functions/query.function';
import { writeSseEvent } from '../../functions/sse.function';
import { TraceStore } from './trace.store';
import type { TraceStoreListener } from './types/store.type';
import type { TraceListQuery } from './types/trace.type';
import { spanBatchSchema } from './validation/span-batch.schema';

@Injectable()
export class TraceService {
  constructor(private readonly store: TraceStore) {}

  health(): TraceFlowHealthDto {
    return {
      status: 'ok',
      service: 'traceflow-studio',
      protocolVersion: TRACEFLOW_PROTOCOL_VERSION,
    };
  }

  ingest(body: unknown): TraceFlowIngestResultDto {
    const parsed = spanBatchSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpException(createApiError(400, 'INVALID_BATCH', 'Payload inválido', [...new Set(parsed.error.issues.map((issue) => issue.message))]), HttpStatus.BAD_REQUEST);
    }

    const spans = normalizeTraceSpans(parsed.data.spans);
    const flows = normalizeTraceFlows(parsed.data.flows ?? []);

    this.store.addSpans(spans, flows);

    return {
      accepted: spans.length,
      traceIds: [...new Set(spans.map((span) => span.traceId))],
    };
  }

  list(query: TraceListQuery) {
    const limit = parseTraceLimit(query);

    return this.store
      .listTraces()
      .filter((trace) => !query.serviceName || trace.serviceName === query.serviceName)
      .filter((trace) => !query.status || trace.status === query.status)
      .slice(0, limit);
  }

  latest() {
    return this.store.getLatestTrace();
  }

  get(traceId: string) {
    const trace = this.store.getTrace(traceId);

    if (!trace) {
      throw new HttpException(createApiError(404, 'TRACE_NOT_FOUND', 'La traza solicitada no existe'), HttpStatus.NOT_FOUND);
    }

    return trace;
  }

  clear(): void {
    this.store.clear();
  }

  remove(traceId: string): void {
    if (!this.store.removeTrace(traceId)) {
      throw new HttpException(createApiError(404, 'TRACE_NOT_FOUND', 'La traza solicitada no existe'), HttpStatus.NOT_FOUND);
    }
  }

  openEventStream(request: FastifyRequest, reply: FastifyReply): void {
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    writeSseEvent(reply, 'connected', {
      occurredAt: new Date().toISOString(),
    });

    const listener: TraceStoreListener = (event) => {
      writeSseEvent(reply, event.type, event);
    };
    this.store.subscribe(listener);

    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 15_000);
    heartbeat.unref();

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      this.store.unsubscribe(listener);
    });
  }
}
