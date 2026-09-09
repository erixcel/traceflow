import type { TraceFlowDefinitionDto, TraceFlowSpanDto } from 'traceflow/protocol';

export function findMatchingFlow(spans: readonly TraceFlowSpanDto[], flows: readonly TraceFlowDefinitionDto[]): TraceFlowDefinitionDto | null {
  const rootSpan = findTraceEntrySpan(spans);

  if (!rootSpan?.className || !rootSpan.methodName) {
    return null;
  }

  const matchingFlow = flows.find((flow) => {
    const rootNode = flow.nodes.find((node) => node.id === flow.rootNodeId);
    return rootNode?.className === rootSpan.className && rootNode.methodName === rootSpan.methodName;
  });

  return matchingFlow ? structuredClone(matchingFlow) : null;
}

export function findTraceEntrySpan(spans: readonly TraceFlowSpanDto[]): TraceFlowSpanDto | undefined {
  const root = spans.find((span) => span.parentSpanId === null);
  if (root?.attributes['traceflow.http.request_root'] !== true) return root ?? spans[0];

  const byId = new Map(spans.map((span) => [span.spanId, span]));
  return (
    spans.find((span) => {
      if (span.type !== 'controller') return false;
      let parent = span.parentSpanId ? byId.get(span.parentSpanId) : undefined;
      while (parent && parent.spanId !== root.spanId) parent = parent.parentSpanId ? byId.get(parent.parentSpanId) : undefined;
      return parent?.spanId === root.spanId;
    }) ?? root
  );
}

export function calculateTraceDuration(startedAt: string | undefined, endedAt: string | undefined): number {
  if (!startedAt || !endedAt) {
    return 0;
  }

  return Math.max(0, Date.parse(endedAt) - Date.parse(startedAt));
}
