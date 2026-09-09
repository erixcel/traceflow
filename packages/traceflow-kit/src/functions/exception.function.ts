import { HttpException, HttpStatus } from '@nestjs/common';
import type { TraceFlowApiErrorDto } from 'traceflow/protocol';

export function resolveStatusCode(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  if (exception && typeof exception === 'object' && 'code' in exception && exception.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return HttpStatus.PAYLOAD_TOO_LARGE;
  }

  if (exception && typeof exception === 'object' && 'statusCode' in exception && typeof exception.statusCode === 'number') {
    return exception.statusCode;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

export function isApiError(value: unknown): value is TraceFlowApiErrorDto {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    'code' in value &&
    'message' in value &&
    typeof value.statusCode === 'number' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  );
}
