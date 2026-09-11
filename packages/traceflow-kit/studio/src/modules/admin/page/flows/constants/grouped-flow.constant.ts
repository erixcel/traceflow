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
  http: 'HTTP',
  custom: 'Operación',
};

export const GROUPED_FLOW_TYPE_BORDER_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: 'border-violet-200 dark:border-violet-900',
  service: 'border-blue-200 dark:border-blue-900',
  method: 'border-slate-300 dark:border-slate-700',
  table: 'border-amber-200 dark:border-amber-900',
  validation: 'border-emerald-200 dark:border-emerald-900',
  transformation: 'border-fuchsia-200 dark:border-fuchsia-900',
  'external-api': 'border-orange-200 dark:border-orange-900',
  http: 'border-indigo-200 dark:border-indigo-900',
  custom: 'border-zinc-200 dark:border-zinc-700',
};

export const GROUPED_FLOW_TYPE_HEADER_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: 'border-violet-100 bg-violet-50/80 text-violet-700 dark:border-violet-900/50 dark:bg-violet-500/10 dark:text-violet-300',
  service: 'border-blue-100 bg-blue-50/80 text-blue-700 dark:border-blue-900/50 dark:bg-blue-500/10 dark:text-blue-300',
  method: 'border-slate-200 bg-slate-100/90 text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
  table: 'border-amber-100 bg-amber-50/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300',
  validation: 'border-emerald-100 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-300',
  transformation: 'border-fuchsia-100 bg-fuchsia-50/80 text-fuchsia-700 dark:border-fuchsia-900/50 dark:bg-fuchsia-500/10 dark:text-fuchsia-300',
  'external-api': 'border-orange-100 bg-orange-50/80 text-orange-700 dark:border-orange-900/50 dark:bg-orange-500/10 dark:text-orange-300',
  http: 'border-indigo-100 bg-indigo-50/80 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-500/10 dark:text-indigo-300',
  custom: 'border-zinc-100 bg-zinc-50/80 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300',
};

export const GROUPED_FLOW_TYPE_HANDLE_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: '!bg-violet-400',
  service: '!bg-blue-400',
  method: '!bg-slate-500',
  table: '!bg-amber-400',
  validation: '!bg-emerald-400',
  transformation: '!bg-fuchsia-400',
  'external-api': '!bg-orange-400',
  http: '!bg-indigo-400',
  custom: '!bg-zinc-400',
};

export const GROUPED_FLOW_TYPE_STEP_CLASSES: Record<TraceFlowNodeType, string> = {
  controller: 'border-l-violet-400',
  service: 'border-l-blue-400',
  method: 'border-l-slate-400',
  table: 'border-l-amber-400',
  validation: 'border-l-emerald-400',
  transformation: 'border-l-fuchsia-400',
  'external-api': 'border-l-orange-400',
  http: 'border-l-indigo-400',
  custom: 'border-l-zinc-300 dark:border-l-zinc-600',
};

export const GROUPED_FLOW_CONTROL_CLASS =
  'nodrag nopan inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-white px-3 py-0 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-pink-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800';
export const GROUPED_FLOW_LINK_CLASS =
  'nodrag nopan cursor-pointer text-[11px] font-semibold text-pink-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500 dark:text-pink-300';

export interface DetailsPanelTheme {
  borderClass: string;
  headerClass: string;
  typeBadgeClass: string;
  activeTabClass: string;
}

export const DETAILS_PANEL_TYPE_THEMES: Record<TraceFlowNodeType, DetailsPanelTheme> = {
  controller: {
    borderClass: 'border-l-violet-200 dark:border-l-violet-800',
    headerClass: 'border-violet-100 bg-violet-50/70 text-violet-950 dark:border-violet-900/40 dark:bg-violet-500/10 dark:text-violet-100',
    typeBadgeClass: 'border-violet-200 bg-violet-100/70 text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
    activeTabClass: 'border-violet-500 text-violet-600 dark:border-violet-400 dark:text-violet-300',
  },
  service: {
    borderClass: 'border-l-blue-200 dark:border-l-blue-800',
    headerClass: 'border-blue-100 bg-blue-50/70 text-blue-950 dark:border-blue-900/40 dark:bg-blue-500/10 dark:text-blue-100',
    typeBadgeClass: 'border-blue-200 bg-blue-100/70 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    activeTabClass: 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300',
  },
  method: {
    borderClass: 'border-l-slate-300 dark:border-l-slate-700',
    headerClass: 'border-slate-200 bg-slate-100/80 text-slate-950 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100',
    typeBadgeClass: 'border-slate-300 bg-slate-200/80 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    activeTabClass: 'border-slate-600 text-slate-800 dark:border-slate-400 dark:text-slate-200',
  },
  table: {
    borderClass: 'border-l-amber-200 dark:border-l-amber-800',
    headerClass: 'border-amber-100 bg-amber-50/70 text-amber-950 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-100',
    typeBadgeClass: 'border-amber-200 bg-amber-100/70 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    activeTabClass: 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-300',
  },
  validation: {
    borderClass: 'border-l-emerald-200 dark:border-l-emerald-800',
    headerClass: 'border-emerald-100 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-100',
    typeBadgeClass: 'border-emerald-200 bg-emerald-100/70 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    activeTabClass: 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-300',
  },
  transformation: {
    borderClass: 'border-l-fuchsia-200 dark:border-l-fuchsia-800',
    headerClass: 'border-fuchsia-100 bg-fuchsia-50/70 text-fuchsia-950 dark:border-fuchsia-900/40 dark:bg-fuchsia-500/10 dark:text-fuchsia-100',
    typeBadgeClass: 'border-fuchsia-200 bg-fuchsia-100/70 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-300',
    activeTabClass: 'border-fuchsia-500 text-fuchsia-600 dark:border-fuchsia-400 dark:text-fuchsia-300',
  },
  'external-api': {
    borderClass: 'border-l-orange-200 dark:border-l-orange-800',
    headerClass: 'border-orange-100 bg-orange-50/70 text-orange-950 dark:border-orange-900/40 dark:bg-orange-500/10 dark:text-orange-100',
    typeBadgeClass: 'border-orange-200 bg-orange-100/70 text-orange-700 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
    activeTabClass: 'border-orange-500 text-orange-600 dark:border-orange-400 dark:text-orange-300',
  },
  http: {
    borderClass: 'border-l-indigo-200 dark:border-l-indigo-800',
    headerClass: 'border-indigo-100 bg-indigo-50/70 text-indigo-950 dark:border-indigo-900/40 dark:bg-indigo-500/10 dark:text-indigo-100',
    typeBadgeClass: 'border-indigo-200 bg-indigo-100/70 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    activeTabClass: 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300',
  },
  custom: {
    borderClass: 'border-l-zinc-200 dark:border-l-zinc-700',
    headerClass: 'border-zinc-200 bg-zinc-50/70 text-zinc-950 dark:border-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-100',
    typeBadgeClass: 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    activeTabClass: 'border-zinc-600 text-zinc-700 dark:border-zinc-400 dark:text-zinc-300',
  },
};

export const DETAILS_PANEL_OUTPUT_THEME: DetailsPanelTheme = {
  borderClass: 'border-l-emerald-200 dark:border-l-emerald-800',
  headerClass: 'border-emerald-100 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-100',
  typeBadgeClass: 'border-emerald-200 bg-emerald-100/70 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  activeTabClass: 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-300',
};

export const DETAILS_PANEL_ERROR_THEME: DetailsPanelTheme = {
  borderClass: 'border-l-rose-300 dark:border-l-rose-800',
  headerClass: 'border-rose-100 bg-rose-50/70 text-rose-950 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-100',
  typeBadgeClass: 'border-rose-200 bg-rose-100/70 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  activeTabClass: 'border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-300',
};

import type { TraceFlowNodeType } from 'traceflow/protocol';
