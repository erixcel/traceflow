import type { TraceFlowStoreEvent } from 'traceflow/protocol';

export type TraceStoreListener = (event: TraceFlowStoreEvent) => void;

export interface TraceStoreOptions {
  maxTraces?: number;
  maxSpansPerTrace?: number;
  now?: () => Date;
}
