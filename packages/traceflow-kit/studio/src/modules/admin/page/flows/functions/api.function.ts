import type { TraceFlowApiErrorDto, TraceFlowTraceDto, TraceFlowTraceSummaryDto } from 'traceflow/protocol';

export async function listTraces(): Promise<TraceFlowTraceSummaryDto[]> {
  return request<TraceFlowTraceSummaryDto[]>('/api/v1/traces?limit=200');
}

export async function getTrace(traceId: string): Promise<TraceFlowTraceDto> {
  return request<TraceFlowTraceDto>(`/api/v1/traces/${encodeURIComponent(traceId)}`);
}

export async function clearTraces(): Promise<void> {
  await request<void>('/api/v1/traces', { method: 'DELETE' });
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, headers: { Accept: 'application/json', ...init?.headers } });

  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;

    try {
      const error = (await response.json()) as TraceFlowApiErrorDto;
      message = error.message;
    } catch {
      // El servidor puede responder sin JSON mientras termina de iniciar.
    }

    throw new Error(message);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
