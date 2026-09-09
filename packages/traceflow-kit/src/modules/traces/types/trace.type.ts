import type { TraceFlowStatus } from 'traceflow/protocol';

export interface TraceListQuery {
  limit?: number | string;
  serviceName?: string;
  status?: TraceFlowStatus;
}
