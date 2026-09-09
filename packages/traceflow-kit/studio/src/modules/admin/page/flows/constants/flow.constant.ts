import type { TraceFlowNodeType } from 'traceflow/protocol';
import type { TraceNodeExecutionState } from '../types/trace.type';

export const TRACEFLOW_EVENT_NAMES = ['trace.created', 'trace.updated', 'trace.deleted', 'traces.cleared'] as const;
export const TRACEFLOW_REFRESH_DELAY_MS = 160;
export const TRACEFLOW_POLLING_INTERVAL_MS = 5_000;
export const TRACEFLOW_FIT_PADDING = 0.08;
export const TRACEFLOW_NODE_COLORS: Record<TraceNodeExecutionState, string> = { success: '#10b981', error: '#f43f5e', skipped: '#71717a' };
export const TRACE_STATUS_RAIL_CLASSES: Record<TraceNodeExecutionState, string> = {
  success: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.45)]',
  error: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.45)]',
  skipped: 'bg-zinc-400 dark:bg-zinc-600',
};
export const TRACE_NODE_BORDER_CLASSES: Record<TraceNodeExecutionState, string> = {
  success: 'border-emerald-500',
  error: 'border-rose-500',
  skipped: 'border-zinc-500',
};
export const TRACE_NODE_HEADER_CLASSES: Record<TraceNodeExecutionState, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-500 text-white',
  skipped: 'bg-zinc-500 text-white',
};
export const TRACE_NODE_TEXT_CLASSES: Record<TraceNodeExecutionState, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  skipped: 'text-zinc-500 dark:text-zinc-400',
};
export const TRACE_NODE_TYPE_BORDER_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: 'border-violet-400 dark:border-violet-700',
  service: 'border-sky-400 dark:border-sky-700',
  method: 'border-indigo-400 dark:border-indigo-700',
  table: 'border-amber-400 dark:border-amber-700',
  validation: 'border-emerald-400 dark:border-emerald-700',
  transformation: 'border-fuchsia-400 dark:border-fuchsia-700',
  'external-api': 'border-cyan-400 dark:border-cyan-700',
  custom: 'border-zinc-400 dark:border-zinc-600',
};
export const TRACE_NODE_TYPE_HEADER_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: 'bg-violet-600 text-white',
  service: 'bg-sky-600 text-white',
  method: 'bg-indigo-600 text-white',
  table: 'bg-amber-500 text-amber-950',
  validation: 'bg-emerald-600 text-white',
  transformation: 'bg-fuchsia-600 text-white',
  'external-api': 'bg-cyan-600 text-white',
  custom: 'bg-zinc-600 text-white',
};
