import type { TraceFlowTraceSummaryDto } from 'traceflow/protocol';

export interface TraceHistoryCardProps {
  trace: TraceFlowTraceSummaryDto;
  active: boolean;
  onSelect: (traceId: string) => Promise<void>;
  onShowDetails: (traceId: string) => Promise<void>;
}
