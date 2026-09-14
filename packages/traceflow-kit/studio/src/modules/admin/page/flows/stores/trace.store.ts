import { create } from 'zustand';
import type { TraceStore } from '../interfaces/trace-store.interface';
import { clearTraces, getTrace, listTraces } from '../functions/api.function';
import { errorMessage } from '../functions/error.function';

export const useTraceStore = create<TraceStore>((set, get) => ({
  traces: [],
  traceCache: {},
  activeTraceId: null,
  activeTrace: null,
  selectedSpan: null,
  connectionStatus: 'disconnected',
  loading: true,
  error: null,
  query: '',
  statusFilter: 'all',
  activeTab: 'input',

  loadTrace: async (traceId) => {
    try {
      const trace = await getTrace(traceId);
      set((state) => {
        const traceCache = { ...state.traceCache, [traceId]: trace };
        if (state.activeTraceId !== traceId) return { traceCache };
        return {
          traceCache,
          activeTrace: trace,
          selectedSpan: state.selectedSpan ? (trace.spans.find((span) => span.spanId === state.selectedSpan?.spanId) ?? null) : null,
          error: null,
        };
      });
      return trace;
    } catch (error: unknown) {
      if (get().activeTraceId === traceId) {
        set((state) => ({
          activeTrace: state.traceCache[traceId] ?? null,
          selectedSpan: state.traceCache[traceId] && state.selectedSpan ? (state.traceCache[traceId].spans.find((span) => span.spanId === state.selectedSpan?.spanId) ?? null) : null,
          error: errorMessage(error, 'No se pudo cargar la traza'),
        }));
      }
      return null;
    }
  },

  refreshTraces: async () => {
    try {
      const traces = await listTraces();
      const state = get();
      const currentId = state.activeTraceId;
      const nextId = traces.some((trace) => trace.traceId === currentId) ? currentId : (traces[0]?.traceId ?? null);
      const cached = nextId ? (state.traceCache[nextId] ?? (state.activeTrace?.traceId === nextId ? state.activeTrace : null)) : null;
      const summary = nextId ? traces.find((trace) => trace.traceId === nextId) : null;
      const selectedSpan = nextId === currentId && cached && state.selectedSpan ? (cached.spans.find((span) => span.spanId === state.selectedSpan?.spanId) ?? null) : null;
      set({ traces, activeTraceId: nextId, activeTrace: cached ?? null, selectedSpan, error: null });

      if (nextId) {
        if (!cached || !summary || cached.updatedAt !== summary.updatedAt) {
          await get().loadTrace(nextId);
        }
      } else {
        set({ activeTrace: null, selectedSpan: null });
      }
    } catch (error: unknown) {
      set({ error: errorMessage(error, 'TraceFlow Studio no está disponible') });
    } finally {
      set({ loading: false });
    }
  },

  selectTrace: async (traceId) => {
    const cached = get().traceCache[traceId] ?? (get().activeTrace?.traceId === traceId ? get().activeTrace : null);
    set({ activeTraceId: traceId, activeTrace: cached, selectedSpan: null });
    if (!cached) await get().loadTrace(traceId);
  },

  showTraceDetails: async (traceId) => {
    const cached = get().traceCache[traceId] ?? (get().activeTrace?.traceId === traceId ? get().activeTrace : null);
    set({ activeTraceId: traceId, activeTrace: cached, selectedSpan: cached ? (cached.spans.find((span) => span.parentSpanId === null) ?? cached.spans[0] ?? null) : null });
    const trace = cached ?? (await get().loadTrace(traceId));
    if (trace && get().activeTraceId === traceId) {
      set({ selectedSpan: trace.spans.find((span) => span.parentSpanId === null) ?? trace.spans[0] ?? null });
    }
  },

  clearAll: async () => {
    try {
      await clearTraces();
      set({ traces: [], traceCache: {}, activeTraceId: null, activeTrace: null, selectedSpan: null, error: null });
    } catch (error: unknown) {
      set({ error: errorMessage(error, 'No se pudieron limpiar las trazas') });
    }
  },

  setSelectedSpan: (selectedSpan) => set({ selectedSpan }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setQuery: (query) => set({ query }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setError: (error) => set({ error }),
}));
