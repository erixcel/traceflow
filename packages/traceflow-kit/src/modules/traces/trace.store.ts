import { TRACEFLOW_MAX_SPANS_PER_TRACE, TRACEFLOW_MAX_TRACES } from 'traceflow/protocol';
import type { TraceFlowDefinitionDto, TraceFlowSpanDto, TraceFlowStatus, TraceFlowStoreEvent, TraceFlowTraceDto, TraceFlowTraceSummaryDto } from 'traceflow/protocol';
import { calculateTraceDuration, findMatchingFlow, findTraceEntrySpan } from '../../functions/trace.function';
import type { TraceStoreListener, TraceStoreOptions } from './types/store.type';

export class TraceStore {
  private readonly traces = new Map<string, TraceFlowTraceDto>();
  private readonly listeners = new Set<TraceStoreListener>();
  private readonly maxTraces: number;
  private readonly maxSpansPerTrace: number;
  private readonly now: () => Date;

  constructor(options: TraceStoreOptions = {}) {
    this.maxTraces = options.maxTraces ?? TRACEFLOW_MAX_TRACES;
    this.maxSpansPerTrace = options.maxSpansPerTrace ?? TRACEFLOW_MAX_SPANS_PER_TRACE;
    this.now = options.now ?? (() => new Date());
  }

  addSpans(spans: readonly TraceFlowSpanDto[], flows: readonly TraceFlowDefinitionDto[] = []): void {
    const grouped = new Map<string, TraceFlowSpanDto[]>();

    for (const span of spans) {
      const group = grouped.get(span.traceId) ?? [];
      group.push(span);
      grouped.set(span.traceId, group);
    }

    for (const [traceId, incoming] of grouped) {
      const existing = this.traces.get(traceId);
      const bySpanId = new Map<string, TraceFlowSpanDto>();

      for (const span of existing?.spans ?? []) {
        bySpanId.set(span.spanId, span);
      }
      for (const span of incoming) {
        bySpanId.set(span.spanId, span);
      }

      const merged = this.limitSpans([...bySpanId.values()]);
      const trace = this.buildTrace(merged, flows, existing?.flow ?? null);
      this.traces.set(traceId, trace);
      this.notify({
        type: existing ? 'trace.updated' : 'trace.created',
        traceId,
        occurredAt: trace.updatedAt,
      });
    }

    this.enforceTraceRetention();
  }

  listTraces(): TraceFlowTraceSummaryDto[] {
    return [...this.traces.values()].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)).map(({ flow: _flow, spans: _spans, ...summary }) => structuredClone(summary));
  }

  getTrace(traceId: string): TraceFlowTraceDto | null {
    const trace = this.traces.get(traceId);
    return trace ? structuredClone(trace) : null;
  }

  getLatestTrace(): TraceFlowTraceDto | null {
    const latest = this.listTraces()[0];
    return latest ? this.getTrace(latest.traceId) : null;
  }

  clear(): void {
    this.traces.clear();
    this.notify({
      type: 'traces.cleared',
      occurredAt: this.now().toISOString(),
    });
  }

  removeTrace(traceId: string): boolean {
    const removed = this.traces.delete(traceId);

    if (removed) {
      this.notify({
        type: 'trace.deleted',
        traceId,
        occurredAt: this.now().toISOString(),
      });
    }

    return removed;
  }

  subscribe(listener: TraceStoreListener): void {
    this.listeners.add(listener);
  }

  unsubscribe(listener: TraceStoreListener): void {
    this.listeners.delete(listener);
  }

  private buildTrace(spans: TraceFlowSpanDto[], flows: readonly TraceFlowDefinitionDto[], previousFlow: TraceFlowDefinitionDto | null): TraceFlowTraceDto {
    const sorted = [...spans].sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt));
    const root = sorted.find((span) => span.parentSpanId === null);
    const entry = findTraceEntrySpan(sorted);
    const first = sorted[0];
    const last = sorted.at(-1);
    const hasError = sorted.some((span) => span.status === 'error');
    const status: TraceFlowStatus = hasError ? 'error' : root ? 'success' : 'unset';

    return {
      traceId: first?.traceId ?? '',
      serviceName: root?.serviceName ?? first?.serviceName ?? 'unknown',
      rootName: entry?.name ?? first?.name ?? 'Traza sin nombre',
      startedAt: first?.startedAt ?? this.now().toISOString(),
      updatedAt: this.now().toISOString(),
      durationMs: root?.durationMs ?? calculateTraceDuration(first?.startedAt, last?.endedAt),
      status,
      isComplete: root !== undefined,
      spanCount: sorted.length,
      spans: sorted,
      flow: findMatchingFlow(sorted, flows) ?? previousFlow,
    };
  }

  private limitSpans(spans: TraceFlowSpanDto[]): TraceFlowSpanDto[] {
    const sorted = [...spans].sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt));

    if (sorted.length <= this.maxSpansPerTrace) {
      return sorted;
    }

    const root = sorted.find((span) => span.parentSpanId === null);
    const newest = sorted.slice(-(this.maxSpansPerTrace - (root ? 1 : 0)));
    const limited = root ? [root, ...newest.filter((span) => span.spanId !== root.spanId)] : newest;

    return limited.slice(0, this.maxSpansPerTrace).sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt));
  }

  private enforceTraceRetention(): void {
    if (this.traces.size <= this.maxTraces) {
      return;
    }

    const oldest = [...this.traces.values()].sort((left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt));

    for (const trace of oldest.slice(0, this.traces.size - this.maxTraces)) {
      this.removeTrace(trace.traceId);
    }
  }

  private notify(event: TraceFlowStoreEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
