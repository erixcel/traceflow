import type { FastifyReply } from 'fastify';
import type { TraceFlowStoreEvent } from 'traceflow/protocol';

export function writeSseEvent(reply: FastifyReply, eventName: string, payload: TraceFlowStoreEvent | { occurredAt: string }): void {
  reply.raw.write(`event: ${eventName}\n`);
  reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
}
