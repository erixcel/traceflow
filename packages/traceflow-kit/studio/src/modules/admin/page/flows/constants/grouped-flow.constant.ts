export const GROUPED_FLOW_GEOMETRY = {
  entryWidth: 300,
  processWidth: 328,
  outputWidth: 280,
  columnGap: 96,
  rowGap: 24,
  top: 82,
  minimumHeight: 580,
  entryHeight: 308,
  processHeight: 174,
  outputHeight: 236,
} as const;

export const GROUPED_FLOW_TYPE_LABELS: Record<TraceFlowNodeType, string> = {
  controller: 'Controller',
  service: 'Servicio',
  method: 'Método',
  table: 'Tabla',
  validation: 'Validación',
  transformation: 'Transformación',
  'external-api': 'API externa',
  custom: 'Operación',
};

export const GROUPED_FLOW_TYPE_BORDER_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: 'border-violet-200 dark:border-violet-900',
  service: 'border-sky-200 dark:border-sky-900',
  method: 'border-indigo-200 dark:border-indigo-900',
  table: 'border-amber-200 dark:border-amber-900',
  validation: 'border-emerald-200 dark:border-emerald-900',
  transformation: 'border-fuchsia-200 dark:border-fuchsia-900',
  'external-api': 'border-cyan-200 dark:border-cyan-900',
  custom: 'border-zinc-200 dark:border-zinc-700',
};

export const GROUPED_FLOW_TYPE_HEADER_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: 'border-violet-100 bg-violet-50/80 text-violet-700 dark:border-violet-900/50 dark:bg-violet-500/10 dark:text-violet-300',
  service: 'border-sky-100 bg-sky-50/80 text-sky-700 dark:border-sky-900/50 dark:bg-sky-500/10 dark:text-sky-300',
  method: 'border-indigo-100 bg-indigo-50/80 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-500/10 dark:text-indigo-300',
  table: 'border-amber-100 bg-amber-50/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300',
  validation: 'border-emerald-100 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-300',
  transformation: 'border-fuchsia-100 bg-fuchsia-50/80 text-fuchsia-700 dark:border-fuchsia-900/50 dark:bg-fuchsia-500/10 dark:text-fuchsia-300',
  'external-api': 'border-cyan-100 bg-cyan-50/80 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-500/10 dark:text-cyan-300',
  custom: 'border-zinc-100 bg-zinc-50/80 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300',
};

export const GROUPED_FLOW_TYPE_HANDLE_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: '!bg-violet-400',
  service: '!bg-sky-400',
  method: '!bg-indigo-400',
  table: '!bg-amber-400',
  validation: '!bg-emerald-400',
  transformation: '!bg-fuchsia-400',
  'external-api': '!bg-cyan-400',
  custom: '!bg-zinc-400',
};

export const GROUPED_FLOW_TYPE_STEP_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: 'border-l-violet-400',
  service: 'border-l-sky-400',
  method: 'border-l-indigo-400',
  table: 'border-l-amber-400',
  validation: 'border-l-emerald-400',
  transformation: 'border-l-fuchsia-400',
  'external-api': 'border-l-cyan-400',
  custom: 'border-l-zinc-300 dark:border-l-zinc-600',
};

export const GROUPED_FLOW_CONTROL_CLASS =
  'nodrag nopan inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white px-3 py-0 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-pink-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800';
export const GROUPED_FLOW_LINK_CLASS =
  'nodrag nopan cursor-pointer text-[11px] font-semibold text-pink-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500 dark:text-pink-300';
import type { TraceFlowNodeType } from 'traceflow/protocol';
