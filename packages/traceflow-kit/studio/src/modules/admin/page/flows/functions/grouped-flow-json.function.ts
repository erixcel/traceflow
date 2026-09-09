import type { TraceFlowTraceDto } from 'traceflow/protocol';
import type { JourneyNode } from '../interfaces/journey.interface';
import type { JsonValue } from '../types/json.type';
import { buildGroupedFlowModel } from './grouped-flow.function';

export function buildGroupedFlowJson(trace: TraceFlowTraceDto): JsonValue {
  const model = buildGroupedFlowModel(trace);
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
      coordinators: model.coordinators.map(journeyValue),
      groups: model.groups.map((group, index) => ({
        index: index + 1,
        concurrent: group.length > 1,
        nodes: group.map(journeyValue),
      })),
    },
    output: {
      status: trace.status,
      isComplete: trace.isComplete,
      durationMs: trace.durationMs,
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
