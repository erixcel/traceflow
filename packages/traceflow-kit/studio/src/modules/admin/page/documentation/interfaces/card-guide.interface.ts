import type { TraceFlowNodeType } from 'traceflow/protocol';

export interface CardGuide {
  type: TraceFlowNodeType;
  purpose: string;
  placement: string;
  content: string;
  interaction: string;
}
