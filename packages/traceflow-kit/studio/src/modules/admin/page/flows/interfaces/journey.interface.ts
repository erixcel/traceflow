import type { TraceFlowSpanDto } from 'traceflow/protocol';

export interface JourneyNode {
  span: TraceFlowSpanDto;
  children: JourneyNode[];
}

export interface JourneyResource {
  name: string;
  calls: number;
  errors: number;
}
