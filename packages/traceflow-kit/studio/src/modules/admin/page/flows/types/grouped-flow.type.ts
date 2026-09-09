import type { Node } from '@xyflow/react';
import type { GroupedCardData, GroupedLaneData } from '../interfaces/grouped-flow.interface';

export type GroupedCardKind = 'entry' | 'process' | 'output';
export type GroupedCardNode = Node<GroupedCardData, 'groupedCard'>;
export type GroupedLaneNode = Node<GroupedLaneData, 'groupedLane'>;
export type GroupedFlowNode = GroupedCardNode | GroupedLaneNode;
