import { MarkerType } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
import { GROUPED_FLOW_GEOMETRY } from '../constants/grouped-flow.constant';
import type { GroupedCardData, GroupedDetailSelection, GroupedFlowGraph, GroupedFlowModel } from '../interfaces/grouped-flow.interface';
import type { JourneyNode } from '../interfaces/journey.interface';
import type { TraceNodeDimensions } from '../interfaces/trace-graph.interface';
import type { GroupedFlowNode } from '../types/grouped-flow.type';
import { groupConcurrentSpans } from './execution-flow.function';
import { buildJourney, descendants, getSearchIds, getUnobservedNodes } from './journey.function';

/** Keep parentage intact: a service's children stay inside it, in observed order. */
export function buildGroupedFlowModel(trace: TraceFlowTraceDto): GroupedFlowModel {
  const roots = buildJourney(trace);
  const envelope = roots.length === 1 && roots[0]?.span.attributes['traceflow.http.request_root'] === true ? roots[0] : null;
  const entry = envelope ? findFirstController(envelope) : roots.length === 1 && roots[0]?.span.parentSpanId === null ? roots[0] : null;
  const preconditions = envelope && entry ? envelope.children.filter((node) => node !== entry) : [];
  const branches = entry ? entry.children : roots;
  const byId = new Map(branches.map((node) => [node.span.spanId, node]));
  const groups = entry ? groupConcurrentSpans(branches.map((node) => node.span)).map((group) => group.map((span) => byId.get(span.spanId)!)) : [branches];
  return { request: envelope, entry, preconditions, branches, groups, unobserved: getUnobservedNodes(trace), linked: entry !== null };
}

/** One exploration path at a time; changing a parent removes its old detail descendants. */
export function toggleGroupedDetail(path: GroupedDetailSelection[], ownerId: string, spanId: string): GroupedDetailSelection[] {
  const index = path.findIndex((item) => item.ownerId === ownerId);
  const ownerIndex = path.findIndex((item) => `detail-${item.spanId}` === ownerId);
  const prefix = index >= 0 ? path.slice(0, index) : ownerIndex >= 0 ? path.slice(0, ownerIndex + 1) : [];
  return index >= 0 && path[index]?.spanId === spanId ? prefix : [...prefix, { ownerId, spanId }];
}

export function buildGroupedFlowGraph(
  trace: TraceFlowTraceDto,
  collapsed: ReadonlySet<string> = new Set(),
  query = '',
  dimensions: ReadonlyMap<string, TraceNodeDimensions> = new Map(),
  detailPath: GroupedDetailSelection[] = [],
): GroupedFlowGraph {
  const model = buildGroupedFlowModel(trace);
  const g = GROUPED_FLOW_GEOMETRY;
  const matchedIds = getSearchIds(buildJourney(trace), query);
  const owners = new Map<string, JourneyNode[]>([['grouped-entry', model.preconditions], ...model.branches.map((node): [string, JourneyNode[]] => [node.span.spanId, node.children])]);
  const details: Array<GroupedDetailSelection & { node: JourneyNode }> = [];
  for (const item of detailPath) {
    const node = findNestedNode(owners.get(item.ownerId) ?? [], item.spanId);
    if (!node) break;
    details.push({ ...item, node });
    owners.set(`detail-${item.spanId}`, node.children);
  }
  const entryDetail = details[0]?.ownerId === 'grouped-entry';
  const columnWidth = g.processWidth + g.columnGap;
  const processX = g.entryWidth + g.columnGap + (entryDetail ? details.length * columnWidth : 0);
  const detailX = entryDetail ? g.entryWidth + g.columnGap : processX + columnWidth;
  const outputX = processX + columnWidth + (entryDetail ? 0 : details.length * columnWidth);
  const heightOf = (id: string, fallback: number) => dimensions.get(id)?.height ?? fallback;
  const branchHeights = model.branches.map((node) => heightOf(node.span.spanId, g.processHeight));
  const stackHeight = branchHeights.reduce((total, height) => total + height, 0) + Math.max(0, branchHeights.length - 1) * g.rowGap;
  const entryHeight = heightOf('grouped-entry', g.entryHeight);
  const outputHeight = heightOf('grouped-output', g.outputHeight);
  const contentHeight = Math.max(stackHeight, entryHeight, outputHeight, ...details.map((item) => heightOf(`detail-${item.spanId}`, g.processHeight)), g.minimumHeight - g.top * 2);
  const centerY = g.top + contentHeight / 2;
  const height = g.top + contentHeight + (details.length ? 80 : 36);
  const data = (kind: GroupedCardData['kind'], node: JourneyNode | null, cardId: string, stepLabel = '', detail = false): GroupedCardData => ({
    cardId,
    detail,
    openedSpanId: details.find((item) => item.ownerId === cardId)?.spanId,
    kind,
    request: model.request,
    node,
    preconditions: model.preconditions,
    expanded: !collapsed.has(cardId) || Boolean(query),
    query,
    highlighted: !query || (node ? matchedIds.has(node.span.spanId) : false),
    matchedIds,
    totalDuration: trace.durationMs,
    traceStatus: trace.status,
    isComplete: trace.isComplete && model.entry !== null,
    stepLabel,
    unobserved: model.unobserved,
  });
  const lane = (id: string, x: number, width: number, number: string, title: string, description: string, divided: boolean): GroupedFlowNode => ({
    id,
    type: 'groupedLane',
    position: { x, y: 0 },
    data: { number, title, description, divided },
    style: { width, height },
    zIndex: -1,
    selectable: false,
    draggable: false,
    focusable: false,
    connectable: false,
  });
  const outputNode = buildOutputNode(trace, model.entry?.span);
  const nodes: GroupedFlowNode[] = [
    lane('lane-entry', -24, g.entryWidth + g.columnGap / 2 + 24, '01', 'Entrada', 'Petición y controller', true),
    lane('lane-process', processX - g.columnGap / 2, outputX - processX, '02', 'Proceso', 'Pasos anidados · orden de ejecución ↓', true),
    lane('lane-output', outputX - g.columnGap / 2, g.outputWidth + g.columnGap / 2 + 24, '03', 'Salida', 'Resultado de la ejecución', false),
    { id: 'grouped-entry', type: 'groupedCard', position: { x: 0, y: centerY - entryHeight / 2 }, data: data('entry', model.entry, 'grouped-entry'), style: { width: g.entryWidth }, zIndex: 2 },
    {
      id: 'grouped-output',
      type: 'groupedCard',
      position: { x: outputX, y: centerY - outputHeight / 2 },
      data: data('output', outputNode, 'grouped-output'),
      style: { width: g.outputWidth },
      zIndex: 2,
    },
  ];
  let y = centerY - stackHeight / 2;
  model.groups.forEach((group, groupIndex) =>
    group.forEach((node, branchIndex) => {
      const stepLabel = model.linked ? `${groupIndex + 1}${group.length > 1 ? String.fromCharCode(65 + branchIndex) : ''}` : 'Sin padre';
      nodes.push({ id: node.span.spanId, type: 'groupedCard', position: { x: processX, y }, data: data('process', node, node.span.spanId, stepLabel), style: { width: g.processWidth }, zIndex: 2 });
      y += heightOf(node.span.spanId, g.processHeight) + g.rowGap;
    }),
  );
  if (!model.branches.length)
    nodes.push({ id: 'grouped-empty', type: 'groupedCard', position: { x: processX, y: centerY - 62 }, data: data('process', null, 'grouped-empty'), style: { width: g.processWidth }, zIndex: 2 });
  details.forEach((item, index) => {
    const id = `detail-${item.spanId}`;
    nodes.push({
      id,
      type: 'groupedCard',
      position: { x: detailX + index * columnWidth, y: centerY - heightOf(id, g.processHeight) / 2 },
      data: data('process', item.node, id, 'Detalle', true),
      style: { width: g.processWidth },
      zIndex: 2,
    });
  });
  const edges = buildGroupedEdges(model, trace);
  // Inspection is not another execution stage. Route execution around the opened cards.
  if (details.length)
    edges.forEach((edge) => {
      if ((entryDetail && edge.source === 'grouped-entry') || (!entryDetail && edge.target === 'grouped-output')) {
        edge.type = 'groupedReturn';
        edge.sourceHandle = 'bottom';
        edge.targetHandle = 'bottom-target';
        edge.data = { railY: g.top + contentHeight + 36 };
      }
    });
  details.forEach((item) =>
    edges.push({
      id: `inspect-${item.ownerId}-${item.spanId}`,
      source: item.ownerId,
      target: `detail-${item.spanId}`,
      sourceHandle: `step-${item.spanId}`,
      targetHandle: 'left',
      type: 'default',
      label: 'Detalle',
      labelStyle: { fontSize: 10, fill: 'var(--flow-edge-label-text)' },
      labelBgStyle: { fill: 'var(--flow-edge-label-bg)' },
      labelBgPadding: [6, 4],
      style: { stroke: '#9a9fb3', strokeWidth: 1.5, strokeDasharray: '5 5' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#9a9fb3', width: 14, height: 14 },
      zIndex: 1,
    }),
  );
  const highlighted = new Set(nodes.filter((node) => node.type === 'groupedCard' && node.data.highlighted).map((node) => node.id));
  return {
    nodes,
    bounds: { x: -24, y: 0, width: outputX + g.outputWidth + 48, height },
    edges: edges.map((edge) => ({ ...edge, style: { ...edge.style, opacity: query && (!highlighted.has(edge.source) || !highlighted.has(edge.target)) ? 0.18 : 1 } })),
  };
}

function findFirstController(root: JourneyNode): JourneyNode | null {
  if (root.span.type === 'controller') return root;
  for (const child of root.children) {
    const controller = findFirstController(child);
    if (controller) return controller;
  }
  return null;
}

function findNestedNode(nodes: JourneyNode[], id: string): JourneyNode | undefined {
  for (const node of nodes) {
    if (node.span.spanId === id) return node;
    const child = findNestedNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

function buildGroupedEdges(model: GroupedFlowModel, trace: TraceFlowTraceDto): Edge[] {
  if (!model.linked) return [];
  const edges: Edge[] = [];
  let previous = ['grouped-entry'];
  model.groups.forEach((group, groupIndex) => {
    group.forEach((node) => previous.forEach((source) => edges.push(groupedEdge(source, node.span.spanId, node.span.status === 'error', groupIndex > 0))));
    previous = group.map((node) => node.span.spanId);
  });
  const failed = model.branches.filter((node) => node.span.status === 'error' || descendants(node).some((child) => child.status === 'error'));
  if (trace.status === 'error' && failed.length) previous = failed.map((node) => node.span.spanId);
  previous.forEach((source) => edges.push(groupedEdge(source, 'grouped-output', trace.status === 'error', false, !trace.isComplete)));
  return edges;
}

function groupedEdge(source: string, target: string, error: boolean, sequential: boolean, incomplete = false): Edge {
  const color = error ? '#e4667d' : '#a6a9bc';
  return {
    id: `grouped-${source}-${target}`,
    source,
    target,
    sourceHandle: sequential ? 'bottom' : 'right',
    targetHandle: sequential ? 'top' : 'left',
    type: sequential ? 'smoothstep' : 'default',
    ...(sequential ? { label: 'Luego', labelStyle: { fontSize: 10, fill: 'var(--flow-edge-label-text)' }, labelBgStyle: { fill: 'var(--flow-edge-label-bg)' } } : {}),
    style: { stroke: color, strokeWidth: 2, ...(incomplete ? { strokeDasharray: '5 5' } : {}) },
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
    zIndex: 1,
  };
}

export function buildOutputSpan(trace: TraceFlowTraceDto, controllerSpan?: TraceFlowSpanDto | null): TraceFlowSpanDto {
  const statusCode = (trace.spans.find((s) => s.attributes?.['http.response.status_code'])?.attributes?.['http.response.status_code'] as number) ?? (trace.status === 'error' ? 500 : 200);
  const rawOutput =
    controllerSpan?.output ??
    controllerSpan?.attributes?.['traceflow.capture.output'] ??
    trace.spans.find((s) => s.output !== undefined || s.attributes?.['traceflow.capture.output'])?.output ??
    trace.spans.find((s) => s.attributes?.['traceflow.capture.output'])?.attributes?.['traceflow.capture.output'];

  return {
    protocolVersion: 1,
    traceId: trace.traceId,
    spanId: 'output-result',
    parentSpanId: controllerSpan?.spanId ?? null,
    serviceName: trace.serviceName,
    name: trace.status === 'error' ? 'Ejecución con error' : 'Resultado de la ejecución',
    type: 'custom',
    labels: ['resultado', 'output'],
    className: null,
    methodName: null,
    description: `HTTP ${statusCode} · ${trace.status === 'success' ? 'Completado' : 'Error'}`,
    startedAt: trace.startedAt,
    endedAt: trace.updatedAt,
    durationMs: trace.durationMs,
    status: trace.status,
    ...(rawOutput !== undefined ? { output: rawOutput } : {}),
    attributes: {
      'traceflow.node_type': 'custom',
      'traceflow.is_output': true,
      'http.response.status_code': statusCode,
      ...(rawOutput !== undefined ? { 'traceflow.capture.output': typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput) } : {}),
      'traceflow.execution.total_duration_ms': trace.durationMs,
      'traceflow.execution.span_count': trace.spanCount,
    },
    error: trace.status === 'error' ? (trace.spans.find((s) => s.status === 'error')?.error ?? null) : null,
  };
}

export function buildOutputNode(trace: TraceFlowTraceDto, controllerSpan?: TraceFlowSpanDto | null): JourneyNode {
  return {
    span: buildOutputSpan(trace, controllerSpan),
    children: [],
  };
}

export function findSpanForCardId(cardId: string, trace: TraceFlowTraceDto): TraceFlowSpanDto | null {
  if (cardId === 'grouped-entry') {
    const controller = trace.spans.find((s) => s.type === 'controller');
    const root = trace.spans.find((s) => s.attributes?.['traceflow.http.request_root'] === true);
    return controller ?? root ?? trace.spans[0] ?? null;
  }
  if (cardId === 'grouped-output') {
    const controller = trace.spans.find((s) => s.type === 'controller');
    return buildOutputSpan(trace, controller);
  }
  const spanId = cardId.startsWith('detail-') ? cardId.replace('detail-', '') : cardId;
  return trace.spans.find((s) => s.spanId === spanId) ?? null;
}

export function findParentSpan(span: TraceFlowSpanDto, trace: TraceFlowTraceDto, fallbackOwnerId?: string): TraceFlowSpanDto | null {
  if (fallbackOwnerId) {
    const owner = findSpanForCardId(fallbackOwnerId, trace);
    if (owner && owner.spanId !== span.spanId) return owner;
  }
  if (span.parentSpanId) {
    const parent = trace.spans.find((s) => s.spanId === span.parentSpanId);
    if (parent) return parent;
  }
  return null;
}
