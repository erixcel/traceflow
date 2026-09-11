import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { NodeChange } from '@xyflow/react';
import type { TraceFlowTraceDto } from 'traceflow/protocol';
import { buildGroupedFlowGraph, toggleGroupedDetail } from '../functions/grouped-flow.function';
import { GROUPED_FLOW_GEOMETRY } from '../constants/grouped-flow.constant';
import type { FitViewOptions, GroupedDetailSelection } from '../interfaces/grouped-flow.interface';
import type { TraceNodeDimensions } from '../interfaces/trace-graph.interface';
import type { GroupedFlowNode } from '../types/grouped-flow.type';
import { useTraceStore } from '../stores/trace.store';

export function useGroupedFlow(trace: TraceFlowTraceDto) {
  const selectedSpan = useTraceStore((state) => state.selectedSpan);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [detailPath, setDetailPath] = useState<GroupedDetailSelection[]>([]);
  const [query, setQuery] = useState('');
  const [dimensions, setDimensions] = useState<Map<string, TraceNodeDimensions>>(() => new Map());
  const graph = useMemo(() => buildGroupedFlowGraph(trace, collapsed, query.trim(), dimensions, detailPath), [trace, collapsed, query, dimensions, detailPath]);
  const fitted = useRef(false);
  const previousTraceId = useRef<string | null>(null);
  const focusedCardIdsRef = useRef<string[] | null>(null);
  const { fitBounds } = useReactFlow();
  const { x, y, width, height } = graph.bounds;

  const fit = useCallback(
    (options?: number | FitViewOptions) => {
      const duration = typeof options === 'number' ? options : (options?.duration ?? 300);
      const forceFull = typeof options === 'object' ? Boolean(options.forceFull) : false;
      const isPanelOpen = Boolean(useTraceStore.getState().selectedSpan);

      if (forceFull) {
        focusedCardIdsRef.current = null;
      } else if (typeof options === 'object' && options.cardIds?.length) {
        focusedCardIdsRef.current = options.cardIds;
      } else if (detailPath.length > 0) {
        const last = detailPath[detailPath.length - 1];
        if (last) {
          focusedCardIdsRef.current = [last.ownerId, `detail-${last.spanId}`];
        }
      }

      const targetCardIds = focusedCardIdsRef.current;

      if (!forceFull && targetCardIds && targetCardIds.length > 0) {
        const cards = graph.nodes.filter((node) => node.type === 'groupedCard' && targetCardIds.includes(node.id));
        if (cards.length > 0) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          for (const card of cards) {
            const cx = card.position.x;
            const cy = card.position.y;
            const cw =
              dimensions.get(card.id)?.width ??
              (typeof card.style?.width === 'number' ? card.style.width : null) ??
              (card.id === 'grouped-entry' ? GROUPED_FLOW_GEOMETRY.entryWidth : card.id === 'grouped-output' ? GROUPED_FLOW_GEOMETRY.outputWidth : GROUPED_FLOW_GEOMETRY.processWidth);
            const fallbackH = card.id === 'grouped-entry' ? GROUPED_FLOW_GEOMETRY.entryHeight : card.id === 'grouped-output' ? GROUPED_FLOW_GEOMETRY.outputHeight : GROUPED_FLOW_GEOMETRY.processHeight;
            const ch = dimensions.get(card.id)?.height ?? fallbackH;

            minX = Math.min(minX, cx);
            minY = Math.min(minY, cy);
            maxX = Math.max(maxX, cx + cw);
            maxY = Math.max(maxY, cy + ch);
          }

          // If detail card is targeted but not yet in graph.nodes, expand bounds to include its expected position
          const missingDetailId = targetCardIds.find((id) => id.startsWith('detail-') && !cards.some((c) => c.id === id));
          const ownerCard = cards[0];
          if (missingDetailId && ownerCard) {
            const detailX = ownerCard.position.x + GROUPED_FLOW_GEOMETRY.processWidth + GROUPED_FLOW_GEOMETRY.columnGap;
            minX = Math.min(minX, detailX);
            maxX = Math.max(maxX, detailX + GROUPED_FLOW_GEOMETRY.processWidth);
          }

          const targetMinX = minX - 24;
          const targetMaxX = maxX + 24;
          const rawWidth = targetMaxX - targetMinX;
          const boxWidth = Math.max(rawWidth, 760);
          const centerX = (targetMinX + targetMaxX) / 2;
          const finalMinX = centerX - boxWidth / 2;

          const targetMinY = Math.max(0, minY - 36);
          const targetMaxY = maxY + 36;
          const rawHeight = targetMaxY - targetMinY;
          const boxHeight = Math.max(rawHeight, 440);
          const centerY = (targetMinY + targetMaxY) / 2;
          const finalMinY = centerY - boxHeight / 2;

          const padding = isPanelOpen ? { top: '32px', bottom: '40px', left: '48px', right: '460px' } : { top: '32px', bottom: '40px', left: '48px', right: '48px' };

          fitBounds(
            {
              x: finalMinX,
              y: finalMinY,
              width: boxWidth,
              height: boxHeight,
            },
            { padding, duration } as unknown as Parameters<typeof fitBounds>[1],
          );
          return;
        }
      }

      const fullPadding = isPanelOpen ? { top: '32px', bottom: '40px', left: '48px', right: '460px' } : { top: '32px', bottom: '40px', left: '48px', right: '48px' };
      fitBounds({ x, y, width, height }, { padding: fullPadding, duration } as unknown as Parameters<typeof fitBounds>[1]);
    },
    [fitBounds, x, y, width, height, detailPath, graph.nodes, dimensions],
  );

  const fitRef = useRef(fit);
  fitRef.current = fit;

  const expandable = graph.nodes.filter((node) => node.type === 'groupedCard' && node.data.kind === 'process' && node.data.node?.children.some((child) => child.children.length));
  const allExpanded = expandable.length > 0 && expandable.every((node) => !collapsed.has(node.id));

  // Reset state and trigger auto-fit when changing traces/flows
  useEffect(() => {
    if (previousTraceId.current !== trace.traceId) {
      previousTraceId.current = trace.traceId;
      fitted.current = false;
      focusedCardIdsRef.current = null;
      setDetailPath([]);
      setCollapsed(new Set());
      setDimensions(new Map());

      const timer1 = window.setTimeout(() => fitRef.current({ forceFull: true, duration: 200 }), 100);
      const timer2 = window.setTimeout(() => fitRef.current({ forceFull: true, duration: 300 }), 300);
      return () => {
        window.clearTimeout(timer1);
        window.clearTimeout(timer2);
      };
    }
  }, [trace.traceId]);

  // When panel opens or closes, re-fit view to prevent overlapping
  useEffect(() => {
    const timer = window.setTimeout(() => fitRef.current(250), 60);
    return () => window.clearTimeout(timer);
  }, [selectedSpan]);

  // When detailPath changes (step opened or closed), re-fit to focus on linked cards
  useEffect(() => {
    const timer = window.setTimeout(() => fitRef.current(300), 70);
    return () => window.clearTimeout(timer);
  }, [detailPath]);

  const toggleGroup = useCallback((id: string) => {
    setDetailPath((current) => {
      const index = current.findIndex((item) => item.ownerId === id);
      return index < 0 ? current : current.slice(0, index);
    });
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    window.setTimeout(() => fitRef.current(300), 80);
  }, []);

  const openStep = useCallback((ownerId: string, spanId: string) => {
    setDetailPath((current) => {
      const isCurrentlyOpen = current.some((item) => item.ownerId === ownerId && item.spanId === spanId);
      const next = toggleGroupedDetail(current, ownerId, spanId);
      if (isCurrentlyOpen) {
        if (next.length === 0) {
          focusedCardIdsRef.current = [ownerId];
          window.setTimeout(() => fitRef.current({ cardIds: [ownerId], duration: 300 }), 30);
        } else {
          const last = next[next.length - 1];
          if (last) {
            focusedCardIdsRef.current = [last.ownerId, `detail-${last.spanId}`];
            window.setTimeout(() => fitRef.current({ cardIds: [last.ownerId, `detail-${last.spanId}`], duration: 300 }), 30);
          }
        }
      } else {
        focusedCardIdsRef.current = [ownerId, `detail-${spanId}`];
        window.setTimeout(() => fitRef.current({ cardIds: [ownerId, `detail-${spanId}`], duration: 320 }), 30);
      }
      return next;
    });
  }, []);

  const closeDetail = useCallback((id: string) => {
    setDetailPath((current) => {
      const index = current.findIndex((item) => `detail-${item.spanId}` === id);
      const next = index < 0 ? current : current.slice(0, index);
      if (next.length === 0) {
        focusedCardIdsRef.current = null;
        window.setTimeout(() => fitRef.current({ forceFull: true, duration: 300 }), 40);
      } else {
        const last = next[next.length - 1];
        if (last) {
          focusedCardIdsRef.current = [last.ownerId, `detail-${last.spanId}`];
          window.setTimeout(() => fitRef.current({ cardIds: [last.ownerId, `detail-${last.spanId}`], duration: 300 }), 40);
        }
      }
      return next;
    });
  }, []);

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
    if (fitted.current || !graph.nodes.filter((node) => node.type === 'groupedCard').every((node) => dimensions.has(node.id))) return;
    const frame = window.requestAnimationFrame(() => {
      fitted.current = true;
      fitRef.current(300);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dimensions, graph.nodes]);

  return {
    ...graph,
    query,
    setQuery,
    toggleGroup,
    openStep,
    closeDetail,
    hasDetails: detailPath.length > 0,
    closeDetails: () => {
      focusedCardIdsRef.current = null;
      setDetailPath([]);
      window.setTimeout(() => fitRef.current({ forceFull: true, duration: 300 }), 50);
    },
    onNodesChange,
    fit,
    allExpanded,
    canExpand: expandable.length > 0,
    toggleAll: () => {
      focusedCardIdsRef.current = null;
      setDetailPath([]);
      setCollapsed(allExpanded ? new Set(expandable.map((node) => node.id)) : new Set());
      window.setTimeout(() => fitRef.current({ forceFull: true, duration: 300 }), 50);
    },
    matchingGroups: graph.nodes.filter((node) => node.type === 'groupedCard' && node.data.kind === 'process' && node.data.highlighted && node.data.node).length,
  };
}
