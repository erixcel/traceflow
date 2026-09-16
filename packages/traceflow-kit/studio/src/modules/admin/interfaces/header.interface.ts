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

export interface HeaderMobileAction {
  label: string;
  count?: number;
  onClick: () => void;
}

export interface HeaderStore extends HeaderContent {
  mobileAction: HeaderMobileAction | null;
  setHeader: (content: HeaderContent) => void;
  setMobileAction: (action: HeaderMobileAction | null) => void;
}
