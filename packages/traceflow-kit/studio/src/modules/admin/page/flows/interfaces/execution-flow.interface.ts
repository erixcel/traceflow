import type { TraceFlowSpanDto } from 'traceflow/protocol';

export interface SpanInterval {
  span: TraceFlowSpanDto;
  startedAtMs: number;
  endedAtMs: number;
}

export interface ExecutionFlowEdge {
  source: string;
  target: string;
  parallel: boolean;
}

export interface ExecutionFlow {
  edges: ExecutionFlowEdge[];
  stepLabels: Map<string, string>;
}
