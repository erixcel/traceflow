import type { TraceFlowSpanDto } from 'traceflow/protocol';
import type { TraceDataSections } from '../interfaces/trace-data.interface';
import type { JsonValue } from '../types/json.type';
import { parseJsonValue } from './json.function';

export function getTraceDataSections(span: TraceFlowSpanDto): TraceDataSections {
  const legacyInput: Array<[string, JsonValue]> = [];
  const legacyOutput: Array<[string, JsonValue]> = [];
  const attributes: Record<string, JsonValue> = {};

  for (const [key, value] of Object.entries(span.attributes)) {
    if (key.startsWith('traceflow.request.')) {
      legacyInput.push([key, parseJsonValue(value)]);
    } else if (key.startsWith('traceflow.response.')) {
      legacyOutput.push([key, parseJsonValue(value)]);
    } else {
      attributes[key] = parseJsonValue(value);
    }
  }

  const input = span.input === undefined ? collapseCapturedValues(legacyInput, 'traceflow.request.') : parseJsonValue(span.input);
  const output = span.output === undefined ? collapseCapturedValues(legacyOutput, 'traceflow.response.') : parseJsonValue(span.output);
  return { ...(input === undefined ? {} : { input }), ...(output === undefined ? {} : { output }), attributes };
}

function collapseCapturedValues(values: ReadonlyArray<readonly [string, JsonValue]>, prefix: string): JsonValue | undefined {
  if (values.length === 0) {
    return undefined;
  }

  if (values.length === 1) {
    return values[0]?.[1];
  }

  return Object.fromEntries(values.map(([key, value]) => [key.slice(prefix.length) || 'value', value]));
}
