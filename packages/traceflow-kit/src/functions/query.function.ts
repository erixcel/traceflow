import type { TraceListQuery } from '../modules/traces/types/trace.type';

export function parseTraceLimit(query: TraceListQuery): number {
  const requestedLimit = Number.parseInt(String(query.limit ?? 50), 10);
  return Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;
}
