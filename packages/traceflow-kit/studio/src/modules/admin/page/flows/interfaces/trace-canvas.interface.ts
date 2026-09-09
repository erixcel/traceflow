import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';

export interface TraceCanvasProps {
  trace: TraceFlowTraceDto;
  onSelectSpan: (span: TraceFlowSpanDto | null, tab?: 'input' | 'output') => void;
}
