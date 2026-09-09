import type { TraceFlowDefinitionDto, TraceFlowSpanDto } from 'traceflow/protocol';
import { findMatchingFlow, findTraceEntrySpan } from '../src/functions/trace.function';
import { TraceStore } from '../src/modules/traces/trace.store';

function span(id: string, parentSpanId: string | null, overrides: Partial<TraceFlowSpanDto> = {}): TraceFlowSpanDto {
  return {
    protocolVersion: 1,
    serviceName: 'test',
    traceId: '1'.repeat(32),
    spanId: id,
    parentSpanId,
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

describe('trace identity', () => {
  it('uses the controller inside an HTTP request root for display and flow matching', () => {
    const spans = [
      span('request', null, { name: 'GET /admin/dashboard/transactions', type: 'custom', className: null, methodName: null, attributes: { 'traceflow.http.request_root': true } }),
      span('auth', 'request', { name: 'auth' }),
      span('controller', 'request', { name: 'Obtener transacciones del dashboard', type: 'controller', className: 'DashboardController', methodName: 'getTransactions' }),
    ];
    const flow: TraceFlowDefinitionDto = {
      id: 'dashboard',
      name: 'Dashboard',
      rootNodeId: 'entry',
      nodes: [{ id: 'entry', name: 'Entrada', className: 'DashboardController', methodName: 'getTransactions', type: 'controller' }],
      edges: [],
    };

    expect(findTraceEntrySpan(spans)?.spanId).toBe('controller');
    expect(findMatchingFlow(spans, [flow])).toEqual(flow);
    const store = new TraceStore();
    store.addSpans(spans, [flow]);
    expect(store.getLatestTrace()).toMatchObject({ rootName: 'Obtener transacciones del dashboard', flow });
  });
});
