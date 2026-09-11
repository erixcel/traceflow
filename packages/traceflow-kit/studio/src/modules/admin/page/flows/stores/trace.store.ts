import { create } from 'zustand';
import type { TraceStore } from '../interfaces/trace-store.interface';
import { clearTraces, getTrace, listTraces } from '../functions/api.function';
import { errorMessage } from '../functions/error.function';

export const useTraceStore = create<TraceStore>((set, get) => ({
  traces: [],
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
      if (get().activeTraceId !== traceId) {
        return trace;
      }

      set((state) => ({ activeTrace: trace, selectedSpan: state.selectedSpan ? (trace.spans.find((span) => span.spanId === state.selectedSpan?.spanId) ?? null) : null, error: null }));
      return trace;
    } catch (error: unknown) {
      if (get().activeTraceId === traceId) {
        set({ activeTrace: null, selectedSpan: null, error: errorMessage(error, 'No se pudo cargar la traza') });
      }
      return null;
    }
  },

  refreshTraces: async () => {
    try {
      const traces = await listTraces();
      const currentId = get().activeTraceId;
      const nextId = traces.some((trace) => trace.traceId === currentId) ? currentId : (traces[0]?.traceId ?? null);
      set({ traces, activeTraceId: nextId, error: null });

      if (nextId) {
        await get().loadTrace(nextId);
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
    set({ activeTraceId: traceId, selectedSpan: null });
    await get().loadTrace(traceId);
  },

  showTraceDetails: async (traceId) => {
    set({ activeTraceId: traceId, selectedSpan: null });
    const trace = await get().loadTrace(traceId);
    if (trace && get().activeTraceId === traceId) {
      set({ selectedSpan: trace.spans.find((span) => span.parentSpanId === null) ?? trace.spans[0] ?? null });
    }
  },

  clearAll: async () => {
    try {
      await clearTraces();
      set({ traces: [], activeTraceId: null, activeTrace: null, selectedSpan: null, error: null });
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
