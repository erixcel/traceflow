import { toJsonSerializable } from 'traceflow/protocol';
import type { TraceFlowDefinitionDto, TraceFlowSpanDto } from 'traceflow/protocol';
import type { SpanBatch } from '../modules/traces/validation/span-batch.schema';

export function normalizeTraceSpans(spans: SpanBatch['spans']): TraceFlowSpanDto[] {
  return spans.map((span) => {
    const { input, output, ...spanWithoutCapture } = span;
    const normalizedInput = toJsonSerializable(input);
    const normalizedOutput = toJsonSerializable(output);

    return {
      ...spanWithoutCapture,
      ...(normalizedInput === undefined ? {} : { input: normalizedInput }),
      ...(normalizedOutput === undefined ? {} : { output: normalizedOutput }),
      error: span.error
        ? span.error.stack
          ? {
              name: span.error.name,
              message: span.error.message,
              stack: span.error.stack,
            }
          : { name: span.error.name, message: span.error.message }
        : null,
    };
  });
}

export function normalizeTraceFlows(flows: NonNullable<SpanBatch['flows']>): TraceFlowDefinitionDto[] {
  return flows.map((flow) => ({
    id: flow.id,
    name: flow.name,
    rootNodeId: flow.rootNodeId,
    nodes: flow.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      className: node.className,
      methodName: node.methodName,
      ...(node.description === undefined ? {} : { description: node.description }),
    })),
    edges: flow.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      ...(edge.parallel === undefined ? {} : { parallel: edge.parallel }),
    })),
  }));
}
