import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import type { NodeChange } from '@xyflow/react';
import type { TraceFlowTraceDto } from 'traceflow/protocol';
import { buildGroupedFlowGraph, buildGroupedFlowModel } from '../functions/grouped-flow.function';
import type { TraceNodeDimensions } from '../interfaces/trace-graph.interface';
import type { GroupedFlowNode } from '../types/grouped-flow.type';

export function useGroupedFlow(trace: TraceFlowTraceDto) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [dimensions, setDimensions] = useState<Map<string, TraceNodeDimensions>>(() => new Map());
  const graph = useMemo(() => buildGroupedFlowGraph(trace, expanded, query.trim(), dimensions), [trace, expanded, query, dimensions]);
  const model = useMemo(() => buildGroupedFlowModel(trace), [trace]);
  const initialized = useNodesInitialized();
  const fitted = useRef(false);
  const { fitBounds } = useReactFlow();
  const { x, y, width, height } = graph.bounds;
  // Use this render's lane bounds: React Flow may still hold the previous measurements.
  const fit = useCallback(() => void fitBounds({ x, y, width, height }, { padding: 0.08, duration: 300 }), [fitBounds, x, y, width, height]);
  const expandable = model.branches.filter((node) => node.children.length);
  const allExpanded = expandable.length > 0 && expandable.every((node) => expanded.has(node.span.spanId));
  const toggleGroup = useCallback(
    (id: string) =>
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );
  const onNodesChange = useCallback((changes: NodeChange<GroupedFlowNode>[]) => {
    setDimensions((current) => {
      const next = new Map(current);
      let changed = false;
      for (const change of changes) {
        if (change.type !== 'dimensions' || !change.dimensions || change.id.startsWith('lane-')) continue;
        const previous = current.get(change.id);
        if (previous?.width === change.dimensions.width && previous.height === change.dimensions.height) continue;
        next.set(change.id, change.dimensions);
        changed = true;
      }
      return changed ? next : current;
    });
  }, []);

  useEffect(() => {
    if (!initialized || fitted.current || !graph.nodes.filter((node) => node.type === 'groupedCard').every((node) => dimensions.has(node.id))) return;
    const frame = window.requestAnimationFrame(() => {
      fitted.current = true;
      fit();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialized, dimensions, graph.nodes, fit]);

  return {
    ...graph,
    query,
    setQuery,
    toggleGroup,
    onNodesChange,
    fit,
    allExpanded,
    canExpand: expandable.length > 0,
    toggleAll: () => setExpanded(allExpanded ? new Set() : new Set(expandable.map((node) => node.span.spanId))),
    matchingGroups: graph.nodes.filter((node) => node.type === 'groupedCard' && node.data.kind === 'process' && node.data.highlighted && node.data.node).length,
  };
}
