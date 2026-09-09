import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
import {
  buildJourney,
  descendants,
  getInputFields,
  getOutputSummary,
  getResources,
  getSearchIds,
  getUnobservedNodes,
  initialExpandedIds,
} from '../studio/src/modules/admin/page/flows/functions/journey.function';
import { groupConcurrentSpans } from '../studio/src/modules/admin/page/flows/functions/execution-flow.function';
import { buildTraceGraph } from '../studio/src/modules/admin/page/flows/functions/graph.function';
import { formatMethodLabel } from '../studio/src/modules/admin/page/flows/functions/format.function';

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

describe('execution journey', () => {
  it('retains the controller and repeated calls exactly once regardless of arrival order', () => {
    const data = trace([
      span('repo-2', 'service', { name: 'pet', type: 'table' }),
      span('service', 'controller'),
      span('repo-1', 'service', { name: 'pet', type: 'table' }),
      span('controller', null, { type: 'controller' }),
    ]);
    const roots = buildJourney(data);
    expect(roots.map((node) => node.span.spanId)).toEqual(['controller']);
    expect(descendants(roots[0]!)).toHaveLength(3);
    expect(getResources(data.spans)).toEqual([{ name: 'pet', calls: 2, errors: 0 }]);
    const graph = buildTraceGraph(data);
    expect(graph.nodes).toHaveLength(4);
    expect(graph.nodes.some((node) => node.id === 'controller')).toBe(true);
  });

  it('counts each joined table once per query while retaining repeated queries and their errors', () => {
    const data = trace([
      span('service', null),
      span('query-1', 'service', {
        name: 'SELECT bath · pet',
        type: 'table',
        attributes: { 'traceflow.db.query': true, 'db.tables': ['bath', 'pet', 'bath'], 'db.operation.name': 'SELECT', 'traceflow.db.tables.status': 'parsed' },
      }),
      span('query-2', 'service', {
        name: 'SELECT bath · pet',
        type: 'table',
        status: 'error',
        attributes: { 'traceflow.db.query': true, 'db.tables': ['bath', 'pet'], 'db.operation.name': 'SELECT', 'traceflow.db.tables.status': 'parsed' },
      }),
    ]);
    expect(getResources(data.spans)).toEqual([
      { name: 'bath', calls: 2, errors: 1 },
      { name: 'pet', calls: 2, errors: 1 },
    ]);
    expect(buildTraceGraph(data).nodes).toHaveLength(3);
  });

  it('does not invent tables from names or legacy attributes for queries with unavailable or empty tables', () => {
    const queries = [
      span('unknown', null, {
        name: 'SELECT unknown',
        type: 'table',
        attributes: { 'traceflow.db.query': true, 'db.tables': [], 'db.sql.table': 'legacy hint', 'traceflow.db.tables.status': 'unavailable' },
      }),
      span('no-table', null, { name: 'SELECT 1', type: 'table', attributes: { 'traceflow.db.query': true, 'db.tables': [], 'traceflow.db.tables.status': 'parsed' } }),
      span('missing-table', null, { name: 'SELECT', type: 'table', attributes: { 'traceflow.db.query': true } }),
    ];
    expect(getResources(queries)).toEqual([]);
  });

  it('searches every joined table and its operation even when the query label omits them', () => {
    const roots = buildJourney(
      trace([
        span('controller', null),
        span('service', 'controller'),
        span('query', 'service', {
          name: 'Load dashboard',
          type: 'table',
          attributes: { 'traceflow.db.query': true, 'db.tables': ['bath', 'public.pet'], 'db.operation.name': 'SELECT' },
        }),
        span('unrelated', 'controller'),
      ]),
    );
    expect([...getSearchIds(roots, 'public.pet')].sort()).toEqual(['controller', 'query', 'service']);
    expect([...getSearchIds(roots, 'select')].sort()).toEqual(['controller', 'query', 'service']);
  });

  it('formats query operations without a missing class prefix', () => {
    expect(formatMethodLabel(span('query', null, { className: null, methodName: 'SELECT' }))).toBe('SELECT');
    expect(formatMethodLabel(span('query', null, { className: null, methodName: null, name: 'Query' }))).toBe('Query');
    expect(formatMethodLabel(span('load', null))).toBe('Example.load');
  });

  it('keeps orphan spans and malformed cycles visible without recursing forever', () => {
    const roots = buildJourney(trace([span('orphan', 'missing'), span('a', 'b'), span('b', 'a'), span('self', 'self')]));
    expect(roots).toHaveLength(4);
    expect(roots.flatMap(descendants)).toEqual([]);
  });

  it('opens the ancestors of a failure and keeps propagated errors as errors in the map', () => {
    const error = { name: 'Error', message: 'Database unavailable' };
    const data = trace([
      span('controller', null, { type: 'controller', status: 'error', error }),
      span('service', 'controller', { status: 'error', error }),
      span('method', 'service', { type: 'method', status: 'error', error }),
    ]);
    expect([...initialExpandedIds(buildJourney(data))]).toEqual(expect.arrayContaining(['controller', 'service']));
    expect(buildTraceGraph(data).nodes.every((node) => node.data.state === 'error')).toBe(true);
  });

  it('searches nested calls and includes their ancestors without unrelated branches', () => {
    const roots = buildJourney(trace([span('controller', null), span('bath', 'controller'), span('pet', 'bath', { className: 'PetRepository' }), span('income', 'controller')]));
    expect([...getSearchIds(roots, 'petrepository')].sort()).toEqual(['bath', 'controller', 'pet']);
    expect(getSearchIds(roots, 'not found').size).toBe(0);
  });

  it('does not mistake an uncaptured response for an empty response', () => {
    expect(getOutputSummary(span('entry', null))).toBe('Salida no capturada');
    expect(getOutputSummary(span('entry', null, { output: { data: [], total: 0 } }))).toBe('0 elementos devueltos · 0 en total');
    expect(getOutputSummary(span('entry', null, { output: null }))).toBe('null');
    expect(getOutputSummary(span('entry', null, { status: 'error', error: { name: 'Error', message: 'Unavailable' } }))).toBe('Unavailable');
  });

  it('surfaces DTO fields including false and zero and supports legacy capture', () => {
    expect(getInputFields(span('entry', null, { input: { filter: { page: 0, enabled: false } } }))).toEqual([
      ['page', 0],
      ['enabled', false],
    ]);
    expect(getInputFields(span('entry', null, { attributes: { 'traceflow.request.filter': '{"page":2}' } }))).toEqual([['page', 2]]);
  });

  it('shows unobserved declared steps separately and preserves repeated definitions', () => {
    const data = trace([span('entry', null)]);
    data.flow = {
      id: 'flow',
      name: 'Flow',
      rootNodeId: 'entry',
      nodes: [
        { id: 'entry', name: 'Entry', className: 'Example', methodName: 'entry', type: 'controller' },
        { id: 'second', name: 'Repeated', className: 'Example', methodName: 'entry', type: 'service' },
      ],
      edges: [],
    };
    expect(getUnobservedNodes(data).map((node) => node.id)).toEqual(['second']);
  });

  it('distinguishes overlapping calls from sequential calls within the same millisecond', () => {
    const precise = (id: string, start: number, end: number) => span(id, 'parent', { attributes: { 'traceflow.timing.startUnixMs': start, 'traceflow.timing.endUnixMs': end } });
    const groups = groupConcurrentSpans([precise('second', 1000.2, 1000.4), precise('first', 1000.1, 1000.3), precise('third', 1000.4, 1000.5)]);
    expect(groups.map((group) => group.map((item) => item.spanId))).toEqual([['first', 'second'], ['third']]);
  });

  it('uses ISO intervals for legacy traces', () => {
    const groups = groupConcurrentSpans([span('a', null), span('b', null), span('c', null, { startedAt: '2026-01-01T00:00:00.010Z', endedAt: '2026-01-01T00:00:00.020Z' })]);
    expect(groups.map((group) => group.length)).toEqual([2, 1]);
  });
});
