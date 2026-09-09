import { MarkerType } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import type { TraceFlowTraceDto } from 'traceflow/protocol';
import { GROUPED_FLOW_GEOMETRY } from '../constants/grouped-flow.constant';
import type { GroupedCardData, GroupedFlowGraph, GroupedFlowModel } from '../interfaces/grouped-flow.interface';
import type { JourneyNode } from '../interfaces/journey.interface';
import type { TraceNodeDimensions } from '../interfaces/trace-graph.interface';
import type { GroupedFlowNode } from '../types/grouped-flow.type';
import { groupConcurrentSpans, hasMonotonicTiming } from './execution-flow.function';
import { buildJourney, descendants, getSearchIds, getUnobservedNodes } from './journey.function';

/** Identify a coordinating chain when it leads to a branch point.
 * Every observed span belongs to the entry, a coordinator card, or one process card.
 */
export function buildGroupedFlowModel(trace: TraceFlowTraceDto): GroupedFlowModel {
  const roots = buildJourney(trace);
  const envelope = roots.length === 1 && roots[0]?.span.attributes['traceflow.http.request_root'] === true ? roots[0] : null;
  const entry = envelope ? findFirstController(envelope) : roots.length === 1 && roots[0]?.span.parentSpanId === null ? roots[0] : null;
  const preconditions = envelope && entry ? envelope.children.filter((node) => node !== entry) : [];
  const coordinators: JourneyNode[] = [];
  let branches = entry ? entry.children : roots;
  if (entry && branches.length === 1) {
    let cursor = branches[0];
    while (cursor?.span.type === 'service') {
      const nestedServices = findNestedServices(cursor);
      if (!nestedServices.length) break;
      coordinators.push(cursor);
      branches = nestedServices;
      if (nestedServices.length > 1) break;
      cursor = nestedServices[0];
    }
  }
  const byId = new Map(branches.map((node) => [node.span.spanId, node]));
  const groups = entry ? groupConcurrentSpans(branches.map((node) => node.span)).map((group) => group.map((span) => byId.get(span.spanId)!)) : [branches];
  return { request: envelope, entry, preconditions, coordinators, branches, groups, unobserved: getUnobservedNodes(trace), linked: entry !== null };
}

export function buildGroupedFlowGraph(
  trace: TraceFlowTraceDto,
  expanded: ReadonlySet<string> = new Set(),
  query = '',
  dimensions: ReadonlyMap<string, TraceNodeDimensions> = new Map(),
): GroupedFlowGraph {
  const model = buildGroupedFlowModel(trace);
  const geometry = GROUPED_FLOW_GEOMETRY;
  const matchedIds = getSearchIds(buildJourney(trace), query);
  const processX = geometry.entryWidth + geometry.columnGap;
  const branchX = processX + model.coordinators.length * (geometry.processWidth + geometry.columnGap);
  const processLaneWidth = branchX - processX + geometry.processWidth;
  const outputX = branchX + geometry.processWidth + geometry.columnGap;
  const heightOf = (id: string, fallback: number) => dimensions.get(id)?.height ?? fallback;
  const branchHeights = model.branches.map((node) => heightOf(node.span.spanId, geometry.processHeight));
  const branchStackHeight = branchHeights.reduce((total, height) => total + height, 0) + Math.max(0, model.branches.length - 1) * geometry.rowGap;
  const coordinatorHeights = model.coordinators.map((node) => heightOf(node.span.spanId, geometry.processHeight));
  const processHeight = Math.max(branchStackHeight, ...coordinatorHeights, geometry.processHeight);
  const entryHeight = heightOf('grouped-entry', geometry.entryHeight);
  const outputHeight = heightOf('grouped-output', geometry.outputHeight);
  const contentHeight = Math.max(processHeight, entryHeight, outputHeight, geometry.minimumHeight - geometry.top * 2);
  const centerY = geometry.top + contentHeight / 2;
  const height = geometry.top + contentHeight + 36;
  const visibleCardIds = new Set([...model.coordinators, ...model.branches].map((node) => node.span.spanId));
  const data = (kind: GroupedCardData['kind'], node: JourneyNode | null, stepLabel = '', continuesInFlow = false): GroupedCardData => ({
    kind,
    request: model.request,
    node: node ? withoutVisibleServiceChildren(node, visibleCardIds) : null,
    preconditions: model.preconditions,
    continuesInFlow,
    expanded: node ? expanded.has(node.span.spanId) || (Boolean(query) && matchedIds.has(node.span.spanId)) : false,
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
  const nodes: GroupedFlowNode[] = [
    lane('lane-entry', -24, geometry.entryWidth + geometry.columnGap / 2 + 24, '01', 'Entrada', 'Petición y controller', true),
    lane('lane-process', processX - geometry.columnGap / 2, processLaneWidth + geometry.columnGap, '02', 'Proceso', processDescription(model), true),
    lane('lane-output', outputX - geometry.columnGap / 2, geometry.outputWidth + geometry.columnGap / 2 + 24, '03', 'Salida', 'Resultado de la ejecución', false),
    { id: 'grouped-entry', type: 'groupedCard', position: { x: 0, y: centerY - entryHeight / 2 }, data: data('entry', model.entry), style: { width: geometry.entryWidth }, zIndex: 2 },
    { id: 'grouped-output', type: 'groupedCard', position: { x: outputX, y: centerY - outputHeight / 2 }, data: data('output', model.entry), style: { width: geometry.outputWidth }, zIndex: 2 },
  ];
  model.coordinators.forEach((node, index) => {
    const cardHeight = coordinatorHeights[index] ?? geometry.processHeight;
    const x = processX + index * (geometry.processWidth + geometry.columnGap);
    nodes.push({
      id: node.span.spanId,
      type: 'groupedCard',
      position: { x, y: centerY - cardHeight / 2 },
      data: data('process', node, `${index + 1}`, true),
      style: { width: geometry.processWidth },
      zIndex: 2,
    });
  });
  let y = centerY - branchStackHeight / 2;
  model.groups.forEach((group, groupIndex) =>
    group.forEach((node, branchIndex) => {
      const stepNumber = model.coordinators.length + groupIndex + 1;
      const stepLabel = model.linked ? `${stepNumber}${group.length > 1 ? String.fromCharCode(65 + branchIndex) : ''}` : 'Sin padre';
      nodes.push({ id: node.span.spanId, type: 'groupedCard', position: { x: branchX, y }, data: data('process', node, stepLabel), style: { width: geometry.processWidth }, zIndex: 2 });
      y += heightOf(node.span.spanId, geometry.processHeight) + geometry.rowGap;
    }),
  );
  if (!model.branches.length) {
    nodes.push({ id: 'grouped-empty', type: 'groupedCard', position: { x: branchX, y: centerY - 62 }, data: data('process', null), style: { width: geometry.processWidth }, zIndex: 2 });
  }
  const edges = buildGroupedEdges(model, trace);
  const highlighted = new Set(nodes.filter((node) => node.type === 'groupedCard' && node.data.highlighted).map((node) => node.id));
  return {
    nodes,
    bounds: { x: -24, y: 0, width: outputX + geometry.outputWidth + 48, height },
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

function findNestedServices(node: JourneyNode): JourneyNode[] {
  return node.children.flatMap((child) => (child.span.type === 'service' ? [child] : findNestedServices(child)));
}

function withoutVisibleServiceChildren(node: JourneyNode, visibleCardIds: ReadonlySet<string>): JourneyNode {
  return {
    span: node.span,
    children: node.children.flatMap((child) => (visibleCardIds.has(child.span.spanId) && child.span.type === 'service' ? [] : [withoutVisibleServiceChildren(child, visibleCardIds)])),
  };
}

function processDescription(model: GroupedFlowModel): string {
  const stages = model.coordinators.length + model.groups.length;
  if (model.groups.length === 1 && model.branches.length > 1 && model.linked) {
    const timing = hasMonotonicTiming(model.branches.map((node) => node.span)) ? 'en paralelo' : '· orden estimado';
    return `${stages} etapas · ${model.branches.length} ramas ${timing}`;
  }
  return stages > 1 ? `${stages} etapas del proceso` : 'Operaciones y pasos internos';
}

function buildGroupedEdges(model: GroupedFlowModel, trace: TraceFlowTraceDto): Edge[] {
  if (!model.linked) return [];
  const edges: Edge[] = [];
  let previous = ['grouped-entry'];
  model.coordinators.forEach((node) => {
    previous.forEach((source) => edges.push(groupedEdge(source, node.span.spanId, node.span.status === 'error', false)));
    previous = [node.span.spanId];
  });
  model.groups.forEach((group, groupIndex) => {
    group.forEach((node) => previous.forEach((source) => edges.push(groupedEdge(source, node.span.spanId, node.span.status === 'error', groupIndex > 0))));
    previous = group.map((node) => node.span.spanId);
  });
  // A rejection can close the root before other parallel branches finish.
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
    ...(sequential ? { label: 'Luego', labelStyle: { fontSize: 10, fill: '#71717a' }, labelBgStyle: { fill: '#fafafa' } } : {}),
    style: { stroke: color, strokeWidth: 2, ...(incomplete ? { strokeDasharray: '5 5' } : {}) },
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
    zIndex: 1,
  };
}
