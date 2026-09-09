import type { TraceFlowSpanDto } from 'traceflow/protocol';

export interface DatabaseQuerySummaryProps {
  span: TraceFlowSpanDto;
  compact?: boolean;
  appearance?: 'inline' | 'chips';
}
