import type { TraceFlowTraceDto } from 'traceflow/protocol';
import type { JourneyNode } from '../interfaces/journey.interface';
import type { JsonValue } from '../types/json.type';
import { buildGroupedFlowModel } from './grouped-flow.function';

export function buildGroupedFlowJson(trace: TraceFlowTraceDto): JsonValue {
  const model = buildGroupedFlowModel(trace);
  const controllerSpan = model.entry?.span;
  const rawOutput =
    controllerSpan?.output ??
    controllerSpan?.attributes?.['traceflow.capture.output'] ??
    trace.spans.find((s) => s.output !== undefined || s.attributes?.['traceflow.capture.output'])?.output ??
    trace.spans.find((s) => s.attributes?.['traceflow.capture.output'])?.attributes?.['traceflow.capture.output'];
  let result: JsonValue = null;
  if (typeof rawOutput === 'string') {
    try {
      result = JSON.parse(rawOutput) as JsonValue;
    } catch {
      result = rawOutput;
    }
  } else if (rawOutput !== undefined) {
    result = rawOutput as JsonValue;
  }

  const statusCode = (trace.spans.find((s) => s.attributes?.['http.response.status_code'])?.attributes?.['http.response.status_code'] as number) ?? (trace.status === 'error' ? 500 : 200);

  return {
    trace: {
      traceId: trace.traceId,
      serviceName: trace.serviceName,
      name: trace.rootName,
      status: trace.status,
      isComplete: trace.isComplete,
      durationMs: trace.durationMs,
      spanCount: trace.spanCount,
    },
    input: {
      request: model.request ? spanValue(model.request) : null,
      controller: model.entry ? spanValue(model.entry) : null,
      beforeController: model.preconditions.map(journeyValue),
    },
    process: {
      groups: model.groups.map((group, index) => ({
        index: index + 1,
        concurrent: group.length > 1,
        nodes: group.map(journeyValue),
      })),
    },
    output: {
      status: trace.status,
      statusCode,
      isComplete: trace.isComplete,
      durationMs: trace.durationMs,
      result,
    },
    unobserved: model.unobserved as unknown as JsonValue,
  };
}

function journeyValue(node: JourneyNode): JsonValue {
  return {
    span: spanValue(node),
    children: node.children.map(journeyValue),
  };
}

function spanValue(node: JourneyNode): JsonValue {
  return node.span as unknown as JsonValue;
}
