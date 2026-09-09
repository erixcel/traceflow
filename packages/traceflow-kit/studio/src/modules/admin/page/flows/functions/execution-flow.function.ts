import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
import type { ExecutionFlow, ExecutionFlowEdge, SpanInterval } from '../interfaces/execution-flow.interface';

export function hasMonotonicTiming(spans: TraceFlowSpanDto[]): boolean {
  return (
    spans.length > 0 && spans.every((span) => span.attributes['traceflow.timing.clock'] === 'monotonic' || (span.parentSpanId === null && span.attributes['traceflow.http.request_root'] === true))
  );
}

export function buildExecutionFlow(trace: TraceFlowTraceDto): ExecutionFlow {
  const spanIds = new Set(trace.spans.map((span) => span.spanId));
  const childrenByParent = new Map<string | null, TraceFlowSpanDto[]>();

  for (const span of trace.spans) {
    const parentId = span.parentSpanId && spanIds.has(span.parentSpanId) ? span.parentSpanId : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(span);
    childrenByParent.set(parentId, siblings);
  }

  const edges: ExecutionFlowEdge[] = [];
  const edgeIds = new Set<string>();
  const stepLabels = new Map<string, string>();
  const roots = sortSpans(childrenByParent.get(null) ?? []);

  roots.forEach((root, index) => {
    stepLabels.set(root.spanId, roots.length === 1 ? 'Inicio' : `Inicio ${toLetter(index)}`);
    processSpan(root, '', childrenByParent, stepLabels, edges, edgeIds);
  });

  return { edges, stepLabels };
}

export function groupConcurrentSpans(spans: TraceFlowSpanDto[]): TraceFlowSpanDto[][] {
  const intervals = sortSpans(spans).map(toInterval);
  const groups: SpanInterval[][] = [];
  let currentGroup: SpanInterval[] = [];
  let currentGroupEnd = Number.NEGATIVE_INFINITY;

  for (const interval of intervals) {
    if (currentGroup.length === 0 || interval.startedAtMs < currentGroupEnd) {
      currentGroup.push(interval);
      currentGroupEnd = Math.max(currentGroupEnd, interval.endedAtMs);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [interval];
    currentGroupEnd = interval.endedAtMs;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups.map((group) => group.map((interval) => interval.span));
}

function processSpan(
  parent: TraceFlowSpanDto,
  prefix: string,
  childrenByParent: Map<string | null, TraceFlowSpanDto[]>,
  stepLabels: Map<string, string>,
  edges: ExecutionFlowEdge[],
  edgeIds: Set<string>,
): string[] {
  const groups = groupConcurrentSpans(childrenByParent.get(parent.spanId) ?? []);

  if (groups.length === 0) {
    return [parent.spanId];
  }

  let previousTerminals = [parent.spanId];

  groups.forEach((group, groupIndex) => {
    const baseLabel = prefix ? `${prefix}.${groupIndex + 1}` : String(groupIndex + 1);
    const isParallel = group.length > 1;
    const connectsParallelBranch = isParallel || previousTerminals.length > 1;

    for (const [childIndex, child] of group.entries()) {
      const childLabel = isParallel ? `${baseLabel}${toLetter(childIndex)}` : baseLabel;
      stepLabels.set(child.spanId, childLabel);
      previousTerminals.forEach((source) => addEdge(source, child.spanId, connectsParallelBranch, edges, edgeIds));
    }

    previousTerminals = group.flatMap((child) => processSpan(child, stepLabels.get(child.spanId) ?? baseLabel, childrenByParent, stepLabels, edges, edgeIds));
  });

  return previousTerminals;
}

function addEdge(source: string, target: string, parallel: boolean, edges: ExecutionFlowEdge[], edgeIds: Set<string>): void {
  const edgeId = `${source}-${target}`;
  if (edgeIds.has(edgeId)) {
    return;
  }

  edgeIds.add(edgeId);
  edges.push({ source, target, parallel });
}

function sortSpans(spans: TraceFlowSpanDto[]): TraceFlowSpanDto[] {
  return [...spans].sort((left, right) => spanStartMs(left) - spanStartMs(right));
}

export function spanStartMs(span: TraceFlowSpanDto): number {
  const precise = span.attributes['traceflow.timing.startUnixMs'];
  return typeof precise === 'number' && Number.isFinite(precise) ? precise : Date.parse(span.startedAt);
}

function toInterval(span: TraceFlowSpanDto): SpanInterval {
  const startedAtMs = spanStartMs(span);
  const preciseEnd = span.attributes['traceflow.timing.endUnixMs'];
  const parsedEnd = typeof preciseEnd === 'number' && Number.isFinite(preciseEnd) ? preciseEnd : Date.parse(span.endedAt);
  const endedAtMs = Number.isFinite(parsedEnd) ? parsedEnd : startedAtMs + span.durationMs;
  return { span, startedAtMs, endedAtMs: Math.max(startedAtMs, endedAtMs) };
}

function toLetter(index: number): string {
  return String.fromCharCode(65 + index);
}
