import type { Edge, Node } from '@xyflow/react';
import type { TraceFlowNodeDefinitionDto, TraceFlowSpanDto } from 'traceflow/protocol';
import type { TraceNodeExecutionState } from '../types/trace.type';

export interface TraceNodeData extends Record<string, unknown> {
  definition: TraceFlowNodeDefinitionDto;
  span: TraceFlowSpanDto | null;
  state: TraceNodeExecutionState;
}

export type TraceGraphNode = Node<TraceNodeData, 'traceSpan'>;

export interface TraceGraph {
  nodes: TraceGraphNode[];
  edges: Edge[];
}

export interface TraceNodeDimensions {
  width: number;
  height: number;
}

export interface MaterializedNode {
  id: string;
  definition: TraceFlowNodeDefinitionDto;
  span: TraceFlowSpanDto | null;
  state: TraceNodeExecutionState;
}

export interface MaterializedEdge {
  source: string;
  target: string;
  parallel: boolean;
}
