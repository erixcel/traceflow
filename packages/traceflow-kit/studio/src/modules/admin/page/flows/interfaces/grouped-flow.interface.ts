import type { Edge, Rect } from '@xyflow/react';
import type { TraceFlowNodeDefinitionDto, TraceFlowStatus } from 'traceflow/protocol';
import type { JourneyNode } from './journey.interface';
import type { TraceCanvasProps } from './trace-canvas.interface';
import type { GroupedCardKind, GroupedFlowNode } from '../types/grouped-flow.type';

export interface GroupedFlowModel {
  request: JourneyNode | null;
  entry: JourneyNode | null;
  preconditions: JourneyNode[];
  coordinators: JourneyNode[];
  branches: JourneyNode[];
  groups: JourneyNode[][];
  unobserved: TraceFlowNodeDefinitionDto[];
  linked: boolean;
}

export interface GroupedCardData extends Record<string, unknown> {
  kind: GroupedCardKind;
  request: JourneyNode | null;
  node: JourneyNode | null;
  preconditions: JourneyNode[];
  continuesInFlow: boolean;
  expanded: boolean;
  query: string;
  highlighted: boolean;
  matchedIds: Set<string>;
  totalDuration: number;
  traceStatus: TraceFlowStatus;
  isComplete: boolean;
  stepLabel: string;
  unobserved: TraceFlowNodeDefinitionDto[];
}

export interface GroupedLaneData extends Record<string, unknown> {
  number: string;
  title: string;
  description: string;
  divided: boolean;
}

export interface GroupedFlowGraph {
  nodes: GroupedFlowNode[];
  edges: Edge[];
  bounds: Rect;
}

export interface GroupedCardProps {
  data: GroupedCardData;
}

export interface GroupedStatusProps {
  status: TraceFlowStatus;
}

export interface GroupedFlowActions {
  selectSpan: TraceCanvasProps['onSelectSpan'];
  toggleGroup: (spanId: string) => void;
}

export interface GroupedStepsProps {
  nodes: JourneyNode[];
  query: string;
  matchedIds: Set<string>;
  compact?: boolean;
}
