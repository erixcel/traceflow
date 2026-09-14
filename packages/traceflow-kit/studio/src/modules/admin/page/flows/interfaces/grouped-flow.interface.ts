import type { Edge, Rect } from '@xyflow/react';
import type { TraceFlowNodeDefinitionDto, TraceFlowSpanDto, TraceFlowStatus } from 'traceflow/protocol';
import type { JourneyNode } from './journey.interface';
import type { TraceCanvasProps } from './trace-canvas.interface';
import type { GroupedCardKind, GroupedFlowNode } from '../types/grouped-flow.type';

export interface GroupedFlowModel {
  request: JourneyNode | null;
  entry: JourneyNode | null;
  preconditions: JourneyNode[];
  branches: JourneyNode[];
  groups: JourneyNode[][];
  unobserved: TraceFlowNodeDefinitionDto[];
  linked: boolean;
}

export interface GroupedCardData extends Record<string, unknown> {
  cardId: string;
  detail: boolean;
  openedSpanId: string | undefined;
  kind: GroupedCardKind;
  request: JourneyNode | null;
  validation: JourneyNode | null;
  node: JourneyNode | null;
  preconditions: JourneyNode[];
  expanded: boolean;
  visibleDepth: number;
  query: string;
  highlighted: boolean;
  matchedIds: Set<string>;
  totalDuration: number;
  traceStatus: TraceFlowStatus;
  isComplete: boolean;
  stepLabel: string;
  unobserved: TraceFlowNodeDefinitionDto[];
  showLeftHandle: boolean;
  showRightHandle: boolean;
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

export interface FitViewOptions {
  cardIds?: string[];
  duration?: number;
  forceFull?: boolean;
}

export interface GroupedFlowActions {
  selectSpan: TraceCanvasProps['onSelectSpan'];
  selectCard: (cardId: string, span: TraceFlowSpanDto, tab?: 'input' | 'output' | 'context') => void;
  toggleGroup: (cardId: string, span: TraceFlowSpanDto) => void;
  openStep: (ownerId: string, span: TraceFlowSpanDto, tab?: 'input' | 'output' | 'context') => void;
  closeDetail: (cardId: string) => void;
  fit: (options?: number | FitViewOptions) => void;
}

export interface GroupedDetailSelection {
  ownerId: string;
  spanId: string;
}

export interface GroupedStepsProps {
  ownerId: string;
  openedSpanId: string | undefined;
  prefix?: string;
  nodes: JourneyNode[];
  query: string;
  matchedIds: Set<string>;
  compact?: boolean;
  visibleDepth?: number;
  openAsCard?: boolean;
}

export interface GroupedFlowDepthProps {
  value: number;
  max: number;
  onChange: (depth: number) => void;
}
