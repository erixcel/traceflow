import type { TraceFlowStatus } from 'traceflow/protocol';

export interface HeaderSummary {
  serviceName: string;
  durationMs: number;
  spanCount: number;
  status: TraceFlowStatus;
}

export interface HeaderContent {
  eyebrow: string;
  title: string;
  summary: HeaderSummary | null;
}

export interface HeaderStore extends HeaderContent {
  setHeader: (content: HeaderContent) => void;
}
