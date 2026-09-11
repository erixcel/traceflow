import { BaseEdge } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

/** Keep the execution connection below inspection cards, independent of their height. */
export function GroupedFlowReturnEdgeComponent({ id, sourceX, sourceY, targetX, targetY, data, style, markerEnd }: EdgeProps): React.JSX.Element {
  const railY = typeof data?.railY === 'number' ? data.railY : Math.max(sourceY, targetY) + 40;
  const path = `M ${sourceX},${sourceY} L ${sourceX},${railY - 12} Q ${sourceX},${railY} ${sourceX + 12},${railY} L ${targetX - 12},${railY} Q ${targetX},${railY} ${targetX},${railY - 12} L ${targetX},${targetY}`;
  return <BaseEdge id={id} path={path} style={style ?? {}} {...(markerEnd ? { markerEnd } : {})} />;
}
