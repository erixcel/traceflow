import { Span, SpanStatusCode } from '@opentelemetry/api';
import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS } from '../../../settings/constants';
import { normalizeAttributes, toJsonSerializable } from './json.function';
import { normalizeLabels } from './labels.function';
import type { TraceSpanOptions } from '../interfaces/trace-span.interface';
import { TRACEFLOW_TRACER } from '../constants/trace-span.constant';
import { monotonicUnixTime } from './monotonic-time.function';

export function runTraceSpan<T>(name: string, operation: (span: Span) => T, options: TraceSpanOptions = {}, input?: unknown): T {
  return TRACEFLOW_TRACER.startActiveSpan(name, { startTime: monotonicUnixTime() }, (span) => {
    if (options.attributes) {
      span.setAttributes(normalizeAttributes(options.attributes));
    }

    span.setAttribute('traceflow.timing.clock', 'monotonic');

    setCapturedAttribute(span, options.capture?.input, input, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input);

    const labels = normalizeLabels(options.labels);
    if (labels.length > 0) {
      span.setAttribute(TRACEFLOW_ATTRIBUTE_KEYS.labels, labels);
    }

    span.setAttribute(TRACEFLOW_ATTRIBUTE_KEYS.nodeType, options.type ?? 'method');

    if (options.className) {
      span.setAttribute(TRACEFLOW_ATTRIBUTE_KEYS.codeClass, options.className);
    }

    if (options.methodName) {
      span.setAttribute(TRACEFLOW_ATTRIBUTE_KEYS.codeFunction, options.methodName);
    }

    if (options.description) {
      span.setAttribute(TRACEFLOW_ATTRIBUTE_KEYS.nodeDescription, options.description);
    }

    try {
      const result = operation(span);

      if (isPromiseLike(result)) {
        return Promise.resolve(result).then(
          (value) => completeSpan(span, value, options),
          (error: unknown) => failSpan(span, error),
        ) as T;
      }

      return completeSpan(span, result, options);
    } catch (error: unknown) {
      return failSpan(span, error);
    }
  });
}

function completeSpan<T>(span: Span, value: T, options: TraceSpanOptions): T {
  setCapturedAttribute(span, options.capture?.output, value, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output);
  span.setStatus({ code: SpanStatusCode.OK });
  span.end(monotonicUnixTime());
  return value;
}

function setCapturedAttribute(span: Span, capture: boolean | undefined, value: unknown, key: string): void {
  const serialized = capture === false ? undefined : toJsonSerializable(value);

  if (serialized !== undefined) {
    span.setAttribute(key, JSON.stringify(serialized));
  }
}

function failSpan(span: Span, error: unknown): never {
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  span.recordException(normalizedError, monotonicUnixTime());
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: normalizedError.message,
  });
  span.end(monotonicUnixTime());
  throw error;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';
}
