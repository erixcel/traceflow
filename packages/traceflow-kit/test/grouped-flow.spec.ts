import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
import {
  buildGroupedFlowGraph,
  buildGroupedFlowModel,
  findParentSpan,
  findSpanForCardId,
  getGroupedFlowMaxDepth,
  toggleGroupedDetail,
} from '../studio/src/modules/admin/page/flows/functions/grouped-flow.function';
import { groupConcurrentSpans } from '../studio/src/modules/admin/page/flows/functions/execution-flow.function';
import { buildGroupedFlowJson } from '../studio/src/modules/admin/page/flows/functions/grouped-flow-json.function';
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
    expect(model.branches.map((node) => node.span.spanId)).toEqual(['coordinator']);
    const represented = [model.entry!.span, ...model.branches.flatMap((node) => [node.span, ...descendants(node)])];
    expect(represented.map((item) => item.spanId).sort()).toEqual(data.spans.map((item) => item.spanId).sort());
    const graph = buildGroupedFlowGraph(data);
    expect(graph.nodes.filter((node) => node.type === 'groupedCard')).toHaveLength(3);
    expect((graph.nodes.find((node) => node.id === 'coordinator') as GroupedCardNode).data.node?.children.map((node) => node.span.spanId)).toEqual(['bath', 'income', 'treatment']);
    expect(graph.edges.filter((edge) => edge.source === 'grouped-entry').map((edge) => edge.target)).toEqual(['coordinator']);
    expect(graph.edges.filter((edge) => edge.source === 'coordinator').map((edge) => edge.target)).toEqual(['grouped-output']);
    expect(graph.edges.filter((edge) => edge.target === 'grouped-output')).toHaveLength(1);
  });

  it('keeps a single chain inside one process card and handles a root without children', () => {
    const data = trace([span('entry', null), span('service', 'entry'), span('repo', 'service', { type: 'table' })]);
    const model = buildGroupedFlowModel(data);
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
    expect(result.nodes.find((node) => node.id === 'coordinator')?.data).toMatchObject({ expanded: true, highlighted: true });
    expect(result.nodes.find((node) => node.id === 'coordinator')?.data.matchedIds).toEqual(new Set(['pet', 'bath', 'coordinator', 'controller']));
    expect(buildGroupedFlowGraph(data, new Set(), 'nothing').nodes.filter((node) => node.type === 'groupedCard' && node.data.highlighted)).toEqual([]);
  });

  it('repositions neighboring cards when an expanded card grows, and recenters entry and output', () => {
    const data = dashboard();
    for (const item of data.spans) if (item.parentSpanId === 'coordinator') item.parentSpanId = 'controller';
    data.spans = data.spans.filter((item) => item.spanId !== 'coordinator');
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
    expect(graph.edges.filter((edge) => edge.target === 'grouped-output').map((edge) => edge.source)).toEqual(['coordinator']);
    expect(graph.edges.find((edge) => edge.target === 'grouped-output')?.style?.stroke).toBe('#e4667d');
  });

  it('marks incomplete output connections without silently completing the trace', () => {
    const data = dashboard();
    data.isComplete = false;
    const graph = buildGroupedFlowGraph(data);
    expect(graph.nodes.find((node) => node.id === 'grouped-output')?.data.isComplete).toBe(false);
    expect(graph.edges.filter((edge) => edge.target === 'grouped-output').every((edge) => edge.style?.strokeDasharray)).toBe(true);
  });

  it('uses an HTTP request as an envelope and stacks a compact controller below it', () => {
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
    expect(model.branches.map((node) => node.span.spanId)).toEqual(['coordinator']);
    const baseline = buildGroupedFlowGraph(data);
    expect(baseline.nodes.filter((node) => node.type === 'groupedCard')).toHaveLength(4);
    const entry = baseline.nodes.find((node) => node.id === 'grouped-entry') as GroupedCardNode;
    const controller = baseline.nodes.find((node) => node.id === 'grouped-controller') as GroupedCardNode;
    expect(controller.data).toMatchObject({ kind: 'controller', node: { span: { spanId: 'controller' }, children: [{ span: { spanId: 'coordinator' }, children: [] }] } });
    expect(controller.position.x).toBe(entry.position.x);
    expect(controller.position.y).toBeGreaterThan(entry.position.y);
    expect(baseline.edges.find((edge) => edge.id === 'grouped-grouped-entry-grouped-controller')).toMatchObject({
      source: 'grouped-entry',
      target: 'grouped-controller',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    expect(baseline.edges.find((edge) => edge.target === 'coordinator')?.source).toBe('grouped-controller');
    const graph = buildGroupedFlowGraph(data, new Set(), '', new Map(), [{ ownerId: 'grouped-entry', spanId: 'auth' }]);
    const auth = graph.nodes.find((node) => node.id === 'detail-auth') as GroupedCardNode;
    const entryLane = graph.nodes.find((node) => node.id === 'lane-entry')!;
    const processLane = graph.nodes.find((node) => node.id === 'lane-process')!;
    const entryBoundary = entryLane.position.x + Number(entryLane.style?.width);
    expect(auth.data.node?.children.map((node) => node.span.spanId)).toEqual(['user']);
    expect(auth.position.x).toBeLessThan(graph.nodes.find((node) => node.id === 'coordinator')!.position.x);
    expect(auth.position.x + Number(auth.style?.width)).toBeLessThan(entryBoundary);
    expect(entryBoundary).toBe(processLane.position.x);
    expect(graph.edges.find((edge) => edge.id === 'inspect-grouped-entry-auth')).toMatchObject({ sourceHandle: 'step-auth', target: 'detail-auth' });

    const nestedGraph = buildGroupedFlowGraph(data, new Set(), '', new Map(), [
      { ownerId: 'grouped-entry', spanId: 'auth' },
      { ownerId: 'detail-auth', spanId: 'user' },
    ]);
    const user = nestedGraph.nodes.find((node) => node.id === 'detail-user') as GroupedCardNode;
    const nestedEntryLane = nestedGraph.nodes.find((node) => node.id === 'lane-entry')!;
    const nestedBoundary = nestedEntryLane.position.x + Number(nestedEntryLane.style?.width);
    expect(user.position.x + Number(user.style?.width)).toBeLessThan(nestedBoundary);
    expect(nestedBoundary).toBe(nestedGraph.nodes.find((node) => node.id === 'lane-process')?.position.x);
  });

  it('opens a validation detail card extra to the right of the entry card', () => {
    const data = trace([
      span('request', null, {
        input: {
          query: { startDate: '2024-01-01' },
          authorization: 'Bearer secret',
          headers: { authorization: 'Bearer secret' },
        },
        attributes: {
          'traceflow.http.request_root': true,
          'http.request.method': 'GET',
          'url.path': '/test',
        },
      }),
      span('controller', 'request', {
        type: 'controller',
        attributes: {
          'traceflow.controller.dto': 'TestDto',
          'traceflow.validation.schema': JSON.stringify({
            dtoName: 'TestDto',
            location: 'query',
            parameters: [{ name: 'startDate', type: 'string', required: true, rules: ['isDateString'] }],
          }),
        },
      }),
    ]);
    const graph = buildGroupedFlowGraph(data, new Set(), '', new Map(), [{ ownerId: 'grouped-entry', spanId: 'validation-TestDto' }]);
    const entry = graph.nodes.find((node) => node.id === 'grouped-entry') as GroupedCardNode;
    const valDetail = graph.nodes.find((node) => node.id === 'detail-validation-TestDto') as GroupedCardNode;
    expect(entry.data.validation?.span.spanId).toBe('validation-TestDto');
    expect(valDetail).toBeDefined();
    expect(valDetail.data.node?.span.type).toBe('validation');
    expect(valDetail.data.node?.span.name).toBe('Validación');
    expect(valDetail.data.node?.span.className).toBe('TestDto');
    expect(valDetail.data.node?.span.methodName).toBeNull();
    expect(valDetail.data.node?.span.input).toEqual({ startDate: '2024-01-01' });
    expect(valDetail.data.node?.span.output).toEqual({ valid: true });
    expect(JSON.stringify(valDetail.data.node?.span.input)).not.toContain('authorization');
    expect(graph.edges.find((edge) => edge.id === 'inspect-grouped-entry-validation-TestDto')).toMatchObject({
      source: 'grouped-entry',
      target: 'detail-validation-TestDto',
      sourceHandle: 'step-validation-TestDto',
      targetHandle: 'left',
    });
  });

  it('opens a validation detail card on a 400 error request without controller span', () => {
    const data = trace([
      span('request', null, {
        attributes: {
          'traceflow.http.request_root': true,
          'http.request.method': 'GET',
          'url.path': '/admin/dashboard/transactions',
          'http.response.status_code': 400,
          'traceflow.controller.dto': 'DashboardFilterDto',
          'traceflow.validation.schema': JSON.stringify({
            dtoName: 'DashboardFilterDto',
            location: 'query',
            parameters: [{ name: 'type', type: 'string', required: false, enum: ['all', 'bath', 'treatment', 'income'] }],
          }),
        },
        error: { name: 'ValidationError', message: 'type must be one of the following values: all, bath, treatment, income' },
        status: 'error',
      }),
    ]);
    const graph = buildGroupedFlowGraph(data, new Set(), '', new Map(), [{ ownerId: 'grouped-entry', spanId: 'validation-DashboardFilterDto' }]);
    const valDetail = graph.nodes.find((node) => node.id === 'detail-validation-DashboardFilterDto') as GroupedCardNode;
    expect(valDetail).toBeDefined();
    expect(valDetail.data.node?.span.type).toBe('validation');
    expect(valDetail.data.node?.span.status).toBe('error');
    expect(valDetail.data.node?.span.name).toBe('Validación');
  });

  it('keeps only direct services as collapsible controller steps instead of duplicating their process trees', () => {
    const data = trace([
      span('request', null, { type: 'http', attributes: { 'traceflow.http.request_root': true } }),
      span('controller', 'request', {
        name: 'Obtener transacciones del dashboard',
        type: 'controller',
        className: 'DashboardController',
        methodName: 'getTransactions',
        input: { startDate: '2024-01-01' },
        output: { data: [] },
      }),
      span('service', 'controller', { name: 'Dashboard transactions' }),
    ]);

    const graph = buildGroupedFlowGraph(data);
    const entry = graph.nodes.find((node) => node.id === 'grouped-entry') as GroupedCardNode;
    const controllerCard = graph.nodes.find((node) => node.id === 'grouped-controller') as GroupedCardNode;
    expect(entry.data.openedSpanId).toBeUndefined();
    expect(controllerCard.data).toMatchObject({
      kind: 'controller',
      detail: false,
      expanded: true,
      node: { span: { spanId: 'controller', type: 'controller' }, children: [{ span: { spanId: 'service' }, children: [] }] },
    });
    expect(graph.nodes.some((node) => node.id === 'detail-controller')).toBe(false);
    expect(controllerCard.position.x).toBe(entry.position.x);
    expect(controllerCard.position.y).toBeGreaterThan(entry.position.y);
    expect(graph.edges.find((edge) => edge.id === 'grouped-grouped-entry-grouped-controller')).toMatchObject({
      source: 'grouped-entry',
      target: 'grouped-controller',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    });
    expect(graph.edges.find((edge) => edge.target === 'service')?.source).toBe('grouped-controller');
    expect(findSpanForCardId('grouped-controller', data)?.spanId).toBe('controller');

    const collapsedController = buildGroupedFlowGraph(data, new Set(['grouped-controller'])).nodes.find((node) => node.id === 'grouped-controller') as GroupedCardNode;
    expect(collapsedController.data.expanded).toBe(false);
    expect(collapsedController.data.node?.children.map((node) => node.span.spanId)).toEqual(['service']);
  });

  it('calculates selectable hierarchy levels and starts cards at level 1', () => {
    const data = trace([
      span('request', null, { type: 'http', attributes: { 'traceflow.http.request_root': true } }),
      span('auth', 'request'),
      span('controller', 'request', { type: 'controller' }),
      span('service', 'controller'),
      span('method', 'service', { type: 'method' }),
      span('query', 'method', { type: 'table' }),
      span('transform', 'query', { type: 'transformation' }),
    ]);
    const graph = buildGroupedFlowGraph(data, new Set(), '', new Map(), [], new Map(), 1);

    expect(getGroupedFlowMaxDepth(data)).toBe(3);
    expect(graph.nodes.filter((node) => node.type === 'groupedCard').every((node) => node.data.visibleDepth === 1 && node.data.expanded === false)).toBe(true);

    const secondLevel = buildGroupedFlowGraph(data, new Set(), '', new Map(), [], new Map(), 2);
    expect(secondLevel.nodes.find((node) => node.id === 'service')?.data).toMatchObject({ visibleDepth: 2, expanded: true });
  });

  it('keeps pagination after the parallel queries inside the same service and in JSON', () => {
    const data = dashboard();
    data.spans.push(span('pagination', 'coordinator', { type: 'method', startedAt: '2026-01-01T00:00:00.011Z', endedAt: '2026-01-01T00:00:00.012Z' }));
    const service = buildGroupedFlowGraph(data).nodes.find((node) => node.id === 'coordinator') as GroupedCardNode;
    expect(groupConcurrentSpans(service.data.node!.children.map((node) => node.span)).map((group) => group.map((item) => item.spanId))).toEqual([['bath', 'income', 'treatment'], ['pagination']]);
    expect(service.data.node!.children[0]?.children[0]?.span.spanId).toBe('pet');
    const json = JSON.stringify(buildGroupedFlowJson(data));
    expect(json.match(/"spanId":"pet"/g)).toHaveLength(1);
    expect(json.match(/"spanId":"pagination"/g)).toHaveLength(1);
  });

  it('opens a complete card to the right with a dashed inspection edge, preserving execution edges', () => {
    const data = dashboard();
    const baseline = buildGroupedFlowGraph(data);
    const graph = buildGroupedFlowGraph(data, new Set(), '', new Map(), [{ ownerId: 'coordinator', spanId: 'bath' }]);
    const parent = graph.nodes.find((node) => node.id === 'coordinator')!;
    const detail = graph.nodes.find((node) => node.id === 'detail-bath') as GroupedCardNode;
    const output = graph.nodes.find((node) => node.id === 'grouped-output') as GroupedCardNode;
    expect(parent.data.openedSpanId).toBe('bath');
    expect(detail.data).toMatchObject({ detail: true, node: { span: { spanId: 'bath' } } });
    expect(detail.data.node!.children.map((node) => node.span.spanId)).toEqual(['pet']);
    expect(detail.position.x).toBeGreaterThan(parent.position.x + 328);
    expect(graph.edges.find((edge) => edge.id === 'inspect-coordinator-bath')).toMatchObject({ sourceHandle: 'step-bath', target: 'detail-bath', style: { strokeDasharray: '5 5' } });
    expect(graph.edges.filter((edge) => !edge.id.startsWith('inspect-')).map((edge) => [edge.source, edge.target])).toEqual(baseline.edges.map((edge) => [edge.source, edge.target]));
    expect(graph.edges.some((edge) => edge.source === 'detail-bath' && edge.target === 'grouped-output')).toBe(false);
    expect(graph.edges.find((edge) => edge.target === 'grouped-output')?.type).toBe('groupedReturn');
    expect(parent.data.showRightHandle).toBe(false);
    expect(output.data.showLeftHandle).toBe(false);
    expect(detail.data.showLeftHandle).toBe(true);
  });

  it('drills deeper, switches siblings and closes a branch without orphaned detail cards', () => {
    const first = toggleGroupedDetail([], 'coordinator', 'bath');
    const second = toggleGroupedDetail(first, 'detail-bath', 'pet');
    const graph = buildGroupedFlowGraph(dashboard(), new Set(), '', new Map(), second);
    expect(graph.nodes.filter((node) => node.data.detail).map((node) => node.id)).toEqual(['detail-bath', 'detail-pet']);
    expect(graph.edges.find((edge) => edge.target === 'detail-pet')?.source).toBe('detail-bath');
    expect(toggleGroupedDetail(second, 'coordinator', 'income')).toEqual([{ ownerId: 'coordinator', spanId: 'income' }]);
    expect(toggleGroupedDetail(second, 'coordinator', 'bath')).toEqual([]);
    expect(buildGroupedFlowGraph(dashboard(), new Set(), '', new Map(), [{ ownerId: 'coordinator', spanId: 'missing' }]).nodes.some((node) => node.data.detail)).toBe(false);
  });

  it('places the execution rail below tall details and keeps inspection identity when filtering', () => {
    const path = [{ ownerId: 'coordinator', spanId: 'bath' }];
    const dimensions = new Map([['detail-bath', { width: 328, height: 900 }]]);
    const graph = buildGroupedFlowGraph(dashboard(), new Set(), '', dimensions, path);
    const detail = graph.nodes.find((node) => node.id === 'detail-bath')!;
    const railY = graph.edges.find((edge) => edge.type === 'groupedReturn')!.data!.railY as number;
    expect(railY).toBeGreaterThan(detail.position.y + 900);
    expect(graph.bounds.height).toBeGreaterThan(railY);
    const filtered = buildGroupedFlowGraph(dashboard(), new Set(), 'pet', dimensions, path);
    expect(filtered.nodes.map((node) => node.id)).toEqual(graph.nodes.map((node) => node.id));
    expect(filtered.edges.map((edge) => edge.id)).toEqual(graph.edges.map((edge) => edge.id));
    expect(filtered.nodes.find((node) => node.id === 'detail-bath')?.data.highlighted).toBe(true);
  });

  it('creates an execution output node with output payload, duration, and status code in graph and json', () => {
    const data = trace([
      span('request', null, {
        name: 'GET /dashboard',
        type: 'http',
        attributes: {
          'traceflow.http.request_root': true,
          'http.response.status_code': 200,
        },
      }),
      span('controller', 'request', {
        type: 'controller',
        output: { data: [{ id: 1 }], total: 1 },
      }),
    ]);
    const graph = buildGroupedFlowGraph(data);
    const outputCard = graph.nodes.find((n) => n.id === 'grouped-output') as GroupedCardNode | undefined;
    expect(outputCard?.data.node?.span.spanId).toBe('output-result');
    expect(outputCard?.data.node?.span.output).toEqual({ data: [{ id: 1 }], total: 1 });

    const json = buildGroupedFlowJson(data) as Record<string, unknown>;
    expect(json.output).toEqual({
      durationMs: 10,
      status: 'success',
      statusCode: 200,
      isComplete: true,
      result: { data: [{ id: 1 }], total: 1 },
    });

    const entrySpan = findSpanForCardId('grouped-entry', data);
    expect(entrySpan?.spanId).toBe('request');

    const resultSpan = findSpanForCardId('grouped-output', data);
    expect(resultSpan?.spanId).toBe('output-result');
  });

  it('resolves the owner card as parent instead of jumping to unrelated root or auth spans', () => {
    const data = trace([
      span('request', null, { name: 'GET /dashboard', type: 'http', attributes: { 'traceflow.http.request_root': true } }),
      span('auth', 'request', { name: 'auth' }),
      span('controller', 'request', { type: 'controller' }),
      span('coordinator', 'controller', { name: 'Dashboard transactions' }),
      span('bath', 'coordinator', { name: 'Consultar baños' }),
      span('pet', 'bath', { name: 'SELECT bath' }),
    ]);

    const bathSpan = data.spans.find((s) => s.spanId === 'bath')!;
    const parentOfBath = findParentSpan(bathSpan, data, 'coordinator');
    expect(parentOfBath?.spanId).toBe('coordinator');
    expect(parentOfBath?.name).toBe('Dashboard transactions');

    const authSpan = data.spans.find((s) => s.spanId === 'auth')!;
    const parentOfAuth = findParentSpan(authSpan, data, 'grouped-entry');
    expect(parentOfAuth?.spanId).toBe('request');

    const petSpan = data.spans.find((s) => s.spanId === 'pet')!;
    const parentOfPet = findParentSpan(petSpan, data, 'detail-bath');
    expect(parentOfPet?.spanId).toBe('bath');
  });
});
