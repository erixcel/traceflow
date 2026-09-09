import dagre from '@dagrejs/dagre';
import { MarkerType } from '@xyflow/react';
import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
import { TRACEFLOW_NODE_COLORS } from '../constants/flow.constant';
import type { MaterializedEdge, MaterializedNode, TraceGraph, TraceNodeDimensions } from '../interfaces/trace-graph.interface';
import type { TraceNodeExecutionState } from '../types/trace.type';
import { buildExecutionFlow } from './execution-flow.function';

export function buildTraceGraph(trace: TraceFlowTraceDto, dimensions: ReadonlyMap<string, TraceNodeDimensions> = new Map()): TraceGraph {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', ranksep: 140, nodesep: 52, marginx: 32, marginy: 32 });
  const materialized = trace.flow ? materializeExpectedFlow(trace) : materializeObservedFlow(trace);

  for (const node of materialized.nodes) {
    const size = dimensions.get(node.id) ?? { width: 260, height: 150 };
    graph.setNode(node.id, size);
  }

  const stateByNodeId = new Map(materialized.nodes.map((node) => [node.id, node.state]));
  const edges = materialized.edges.flatMap((edge) => {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) {
      return [];
    }

    graph.setEdge(edge.source, edge.target);
    const state = stateByNodeId.get(edge.target) ?? 'skipped';
    const color = TRACEFLOW_NODE_COLORS[state];
    return [
      {
        id: `flow-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: 'default',
        style: { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, opacity: state === 'skipped' ? 0.58 : 0.92, ...(edge.parallel ? { strokeDasharray: '3 6' } : {}) },
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
      },
    ];
  });

  dagre.layout(graph);
  const nodes = materialized.nodes.map((node) => {
    const position = graph.node(node.id) as { x: number; y: number } | undefined;
    const size = dimensions.get(node.id) ?? { width: 260, height: 150 };
    return {
      id: node.id,
      type: 'traceSpan' as const,
      position: { x: (position?.x ?? 0) - size.width / 2, y: (position?.y ?? 0) - size.height / 2 },
      data: { definition: node.definition, span: node.span, state: node.state },
    };
  });

  return { nodes, edges };
}

function materializeExpectedFlow(trace: TraceFlowTraceDto): { nodes: MaterializedNode[]; edges: MaterializedEdge[] } {
  const flow = trace.flow;
  if (!flow) {
    return materializeObservedFlow(trace);
  }

  const spansByCodeLocation = new Map<string, TraceFlowSpanDto[]>();
  for (const span of trace.spans) {
    if (span.className && span.methodName) {
      const key = codeLocationKey(span.className, span.methodName);
      const matches = spansByCodeLocation.get(key) ?? [];
      matches.push(span);
      spansByCodeLocation.set(key, matches);
    }
  }

  const nodes = flow.nodes.map((definition): MaterializedNode => {
    const span = spansByCodeLocation.get(codeLocationKey(definition.className, definition.methodName))?.shift() ?? null;
    return { id: definition.id, definition, span, state: executionState(span) };
  });
  const edges = flow.edges.map((edge) => ({ source: edge.source, target: edge.target, parallel: edge.parallel ?? false }));
  return { nodes, edges };
}

function materializeObservedFlow(trace: TraceFlowTraceDto): { nodes: MaterializedNode[]; edges: MaterializedEdge[] } {
  const spans = [...trace.spans].sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt));
  const executionFlow = buildExecutionFlow(trace);
  const nodes = spans.map((span): MaterializedNode => ({
    id: span.spanId,
    definition: {
      id: span.spanId,
      name: span.name,
      type: span.type,
      className: span.className ?? '',
      methodName: span.methodName ?? '',
      ...(span.description ? { description: span.description } : {}),
    },
    span,
    state: executionState(span),
  }));
  return { nodes, edges: executionFlow.edges };
}

function executionState(span: TraceFlowSpanDto | null): TraceNodeExecutionState {
  return span?.status === 'error' ? 'error' : span?.status === 'success' ? 'success' : 'skipped';
}

function codeLocationKey(className: string, methodName: string): string {
  return `${className}\u0000${methodName}`;
}
