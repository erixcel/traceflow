import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
import { buildGroupedFlowGraph, buildGroupedFlowModel } from '../studio/src/modules/admin/page/flows/functions/grouped-flow.function';
import { descendants } from '../studio/src/modules/admin/page/flows/functions/journey.function';
import type { GroupedCardNode } from '../studio/src/modules/admin/page/flows/types/grouped-flow.type';

function span(id: string, parentSpanId: string | null, overrides: Partial<TraceFlowSpanDto> = {}): TraceFlowSpanDto {
  return {
    protocolVersion: 1,
    traceId: '1'.repeat(32),
    spanId: id,
    parentSpanId,
    serviceName: 'test',
    name: id,
    type: 'service',
    labels: [],
    className: 'Example',
    methodName: id,
    description: null,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:00:00.010Z',
    durationMs: 10,
    status: 'success',
    attributes: {},
    error: null,
    ...overrides,
  };
}

function trace(spans: TraceFlowSpanDto[]): TraceFlowTraceDto {
  return {
    traceId: '1'.repeat(32),
    serviceName: 'test',
    rootName: 'Endpoint',
    startedAt: '',
    updatedAt: '',
    durationMs: 10,
    status: 'success',
    isComplete: true,
    spanCount: spans.length,
    spans,
    flow: null,
  };
}

function dashboard(): TraceFlowTraceDto {
  return trace([
    span('controller', null, { type: 'controller' }),
    span('coordinator', 'controller'),
    span('bath', 'coordinator'),
    span('pet', 'bath', { type: 'table' }),
    span('income', 'coordinator'),
    span('treatment', 'coordinator'),
  ]);
}

describe('grouped execution graph', () => {
  it('places every observed span exactly once and renders the controller service as a process card', () => {
    const data = dashboard();
    const model = buildGroupedFlowModel(data);
    expect(model.coordinators.map((node) => node.span.spanId)).toEqual(['coordinator']);
    expect(model.branches.map((node) => node.span.spanId)).toEqual(['bath', 'income', 'treatment']);
    const represented = [model.entry!.span, ...model.coordinators.map((node) => node.span), ...model.branches.flatMap((node) => [node.span, ...descendants(node)])];
    expect(represented.map((item) => item.spanId).sort()).toEqual(data.spans.map((item) => item.spanId).sort());
    const graph = buildGroupedFlowGraph(data);
    expect(graph.nodes.filter((node) => node.type === 'groupedCard')).toHaveLength(6);
    expect(graph.nodes.find((node) => node.id === 'coordinator')).toMatchObject({ data: { kind: 'process', continuesInFlow: true, node: { children: [] } } });
    expect(graph.edges.filter((edge) => edge.source === 'grouped-entry').map((edge) => edge.target)).toEqual(['coordinator']);
    expect(graph.edges.filter((edge) => edge.source === 'coordinator').map((edge) => edge.target)).toEqual(['bath', 'income', 'treatment']);
    expect(graph.edges.filter((edge) => edge.target === 'grouped-output')).toHaveLength(3);
  });

  it('keeps a single chain inside one process card and handles a root without children', () => {
    const data = trace([span('entry', null), span('service', 'entry'), span('repo', 'service', { type: 'table' })]);
    const model = buildGroupedFlowModel(data);
    expect(model.coordinators).toEqual([]);
    expect(model.branches.map((node) => node.span.spanId)).toEqual(['service']);
    const serviceCard = buildGroupedFlowGraph(data).nodes.find((node) => node.type === 'groupedCard' && node.id === 'service') as GroupedCardNode | undefined;
    expect(serviceCard?.data.node?.children.map((node) => node.span.spanId)).toEqual(['repo']);
    expect(
      buildGroupedFlowGraph(data)
        .nodes.filter((node) => node.type === 'groupedCard')
        .map((node) => node.id),
    ).toEqual(['grouped-entry', 'grouped-output', 'service']);
    const graph = buildGroupedFlowGraph(trace([span('entry', null)]));
    expect(graph.edges.map((edge) => [edge.source, edge.target])).toEqual([['grouped-entry', 'grouped-output']]);
  });

  it('keeps repeated table queries inside their owning service card', () => {
    const data = trace([span('controller', null, { type: 'controller' }), span('service', 'controller'), span('count', 'service', { type: 'table' }), span('page', 'service', { type: 'table' })]);
    const graph = buildGroupedFlowGraph(data);
    const cards = graph.nodes.filter((node) => node.type === 'groupedCard');
    expect(cards.map((node) => node.id)).toEqual(['grouped-entry', 'grouped-output', 'service']);
    expect(cards.find((node) => node.id === 'service')?.data.node?.children.map((node) => node.span.spanId)).toEqual(['count', 'page']);
    expect(graph.edges.map((edge) => [edge.source, edge.target])).toEqual([
      ['grouped-entry', 'service'],
      ['service', 'grouped-output'],
    ]);
  });

  it('does not connect a missing root or unrelated orphan spans to an invented response', () => {
    const data = trace([span('orphan', 'missing'), span('child', 'orphan'), span('other', 'missing-2')]);
    const model = buildGroupedFlowModel(data);
    expect(model.entry).toBeNull();
    expect(model.branches.map((node) => node.span.spanId)).toEqual(['orphan', 'other']);
    expect(buildGroupedFlowGraph(data).edges).toEqual([]);
  });

  it('represents observed sequential intervals without drawing a parallel fork', () => {
    const data = trace([span('entry', null), span('a', 'entry'), span('b', 'entry', { startedAt: '2026-01-01T00:00:00.010Z', endedAt: '2026-01-01T00:00:00.020Z' })]);
    const graph = buildGroupedFlowGraph(data);
    expect(graph.edges.map((edge) => [edge.source, edge.target])).toEqual([
      ['grouped-entry', 'a'],
      ['a', 'b'],
      ['b', 'grouped-output'],
    ]);
    expect(graph.edges[1]).toMatchObject({ sourceHandle: 'bottom', targetHandle: 'top', label: 'Luego' });
  });

  it('keeps graph identity and connections while searching nested calls', () => {
    const data = dashboard();
    const baseline = buildGroupedFlowGraph(data);
    const result = buildGroupedFlowGraph(data, new Set(), 'pet');
    expect(result.nodes.map((node) => node.id)).toEqual(baseline.nodes.map((node) => node.id));
    expect(result.edges.map((edge) => edge.id)).toEqual(baseline.edges.map((edge) => edge.id));
    expect(result.nodes.find((node) => node.id === 'bath')?.data).toMatchObject({ expanded: true, highlighted: true });
    expect(result.nodes.find((node) => node.id === 'income')?.data.highlighted).toBe(false);
    expect(buildGroupedFlowGraph(data, new Set(), 'nothing').nodes.filter((node) => node.type === 'groupedCard' && node.data.highlighted)).toEqual([]);
  });

  it('repositions neighboring cards when an expanded card grows, and recenters entry and output', () => {
    const data = dashboard();
    const expanded = buildGroupedFlowGraph(
      data,
      new Set(['bath']),
      '',
      new Map([
        ['bath', { width: 328, height: 480 }],
        ['income', { width: 328, height: 190 }],
        ['treatment', { width: 328, height: 210 }],
      ]),
    );
    const bath = expanded.nodes.find((node) => node.id === 'bath')!;
    const income = expanded.nodes.find((node) => node.id === 'income')!;
    const treatment = expanded.nodes.find((node) => node.id === 'treatment')!;
    expect(income.position.y).toBeGreaterThanOrEqual(bath.position.y + 480 + 24);
    expect(treatment.position.y).toBeGreaterThanOrEqual(income.position.y + 190 + 24);
    expect(expanded.bounds.height).toBeGreaterThan(treatment.position.y + 210);
    expect(expanded.nodes.find((node) => node.id === 'grouped-entry')!.position.x).toBe(0);
  });

  it('does not imply a successful join after a parallel rejection', () => {
    const data = dashboard();
    data.status = 'error';
    data.spans.find((item) => item.spanId === 'bath')!.status = 'error';
    const graph = buildGroupedFlowGraph(data);
    expect(graph.edges.filter((edge) => edge.target === 'grouped-output').map((edge) => edge.source)).toEqual(['bath']);
  });

  it('marks incomplete output connections without silently completing the trace', () => {
    const data = dashboard();
    data.isComplete = false;
    const graph = buildGroupedFlowGraph(data);
    expect(graph.nodes.find((node) => node.id === 'grouped-output')?.data.isComplete).toBe(false);
    expect(graph.edges.filter((edge) => edge.target === 'grouped-output').every((edge) => edge.style?.strokeDasharray)).toBe(true);
  });

  it('uses an HTTP request as an envelope and shows auth before the controller', () => {
    const data = trace([
      span('request', null, { name: 'GET /dashboard', type: 'custom', attributes: { 'traceflow.http.request_root': true, 'traceflow.timing.clock': 'monotonic' } }),
      span('auth', 'request', { name: 'auth' }),
      span('user', 'auth', { name: 'user', type: 'table' }),
      span('controller', 'request', { type: 'controller' }),
      span('coordinator', 'controller'),
      span('bath', 'coordinator'),
      span('income', 'coordinator'),
    ]);
    const model = buildGroupedFlowModel(data);
    expect(model.entry?.span.spanId).toBe('controller');
    expect(model.preconditions.map((node) => node.span.spanId)).toEqual(['auth']);
    expect(model.coordinators.map((node) => node.span.spanId)).toEqual(['coordinator']);
    expect(model.branches.map((node) => node.span.spanId)).toEqual(['bath', 'income']);
    expect(buildGroupedFlowGraph(data).nodes.filter((node) => node.type === 'groupedCard')).toHaveLength(5);
  });
});
