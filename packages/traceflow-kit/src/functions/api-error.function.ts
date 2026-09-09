import type { TraceFlowApiErrorDto } from 'traceflow/protocol';

export function createApiError(statusCode: number, code: string, message: string, details?: string[]): TraceFlowApiErrorDto {
  return {
    statusCode,
    code,
    message,
    ...(details ? { details } : {}),
  };
}
