import type { TraceFlowSpanDto } from 'traceflow/protocol';

export function isDatabaseQuery(span: TraceFlowSpanDto): boolean {
  return span.attributes['traceflow.db.query'] === true;
}

export function getDatabaseTables(span: TraceFlowSpanDto): string[] {
  const tables = span.attributes['db.tables'];
  if (Array.isArray(tables)) return [...new Set(tables.filter((table): table is string => typeof table === 'string' && table.trim().length > 0))];
  if (isDatabaseQuery(span)) return [];
  if (span.type !== 'table') return [];
  const explicit = span.attributes['db.collection.name'] ?? span.attributes['db.sql.table'];
  return [typeof explicit === 'string' ? explicit : span.name].filter(Boolean);
}

export function getDatabaseOperation(span: TraceFlowSpanDto): string | null {
  const operation = span.attributes['db.operation.name'];
  return typeof operation === 'string' && operation.length > 0 ? operation : null;
}
