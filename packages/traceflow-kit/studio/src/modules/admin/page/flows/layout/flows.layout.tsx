import { TRACEFLOW_DEMO_URL } from '../constants/demo.constant';
import { useTraceStore } from '../stores/trace.store';
import { DetailsPanelLayout } from './details-panel.layout';
import { TraceHistoryLayout } from './trace-history.layout';
import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { TraceCanvasProps } from '../interfaces/trace-canvas.interface';
import { TraceGroupedCanvasLayout } from './trace-grouped-canvas.layout';
import { hasMonotonicTiming } from '../functions/execution-flow.function';

export function FlowsLayout(): React.JSX.Element {
  const [detailTab, setDetailTab] = useState<'input' | 'output'>('input');
  const activeTrace = useTraceStore((state) => state.activeTrace);
  const selectedSpan = useTraceStore((state) => state.selectedSpan);
  const connectionStatus = useTraceStore((state) => state.connectionStatus);
  const error = useTraceStore((state) => state.error);
  const refreshTraces = useTraceStore((state) => state.refreshTraces);
  const setSelectedSpan = useTraceStore((state) => state.setSelectedSpan);
  const setError = useTraceStore((state) => state.setError);
  const selectSpan: TraceCanvasProps['onSelectSpan'] = (span, tab = 'input') => {
    setDetailTab(tab);
    setSelectedSpan(span);
  };

  const runDemo = async (): Promise<void> => {
    if (!TRACEFLOW_DEMO_URL) {
      return;
    }

    try {
      await fetch(TRACEFLOW_DEMO_URL);
    } catch {
      setError('No se pudo ejecutar el endpoint demo.');
    }
  };

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[15rem_minmax(0,1fr)] max-md:grid-cols-1">
      <div className="min-h-0 max-md:hidden">
        <TraceHistoryLayout />
      </div>
      <section className="relative min-h-0 min-w-0 overflow-hidden bg-zinc-50 dark:bg-[#0d0e12]">
        {error ? (
          <div
            className="absolute top-14 right-6 z-40 flex w-[min(22rem,calc(100%-3rem))] items-start gap-2.5 rounded-xl border border-zinc-200 bg-white/95 p-3 text-zinc-700 shadow-[0_12px_30px_rgba(24,24,27,0.14)] backdrop-blur-xl dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-200 dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)] max-md:right-4"
            role="alert"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300" aria-hidden="true">
              <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2.25a5.75 5.75 0 1 0 5.75 5.75" />
                <path d="M8 5v3.25M8 11h.01M10.75 2.75h3v3" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-[11px] text-zinc-900 dark:text-zinc-100">{connectionStatus === 'connected' ? 'No se pudo actualizar Studio' : 'Conexión interrumpida'}</strong>
              <span className="mt-0.5 block truncate text-[10px] text-zinc-500 dark:text-zinc-400">{error}</span>
            </span>
            <button
              className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              type="button"
              onClick={() => void refreshTraces()}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {activeTrace ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-50 text-zinc-800 dark:bg-[#101116] dark:text-zinc-100">
            {!hasMonotonicTiming(activeTrace.spans) ? (
              <p className="shrink-0 border-b border-amber-200/60 bg-amber-50 px-7 py-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200" role="note">
                Esta traza no tiene tiempos monotónicos. El orden y los solapamientos son estimados; vuelve a ejecutar la API con TraceFlow actualizado para confirmarlos.
              </p>
            ) : null}
            <ReactFlowProvider key={activeTrace.traceId}>
              <TraceGroupedCanvasLayout trace={activeTrace} onSelectSpan={selectSpan} />
            </ReactFlowProvider>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto grid size-20 place-items-center rounded-3xl border border-pink-500/20 bg-pink-500/5 text-3xl text-pink-500 shadow-[0_0_40px_rgba(236,72,153,0.12)]">⌁</div>
              <span className="mt-6 block text-[9px] font-extrabold tracking-[0.14em] text-zinc-500 uppercase">Esperando actividad</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">No hay trazas todavía</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Ejecuta un endpoint que utilice <code className="text-pink-600 dark:text-pink-400">@Trace()</code> para visualizar su recorrido.
              </p>
              {TRACEFLOW_DEMO_URL ? (
                <button
                  className="mt-5 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:bg-pink-500"
                  type="button"
                  onClick={() => void runDemo()}
                >
                  Ejecutar demo
                </button>
              ) : null}
            </div>
          </div>
        )}
      </section>
      {selectedSpan ? <DetailsPanelLayout key={`${selectedSpan.spanId}-${detailTab}`} span={selectedSpan} initialTab={detailTab} onClose={() => setSelectedSpan(null)} /> : null}
    </div>
  );
}
