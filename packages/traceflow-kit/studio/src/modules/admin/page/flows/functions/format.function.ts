import type { TraceFlowSpanDto } from 'traceflow/protocol';

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value));
}

export function shortId(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatMethodLabel(span: Pick<TraceFlowSpanDto, 'className' | 'methodName' | 'name'>): string {
  return [span.className, span.methodName].filter(Boolean).join('.') || span.name;
}
