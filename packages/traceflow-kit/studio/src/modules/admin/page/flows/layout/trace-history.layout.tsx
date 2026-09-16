import { useMemo } from 'react';
import { TraceHistoryCardComponent } from '../components/trace-history-card.component';
import { connectionDotClass } from '../functions/style.function';
import { useTraceStore } from '../stores/trace.store';

interface TraceHistoryLayoutProps {
  className?: string;
  onTraceChosen?: () => void;
}

export function TraceHistoryLayout({ className = '', onTraceChosen }: TraceHistoryLayoutProps = {}): React.JSX.Element {
  const traces = useTraceStore((state) => state.traces);
  const activeTraceId = useTraceStore((state) => state.activeTraceId);
  const connectionStatus = useTraceStore((state) => state.connectionStatus);
  const loading = useTraceStore((state) => state.loading);
  const query = useTraceStore((state) => state.query);
  const statusFilter = useTraceStore((state) => state.statusFilter);
  const setQuery = useTraceStore((state) => state.setQuery);
  const setStatusFilter = useTraceStore((state) => state.setStatusFilter);
  const selectTrace = useTraceStore((state) => state.selectTrace);
  const showTraceDetails = useTraceStore((state) => state.showTraceDetails);
  const clearAll = useTraceStore((state) => state.clearAll);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return traces.filter(
      (trace) =>
        (!normalizedQuery || trace.rootName.toLocaleLowerCase().includes(normalizedQuery) || trace.serviceName.toLocaleLowerCase().includes(normalizedQuery)) &&
        (statusFilter === 'all' || trace.status === statusFilter),
    );
  }, [query, statusFilter, traces]);

  return (
    <aside className={`flex h-full min-h-0 min-w-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      <div className="flex items-center gap-2 px-4 pt-4 text-xs text-zinc-600 dark:text-zinc-300">
        <span className={`size-2 rounded-full ${connectionDotClass(connectionStatus)}`} />
        {connectionStatus === 'connected' ? 'Conectado' : connectionStatus === 'reconnecting' ? 'Reconectando' : 'Desconectado'}
      </div>

      <div className="grid gap-2 px-4 py-4">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-zinc-400 focus-within:border-pink-400 dark:border-zinc-800 dark:bg-zinc-900">
          <span aria-hidden="true">⌕</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar trazas"
            aria-label="Buscar trazas"
          />
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <label className="relative flex h-9 min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-zinc-500 transition focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <svg aria-hidden="true" className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2.5 4h3m3 0h5M2.5 8h6m3 0h2M2.5 12h1.75m3 0h6.25" />
              <circle cx="7" cy="4" r="1.25" />
              <circle cx="10" cy="8" r="1.25" />
              <circle cx="5.75" cy="12" r="1.25" />
            </svg>
            <select
              className="h-7 min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent pr-5 text-[11px] text-zinc-600 [color-scheme:light] outline-none dark:text-zinc-300 dark:[color-scheme:dark] [&>option]:bg-zinc-50 [&>option]:text-zinc-600 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-zinc-300"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="success">Correctas</option>
              <option value="error">Con error</option>
              <option value="unset">Sin estado</option>
            </select>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 size-3 text-zinc-400"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 4.5 3 3 3-3" />
            </svg>
          </label>
          <button
            className="h-9 rounded-xl border border-zinc-200 px-3 text-[11px] text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-900"
            type="button"
            onClick={() => void clearAll()}
            disabled={traces.length === 0}
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-2 text-[9px] font-extrabold tracking-[0.12em] text-zinc-500 uppercase">
        <span>Actividad reciente</span>
        <span>{filtered.length}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 pb-4">
        {loading && traces.length === 0 ? <p className="px-3 py-5 text-center text-xs text-zinc-500">Cargando trazas…</p> : null}
        {!loading && filtered.length === 0 ? <p className="px-3 py-5 text-center text-xs text-zinc-500">No hay resultados.</p> : null}
        {filtered.map((trace) => (
          <TraceHistoryCardComponent
            key={trace.traceId}
            trace={trace}
            active={activeTraceId === trace.traceId}
            onSelect={async (traceId) => {
              onTraceChosen?.();
              await selectTrace(traceId);
            }}
            onShowDetails={async (traceId) => {
              onTraceChosen?.();
              await showTraceDetails(traceId);
            }}
          />
        ))}
      </div>
    </aside>
  );
}
