import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useStoreApi } from '@xyflow/react';
import type { NodeChange } from '@xyflow/react';
import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
import { buildGroupedFlowGraph, findSpanForCardId, getGroupedFlowMaxDepth, toggleGroupedDetail } from '../functions/grouped-flow.function';
import { GROUPED_FLOW_GEOMETRY } from '../constants/grouped-flow.constant';
import type { FitViewOptions, GroupedDetailSelection } from '../interfaces/grouped-flow.interface';
import type { TraceCanvasProps } from '../interfaces/trace-canvas.interface';
import type { TraceNodeDimensions } from '../interfaces/trace-graph.interface';
import type { GroupedFlowNode } from '../types/grouped-flow.type';
import { useTraceStore } from '../stores/trace.store';

const DEPTH_SESSION_KEY = 'traceflow.grouped-flow.depth';

function readVisibleDepth(traceId: string, max: number): number {
  try {
    const saved = Number(window.sessionStorage.getItem(`${DEPTH_SESSION_KEY}.${traceId}`));
    return Number.isInteger(saved) && saved >= 1 ? Math.min(saved, max) : 1;
  } catch {
    return 1;
  }
}

function saveVisibleDepth(traceId: string, depth: number): void {
  try {
    window.sessionStorage.setItem(`${DEPTH_SESSION_KEY}.${traceId}`, String(depth));
  } catch {
    // Studio sigue funcionando cuando el navegador bloquea sessionStorage.
  }
}

export function useGroupedFlow(trace: TraceFlowTraceDto, onSelectSpan: TraceCanvasProps['onSelectSpan']) {
  const selectedSpan = useTraceStore((state) => state.selectedSpan);
  const maxVisibleDepth = useMemo(() => getGroupedFlowMaxDepth(trace), [trace]);
  const [visibleDepth, setVisibleDepthState] = useState(() => readVisibleDepth(trace.traceId, maxVisibleDepth));
  const [depthOverrides, setDepthOverrides] = useState<Map<string, number>>(() => new Map());
  const [detailPath, setDetailPath] = useState<GroupedDetailSelection[]>([]);
  const [query, setQuery] = useState('');
  const [dimensions, setDimensions] = useState<Map<string, TraceNodeDimensions>>(() => new Map());
  const graph = useMemo(
    () => buildGroupedFlowGraph(trace, new Set(), query.trim(), dimensions, detailPath, depthOverrides, visibleDepth),
    [trace, query, dimensions, detailPath, depthOverrides, visibleDepth],
  );
  const fitted = useRef(false);
  const previousTraceId = useRef<string | null>(null);
  const focusedCardIdsRef = useRef<string[] | null>(null);
  const detailPathRef = useRef(detailPath);
  detailPathRef.current = detailPath;
  const flowStore = useStoreApi<GroupedFlowNode>();
  const { fitBounds } = useReactFlow();
  const { x, y, width, height } = graph.bounds;

  const fit = useCallback(
    (options?: number | FitViewOptions) => {
      const duration = typeof options === 'number' ? options : (options?.duration ?? 300);
      const forceFull = typeof options === 'object' ? Boolean(options.forceFull) : false;
      const revealLaneHeader = typeof options === 'object' ? Boolean(options.revealLaneHeader) : false;
      const isPanelOpen = Boolean(useTraceStore.getState().selectedSpan);
      const compactViewport = window.matchMedia('(max-width: 767px)').matches;

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
              (card.id === 'grouped-entry' || card.id === 'grouped-controller'
                ? GROUPED_FLOW_GEOMETRY.entryWidth
                : card.id === 'grouped-output'
                  ? GROUPED_FLOW_GEOMETRY.outputWidth
                  : GROUPED_FLOW_GEOMETRY.processWidth);
            const fallbackH =
              card.id === 'grouped-entry'
                ? GROUPED_FLOW_GEOMETRY.entryHeight
                : card.id === 'grouped-controller'
                  ? GROUPED_FLOW_GEOMETRY.controllerHeight
                  : card.id === 'grouped-output'
                    ? GROUPED_FLOW_GEOMETRY.outputHeight
                    : GROUPED_FLOW_GEOMETRY.processHeight;
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
          const boxWidth = Math.max(rawWidth, compactViewport ? 360 : 760);
          const centerX = (targetMinX + targetMaxX) / 2;
          const finalMinX = centerX - boxWidth / 2;

          const targetMinY = revealLaneHeader ? 0 : Math.max(0, minY - 36);
          const targetMaxY = maxY + 36;
          const rawHeight = targetMaxY - targetMinY;
          const boxHeight = Math.max(rawHeight, compactViewport ? 360 : 440);
          const centerY = (targetMinY + targetMaxY) / 2;
          const finalMinY = centerY - boxHeight / 2;

          const padding = compactViewport
            ? isPanelOpen
              ? { top: '24px', bottom: '58%', left: '12px', right: '12px' }
              : { top: '44px', bottom: '64px', left: '12px', right: '12px' }
            : isPanelOpen
              ? { top: '32px', bottom: '40px', left: '48px', right: '460px' }
              : { top: '32px', bottom: '40px', left: '48px', right: '48px' };

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

      const fullPadding = compactViewport
        ? isPanelOpen
          ? { top: '24px', bottom: '58%', left: '12px', right: '12px' }
          : { top: '44px', bottom: '64px', left: '12px', right: '12px' }
        : isPanelOpen
          ? { top: '32px', bottom: '40px', left: '48px', right: '460px' }
          : { top: '32px', bottom: '40px', left: '48px', right: '48px' };
      fitBounds({ x, y, width, height }, { padding: fullPadding, duration } as unknown as Parameters<typeof fitBounds>[1]);
    },
    [fitBounds, x, y, width, height, detailPath, graph.nodes, dimensions],
  );

  const fitRef = useRef(fit);
  fitRef.current = fit;

  const fitOverview = useCallback(
    (duration = 300) => {
      if (window.matchMedia('(max-width: 639px)').matches) {
        fit({ cardIds: ['grouped-entry'], duration, revealLaneHeader: true });
        return;
      }
      fit({ forceFull: true, duration });
    },
    [fit],
  );
  const fitOverviewRef = useRef(fitOverview);
  fitOverviewRef.current = fitOverview;

  const fitAutomatic = useCallback(
    (duration = 300) => {
      const focusedCardIds = focusedCardIdsRef.current;
      const focusedOutsideEntry = focusedCardIds?.some((id) => id !== 'grouped-entry' && id !== 'grouped-controller');
      if (window.matchMedia('(max-width: 767px)').matches && focusedCardIds?.length && focusedOutsideEntry) {
        fit({ cardIds: focusedCardIds, duration });
        return;
      }
      fitOverview(duration);
    },
    [fit, fitOverview],
  );
  const fitAutomaticRef = useRef(fitAutomatic);
  fitAutomaticRef.current = fitAutomatic;

  const focusDominantLane = useCallback(
    (duration = 300) => {
      if (!window.matchMedia('(max-width: 639px)').matches) {
        fit({ forceFull: true, duration });
        return;
      }

      const { width: viewportWidth, transform } = flowStore.getState();
      const [translateX, , zoom] = transform;
      const lanes = graph.nodes.filter((node) => node.type === 'groupedLane');
      if (viewportWidth <= 0 || lanes.length === 0) {
        const topCard = graph.nodes
          .filter((node) => node.type === 'groupedCard' && !node.data.detail)
          .sort((a, b) => a.position.y - b.position.y)[0];
        if (topCard) fit({ cardIds: [topCard.id], duration, revealLaneHeader: true });
        return;
      }

      const visibleLanes = lanes.map((lane) => {
        const laneWidth = typeof lane.style?.width === 'number' ? lane.style.width : 0;
        const screenLeft = lane.position.x * zoom + translateX;
        const screenRight = (lane.position.x + laneWidth) * zoom + translateX;
        const overlap = Math.max(0, Math.min(viewportWidth, screenRight) - Math.max(0, screenLeft));
        const centerDistance = Math.abs((screenLeft + screenRight) / 2 - viewportWidth / 2);
        return { id: lane.id, overlap, centerDistance };
      });
      const hasVisibleLane = visibleLanes.some((lane) => lane.overlap > 0);
      visibleLanes.sort((a, b) => (hasVisibleLane ? b.overlap - a.overlap : a.centerDistance - b.centerDistance));
      const dominantLaneId = visibleLanes[0]?.id;
      const topCard = graph.nodes
        .filter((node) => {
          if (node.type !== 'groupedCard' || node.data.detail) return false;
          if (dominantLaneId === 'lane-entry') return node.data.kind === 'entry' || node.data.kind === 'controller';
          if (dominantLaneId === 'lane-process') return node.data.kind === 'process';
          return dominantLaneId === 'lane-output' && node.data.kind === 'output';
        })
        .sort((a, b) => a.position.y - b.position.y)[0];

      if (topCard) {
        fit({ cardIds: [topCard.id], duration, revealLaneHeader: true });
        return;
      }
      const fallbackTopCard = graph.nodes
        .filter((node) => node.type === 'groupedCard' && !node.data.detail)
        .sort((a, b) => a.position.y - b.position.y)[0];
      if (fallbackTopCard) fit({ cardIds: [fallbackTopCard.id], duration, revealLaneHeader: true });
    },
    [fit, flowStore, graph.nodes],
  );

  // Reset state and trigger auto-fit when changing traces/flows
  useEffect(() => {
    if (previousTraceId.current !== trace.traceId) {
      previousTraceId.current = trace.traceId;
      fitted.current = false;
      focusedCardIdsRef.current = null;
      setDetailPath([]);
      setVisibleDepthState(readVisibleDepth(trace.traceId, maxVisibleDepth));
      setDepthOverrides(new Map());
      setDimensions(new Map());

      const timer1 = window.setTimeout(() => fitAutomaticRef.current(200), 100);
      const timer2 = window.setTimeout(() => fitAutomaticRef.current(300), 300);
      return () => {
        window.clearTimeout(timer1);
        window.clearTimeout(timer2);
      };
    }
  }, [maxVisibleDepth, trace.traceId]);

  useEffect(() => {
    setVisibleDepthState((current) => Math.min(current, maxVisibleDepth));
  }, [maxVisibleDepth]);

  // When panel opens or closes, re-fit view to prevent overlapping
  useEffect(() => {
    if (!selectedSpan) {
      const rootDetail = detailPathRef.current[0];
      const parentCardId = rootDetail?.ownerId ?? focusedCardIdsRef.current?.find((id) => !id.startsWith('detail-'));
      if (parentCardId) focusedCardIdsRef.current = [parentCardId];
      setDetailPath([]);
      if (!parentCardId) return;
      const timer = window.setTimeout(() => fitRef.current({ cardIds: [parentCardId], duration: 300 }), 40);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => (focusedCardIdsRef.current ? fitRef.current(250) : fitOverviewRef.current(250)), 60);
    return () => window.clearTimeout(timer);
  }, [selectedSpan]);

  // When detailPath changes (step opened or closed), re-fit to focus on linked cards
  useEffect(() => {
    if (detailPath.length === 0) return;
    const timer = window.setTimeout(() => fitRef.current(300), 70);
    return () => window.clearTimeout(timer);
  }, [detailPath]);

  const selectCard = useCallback(
    (cardId: string, span: TraceFlowSpanDto, tab?: 'input' | 'output' | 'context') => {
      focusedCardIdsRef.current = [cardId];
      setDetailPath([]);
      onSelectSpan(span, tab);
      window.setTimeout(() => fitRef.current({ cardIds: [cardId], duration: 300 }), 30);
    },
    [onSelectSpan],
  );

  const toggleGroup = useCallback(
    (id: string, ownerSpan: TraceFlowSpanDto) => {
      const detailIndex = detailPath.findIndex((item) => item.ownerId === id);
      if (detailIndex >= 0) {
        setDetailPath(detailPath.slice(0, detailIndex));
        onSelectSpan(ownerSpan);
      }
      setDepthOverrides((current) => {
        const next = new Map(current);
        const currentDepth = next.get(id) ?? visibleDepth;
        next.set(id, currentDepth > 1 ? 1 : maxVisibleDepth);
        return next;
      });
      focusedCardIdsRef.current = [id];
      window.setTimeout(() => fitRef.current({ cardIds: [id], duration: 300 }), 80);
    },
    [detailPath, maxVisibleDepth, onSelectSpan, visibleDepth],
  );

  const openStep = useCallback(
    (ownerId: string, span: TraceFlowSpanDto, tab?: 'input' | 'output' | 'context') => {
      const isCurrentlyOpen = detailPath.some((item) => item.ownerId === ownerId && item.spanId === span.spanId);
      const next = toggleGroupedDetail(detailPath, ownerId, span.spanId);
      setDetailPath(next);

      if (isCurrentlyOpen) {
        onSelectSpan(findSpanForCardId(ownerId, trace), tab);
      } else {
        onSelectSpan(span, tab);
      }

      if (next.length === 0) {
        focusedCardIdsRef.current = [ownerId];
        window.setTimeout(() => fitRef.current({ cardIds: [ownerId], duration: 300 }), 30);
      } else {
        const last = next[next.length - 1];
        if (last) {
          focusedCardIdsRef.current = [last.ownerId, `detail-${last.spanId}`];
          window.setTimeout(() => fitRef.current({ cardIds: [last.ownerId, `detail-${last.spanId}`], duration: isCurrentlyOpen ? 300 : 320 }), 30);
        }
      }
    },
    [detailPath, onSelectSpan, trace],
  );

  const closeDetail = useCallback(
    (id: string) => {
      const index = detailPath.findIndex((item) => `detail-${item.spanId}` === id);
      if (index < 0) return;
      const closedItem = detailPath[index];
      if (!closedItem) return;
      const next = detailPath.slice(0, index);
      setDetailPath(next);
      onSelectSpan(findSpanForCardId(closedItem.ownerId, trace));

      if (next.length === 0) {
        focusedCardIdsRef.current = [closedItem.ownerId];
        window.setTimeout(() => fitRef.current({ cardIds: [closedItem.ownerId], duration: 300 }), 40);
      } else {
        const last = next[next.length - 1];
        if (last) {
          focusedCardIdsRef.current = [last.ownerId, `detail-${last.spanId}`];
          window.setTimeout(() => fitRef.current({ cardIds: [last.ownerId, `detail-${last.spanId}`], duration: 300 }), 40);
        }
      }
    },
    [detailPath, onSelectSpan, trace],
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
    if (fitted.current || !graph.nodes.filter((node) => node.type === 'groupedCard').every((node) => dimensions.has(node.id))) return;
    const frame = window.requestAnimationFrame(() => {
      fitted.current = true;
      fitAutomaticRef.current(300);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dimensions, graph.nodes]);

  const closeDetails = useCallback(() => {
    const first = detailPath[0];
    if (!first) return;
    onSelectSpan(findSpanForCardId(first.ownerId, trace));
    focusedCardIdsRef.current = [first.ownerId];
    setDetailPath([]);
    window.setTimeout(() => fitRef.current({ cardIds: [first.ownerId], duration: 300 }), 50);
  }, [detailPath, onSelectSpan, trace]);

  const setVisibleDepth = useCallback(
    (depth: number) => {
      const nextDepth = Math.min(Math.max(1, depth), maxVisibleDepth);
      const first = detailPath[0];
      if (first) {
        onSelectSpan(findSpanForCardId(first.ownerId, trace));
      }
      focusedCardIdsRef.current = null;
      setDetailPath([]);
      setDepthOverrides(new Map());
      setVisibleDepthState(nextDepth);
      saveVisibleDepth(trace.traceId, nextDepth);
      window.setTimeout(() => fitOverviewRef.current(300), 50);
    },
    [detailPath, maxVisibleDepth, onSelectSpan, trace],
  );

  return {
    ...graph,
    query,
    setQuery,
    selectCard,
    toggleGroup,
    openStep,
    closeDetail,
    hasDetails: detailPath.length > 0,
    closeDetails,
    onNodesChange,
    fit,
    fitOverview,
    fitAutomatic,
    focusDominantLane,
    visibleDepth,
    maxVisibleDepth,
    setVisibleDepth,
    matchingGroups: graph.nodes.filter((node) => node.type === 'groupedCard' && node.data.kind === 'process' && node.data.highlighted && node.data.node).length,
  };
}
