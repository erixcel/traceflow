import type { TraceFlowTraceDto, TraceFlowTraceSummaryDto } from 'traceflow/protocol';
import { useTraceStore } from '../studio/src/modules/admin/page/flows/stores/trace.store';

function trace(traceId: string, updatedAt = '2026-01-01T00:00:00.000Z'): TraceFlowTraceDto {
  return {
    traceId,
    serviceName: 'test',
    rootName: traceId,
    startedAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    durationMs: 10,
    status: 'success',
    isComplete: true,
    spanCount: 0,
    spans: [],
    flow: null,
  };
}

function jsonResponse(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

describe('trace studio state', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    useTraceStore.setState({
      traces: [],
      traceCache: {},
      activeTraceId: null,
      activeTrace: null,
      selectedSpan: null,
      connectionStatus: 'disconnected',
      loading: false,
      error: null,
      query: '',
      statusFilter: 'all',
      activeTab: 'input',
    });
  });

  it('restores a cached trace immediately without requesting it again', async () => {
    const previous = trace('previous');
    const current = trace('current');
    const fetchMock = jest.spyOn(global, 'fetch');
    useTraceStore.setState({ activeTraceId: previous.traceId, activeTrace: previous, traceCache: { previous, current } });

    await useTraceStore.getState().selectTrace(current.traceId);

    expect(useTraceStore.getState()).toMatchObject({ activeTraceId: current.traceId, activeTrace: current });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never displays the previously selected trace while a new one loads', async () => {
    const previous = trace('previous');
    const current = trace('current');
    let resolveRequest: ((response: Response) => void) | undefined;
    jest.spyOn(global, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    useTraceStore.setState({ activeTraceId: previous.traceId, activeTrace: previous, traceCache: { previous } });

    const selection = useTraceStore.getState().selectTrace(current.traceId);
    expect(useTraceStore.getState()).toMatchObject({ activeTraceId: current.traceId, activeTrace: null });

    resolveRequest?.(jsonResponse(current));
    await selection;
    expect(useTraceStore.getState()).toMatchObject({ activeTrace: current, traceCache: { previous, current } });
  });

  it('reuses the cached detail when the list reports the same updatedAt', async () => {
    const current = trace('current');
    const summaries: TraceFlowTraceSummaryDto[] = [current];
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(summaries));
    useTraceStore.setState({ activeTraceId: current.traceId, activeTrace: current, traceCache: { current } });

    await useTraceStore.getState().refreshTraces();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/traces?limit=200', expect.any(Object));
    expect(useTraceStore.getState().activeTrace).toBe(current);
  });
});
