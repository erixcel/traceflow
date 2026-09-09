import { SpanStatusCode } from '@opentelemetry/api';
import type { HrTime } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-node';
import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS, TRACEFLOW_PROTOCOL_VERSION } from '../../../settings/constants';
import { TRACEFLOW_NODE_TYPES, TRACEFLOW_RESERVED_ATTRIBUTES } from '../constants';
import { normalizeAttributes, parseJsonSerializable } from './json.function';
import { normalizeLabels } from './labels.function';
import type { TraceFlowNodeType, TraceFlowStatus } from '../types/protocol.type';
import type { TraceFlowErrorDto, TraceFlowSpanDto } from '../interfaces/protocol.interface';

export function hrTimeToMilliseconds(value: HrTime): number {
  return value[0] * 1_000 + value[1] / 1_000_000;
}

export function mapSpanStatus(code: SpanStatusCode): TraceFlowStatus {
  if (code === SpanStatusCode.OK) {
    return 'success';
  }

  if (code === SpanStatusCode.ERROR) {
    return 'error';
  }

  return 'unset';
}

export function readableSpanToTraceFlowSpan(span: ReadableSpan, fallbackServiceName: string): TraceFlowSpanDto {
  const context = span.spanContext();
  const serviceName = readStringAttribute(span.resource.attributes['service.name']);
  const attributes = normalizeAttributes(Object.fromEntries(Object.entries(span.attributes).filter(([key]) => !TRACEFLOW_RESERVED_ATTRIBUTES.has(key))));
  // ISO dates truncate sub-millisecond timing. Keep precise intervals so short
  // sibling calls can be distinguished from genuinely overlapping operations.
  attributes['traceflow.timing.startUnixMs'] = hrTimeToMilliseconds(span.startTime);
  attributes['traceflow.timing.endUnixMs'] = hrTimeToMilliseconds(span.endTime);
  const input = parseJsonSerializable(span.attributes[TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input]);
  const output = parseJsonSerializable(span.attributes[TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output]);

  return {
    protocolVersion: TRACEFLOW_PROTOCOL_VERSION,
    serviceName: serviceName ?? fallbackServiceName,
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: span.parentSpanContext?.spanId ?? null,
    name: span.name,
    type: readNodeType(span.attributes[TRACEFLOW_ATTRIBUTE_KEYS.nodeType]),
    labels: normalizeLabels(span.attributes[TRACEFLOW_ATTRIBUTE_KEYS.labels]),
    className: readStringAttribute(span.attributes[TRACEFLOW_ATTRIBUTE_KEYS.codeClass]),
    methodName: readStringAttribute(span.attributes[TRACEFLOW_ATTRIBUTE_KEYS.codeFunction]),
    description: readStringAttribute(span.attributes[TRACEFLOW_ATTRIBUTE_KEYS.nodeDescription]),
    startedAt: new Date(hrTimeToMilliseconds(span.startTime)).toISOString(),
    endedAt: new Date(hrTimeToMilliseconds(span.endTime)).toISOString(),
    durationMs: roundDuration(hrTimeToMilliseconds(span.duration)),
    status: mapSpanStatus(span.status.code),
    ...(input === undefined ? {} : { input }),
    ...(output === undefined ? {} : { output }),
    attributes,
    error: readException(span),
  };
}

function readStringAttribute(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNodeType(value: unknown): TraceFlowNodeType {
  return typeof value === 'string' && TRACEFLOW_NODE_TYPES.has(value as TraceFlowNodeType) ? (value as TraceFlowNodeType) : 'custom';
}

function roundDuration(value: number): number {
  return Math.round(Math.max(0, value) * 1_000) / 1_000;
}

function readException(span: ReadableSpan): TraceFlowErrorDto | null {
  const event = span.events.find((item) => item.name === 'exception');

  if (!event) {
    if (span.status.code === SpanStatusCode.ERROR && span.status.message) {
      return {
        name: 'Error',
        message: span.status.message,
      };
    }

    return null;
  }

  const name = readStringAttribute(event.attributes?.['exception.type']) ?? 'Error';
  const message = readStringAttribute(event.attributes?.['exception.message']) ?? span.status.message ?? 'Error sin mensaje';
  const stack = readStringAttribute(event.attributes?.['exception.stacktrace']);

  return stack ? { name, message, stack } : { name, message };
}
