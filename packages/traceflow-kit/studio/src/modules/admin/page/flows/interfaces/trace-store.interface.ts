import type { TraceFlowSpanDto, TraceFlowTraceDto, TraceFlowTraceSummaryDto } from 'traceflow/protocol';
import type { ConnectionStatus } from '../types/trace.type';

export interface TraceStore {
  traces: TraceFlowTraceSummaryDto[];
  traceCache: Record<string, TraceFlowTraceDto>;
  activeTraceId: string | null;
  activeTrace: TraceFlowTraceDto | null;
  selectedSpan: TraceFlowSpanDto | null;
  connectionStatus: ConnectionStatus;
  loading: boolean;
  error: string | null;
  query: string;
  statusFilter: TraceFlowTraceSummaryDto['status'] | 'all';
  activeTab: 'input' | 'output' | 'context';
  setActiveTab: (tab: 'input' | 'output' | 'context') => void;
  loadTrace: (traceId: string) => Promise<TraceFlowTraceDto | null>;
  refreshTraces: () => Promise<void>;
  selectTrace: (traceId: string) => Promise<void>;
  showTraceDetails: (traceId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setSelectedSpan: (span: TraceFlowSpanDto | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setQuery: (query: string) => void;
  setStatusFilter: (status: TraceFlowTraceSummaryDto['status'] | 'all') => void;
  setError: (error: string | null) => void;
}
