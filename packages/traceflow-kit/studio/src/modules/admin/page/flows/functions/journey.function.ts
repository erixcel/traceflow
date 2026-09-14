import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
import type { JsonValue } from '../types/json.type';
import { getTraceDataSections } from './trace-data.function';
import { spanStartMs } from './execution-flow.function';
import type { JourneyNode, JourneyResource } from '../interfaces/journey.interface';
import { getDatabaseOperation, getDatabaseTables } from './database-query.function';

/** Parentage is the source of truth. A missing parent is kept as a visible root. */
export function buildJourney(trace: TraceFlowTraceDto): JourneyNode[] {
  const nodes = new Map(trace.spans.map((span) => [span.spanId, { span, children: [] } as JourneyNode]));
  const roots: JourneyNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.span.parentSpanId ? nodes.get(node.span.parentSpanId) : undefined;
    const visited = new Set([node.span.spanId]);
    let ancestor = parent;
    while (ancestor && !visited.has(ancestor.span.spanId)) {
      visited.add(ancestor.span.spanId);
      ancestor = ancestor.span.parentSpanId ? nodes.get(ancestor.span.parentSpanId) : undefined;
    }
    if (!parent || ancestor) roots.push(node);
    else parent.children.push(node);
  }
  const sort = (items: JourneyNode[]): JourneyNode[] => {
    items.sort((a, b) => spanStartMs(a.span) - spanStartMs(b.span));
    items.forEach((node) => sort(node.children));
    return items;
  };
  return sort(roots);
}

export function descendants(node: JourneyNode): TraceFlowSpanDto[] {
  return node.children.flatMap((child) => [child.span, ...descendants(child)]);
}

export function getResources(spans: TraceFlowSpanDto[]): JourneyResource[] {
  const resources = new Map<string, JourneyResource>();
  for (const span of spans) {
    for (const name of getDatabaseTables(span)) {
      const resource = resources.get(name) ?? { name, calls: 0, errors: 0 };
      resource.calls += 1;
      resource.errors += Number(span.status === 'error');
      resources.set(name, resource);
    }
  }
  return [...resources.values()];
}

export function getOutputSummary(span: TraceFlowSpanDto): string {
  if (span.status === 'error') return span.error?.message ?? 'La operación terminó con un error';
  if (span.status === 'unset') return 'Estado sin confirmar';
  const { output } = getTraceDataSections(span);
  if (output === undefined) return 'Salida no capturada';
  if (Array.isArray(output)) return `${output.length} elementos devueltos`;
  if (output && typeof output === 'object' && Array.isArray(output.data)) {
    return `${output.data.length} elementos devueltos${typeof output.total === 'number' ? ` · ${output.total} en total` : ''}`;
  }
  return summarizeValue(output);
}

export function summarizeValue(value: JsonValue): string {
  if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'elemento' : 'elementos'}`;
  if (value && typeof value === 'object') {
    const count = Object.keys(value).length;
    return `${count} ${count === 1 ? 'campo' : 'campos'}`;
  }
  const text = String(value);
  return text.length > 96 ? `${text.slice(0, 96)}…` : text;
}

export function getInputFields(span: TraceFlowSpanDto): Array<[string, JsonValue]> {
  const { input } = getTraceDataSections(span);
  if (input === undefined) return [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return [['entrada', input]];
  const entries = Object.entries(input);
  // Single DTO argument: show its fields without requiring an extra disclosure.
  const onlyValue = entries.length === 1 ? entries[0]?.[1] : undefined;
  return onlyValue && typeof onlyValue === 'object' && !Array.isArray(onlyValue) ? Object.entries(onlyValue) : entries;
}

export function getSearchIds(roots: JourneyNode[], query: string): Set<string> {
  const included = new Set<string>();
  const normalized = query.trim().toLocaleLowerCase();
  const visit = (node: JourneyNode): boolean => {
    const childMatches = node.children.map(visit).some(Boolean);
    const { span } = node;
    const matches = [span.name, span.className, span.methodName, span.type, getDatabaseOperation(span), ...span.labels, ...getResources([span]).map((resource) => resource.name)].some((value) =>
      value?.toLocaleLowerCase().includes(normalized),
    );
    if (matches || childMatches) included.add(span.spanId);
    return matches || childMatches;
  };
  roots.forEach(visit);
  return included;
}

export function initialExpandedIds(roots: JourneyNode[]): Set<string> {
  const expanded = new Set(roots.filter((node) => node.children.length).map((node) => node.span.spanId));
  const visit = (node: JourneyNode): boolean => {
    const childError = node.children.map(visit).some(Boolean);
    if (childError) expanded.add(node.span.spanId);
    return childError || node.span.status === 'error';
  };
  roots.forEach(visit);
  return expanded;
}

export function getUnobservedNodes(trace: TraceFlowTraceDto) {
  const counts = new Map<string, number>();
  const key = (node: { className: string | null; methodName: string | null }) => JSON.stringify([node.className, node.methodName]);
  trace.spans.forEach((span) => counts.set(key(span), (counts.get(key(span)) ?? 0) + 1));
  return (trace.flow?.nodes ?? []).filter((node) => {
    const count = counts.get(key(node)) ?? 0;
    if (count) counts.set(key(node), count - 1);
    return count === 0;
  });
}
