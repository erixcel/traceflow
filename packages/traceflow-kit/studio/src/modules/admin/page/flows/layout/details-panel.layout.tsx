import { useEffect, useMemo, useRef, useState } from 'react';
import { statusBadgeClass } from '../../../functions/style.function';
import { formatDuration } from '../../../functions/format.function';
import { formatDateTime, formatMethodLabel, shortId } from '../functions/format.function';
import { getDatabaseOperation, isDatabaseQuery } from '../functions/database-query.function';
import { filterHttpInput } from '../functions/http-input.function';
import { getTraceDataSections } from '../functions/trace-data.function';
import { JsonViewerComponent } from '../components/json-viewer.component';
import { DatabaseQuerySummaryComponent } from '../components/database-query-summary.component';
import type { DetailItemProps, DetailsPanelProps, IdRowProps, SectionTitleProps, TraceDataSectionProps } from '../interfaces/details-panel.interface';
import { useHttpInputStore } from '../stores/http-input.store';

export function DetailsPanelLayout({ span, onClose, initialTab = 'input' }: DetailsPanelProps): React.JSX.Element {
  const httpInputPreferences = useHttpInputStore((state) => state.preferences);
  const [tab, setTab] = useState<'input' | 'output' | 'context'>(initialTab);
  const [copied, setCopied] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  const data = useMemo(() => getTraceDataSections(span), [span]);
  const requestRoot = span.attributes['traceflow.http.request_root'] === true;
  const visibleInput = requestRoot ? filterHttpInput(data.input, httpInputPreferences) : data.input;
  const methodDescription = requestRoot ? `${String(span.attributes['http.request.method'] ?? 'HTTP')} ${String(span.attributes['url.path'] ?? span.name)}` : formatMethodLabel(span);
  const databaseQuery = isDatabaseQuery(span);
  const panelTitle = databaseQuery ? (getDatabaseOperation(span) ?? span.methodName ?? 'Consulta') : span.name;
  const sql = databaseQuery && typeof span.attributes['db.query.text'] === 'string' ? span.attributes['db.query.text'] : null;

  const copy = async (label: string, value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied('error');
    }
    window.setTimeout(() => setCopied(null), 1_200);
  };

  return (
    <aside
      aria-label={`Detalles de ${panelTitle}`}
      className={`absolute top-0 right-0 z-30 flex h-full w-[min(26rem,92vw)] flex-col border-l bg-white/98 shadow-[-20px_0_50px_rgba(39,43,55,0.13)] backdrop-blur-xl dark:bg-zinc-950/98 dark:shadow-[-28px_0_70px_rgba(0,0,0,0.5)] ${span.status === 'success' ? 'border-emerald-500/40' : span.status === 'error' ? 'border-rose-500/40' : 'border-zinc-300 dark:border-zinc-700'}`}
    >
      <header className="flex items-start justify-between border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <div className="min-w-0">
          <span className={statusBadgeClass(span.status)}>{span.status}</span>
          <h2 className="mt-2.5 truncate text-lg font-bold tracking-tight">{panelTitle}</h2>
        </div>
        <button
          ref={closeRef}
          className="grid size-8 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-zinc-50 text-lg text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Cerrar detalles"
        >
          ×
        </button>
      </header>

      <div className="flex gap-1 border-b border-zinc-200 px-5 dark:border-zinc-800" role="group" aria-label="Datos del paso">
        {(['input', 'output', 'context'] as const).map((item) => (
          <button
            key={item}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            className={`border-b-2 px-3 py-3 text-xs font-semibold ${tab === item ? 'border-pink-500 text-pink-600 dark:text-pink-300' : 'border-transparent text-zinc-500'}`}
          >
            {item === 'input' ? 'Entrada' : item === 'output' ? 'Salida' : 'Contexto'}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-8">
        <section className="mb-4 grid grid-cols-2 gap-2.5">
          <Metric label="Tipo" value={span.type} />
          <Metric label="Duración" value={formatDuration(span.durationMs)} />
        </section>
        {databaseQuery ? (
          <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-500/5" aria-label="Tablas afectadas por la consulta">
            <div className="flex min-h-8 items-center">
              <DatabaseQuerySummaryComponent span={span} appearance="chips" />
            </div>
            {sql ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] font-semibold text-amber-800 focus-visible:outline-2 focus-visible:outline-pink-500 dark:text-amber-300">Ver consulta SQL</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-3 font-mono text-[10px] break-words dark:bg-zinc-950/70">{sql}</pre>
              </details>
            ) : null}
          </section>
        ) : null}

        {tab === 'input' || tab === 'output' ? (
          <>
            <Detail label="Método" value={methodDescription} />
            {span.error ? (
              <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300">
                <strong>{span.error.name}</strong>
                <p className="mt-2 break-words">{span.error.message}</p>
              </div>
            ) : null}
            <TraceDataSection
              title={tab === 'input' ? 'Entrada' : 'Salida'}
              value={tab === 'input' ? visibleInput : data.output}
              emptyMessage={
                tab === 'input'
                  ? data.input === undefined
                    ? 'No se capturaron datos de entrada.'
                    : 'Las secciones capturadas están ocultas en la configuración.'
                  : 'No se capturaron datos de salida.'
              }
            />
          </>
        ) : (
          <>
            <Detail label="Clase" value={span.className ?? '—'} />
            <Detail label="Método" value={span.methodName ?? '—'} />
            <Detail label="Inicio" value={formatDateTime(span.startedAt)} />
            <Detail label="Fin" value={formatDateTime(span.endedAt)} />
            <Detail label="Descripción" value={span.description ?? '—'} />

            <section className="mt-6">
              <SectionTitle>Identificadores</SectionTitle>
              <IdRow label="Span ID" value={span.spanId} display={shortId(span.spanId)} copied={copied} onCopy={copy} />
              <IdRow label="Parent Span" value={span.parentSpanId ?? ''} display={span.parentSpanId ? shortId(span.parentSpanId) : 'Span raíz'} copied={copied} onCopy={copy} />
              <IdRow label="Trace ID" value={span.traceId} display={shortId(span.traceId)} copied={copied} onCopy={copy} />
            </section>

            <TraceDataSection title="Atributos" value={Object.keys(data.attributes).length > 0 ? data.attributes : undefined} emptyMessage="No hay atributos adicionales." />

            {span.error ? (
              <section className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3">
                <h3 className="text-[11px] font-bold tracking-wide text-rose-700 uppercase dark:text-rose-300">{span.error.name}</h3>
                <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-200">{span.error.message}</p>
                {span.error.stack ? (
                  <pre className="mt-3 max-h-70 overflow-auto whitespace-pre-wrap rounded-lg bg-white/60 p-3 font-mono text-[10px] break-words dark:bg-zinc-950/60">{span.error.stack}</pre>
                ) : null}
              </section>
            ) : null}
          </>
        )}
        {copied === 'error' ? (
          <p role="status" className="mt-3 text-xs text-rose-600">
            No se pudo copiar al portapapeles.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function Metric({ label, value }: DetailItemProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <strong className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{value}</strong>
    </div>
  );
}

function Detail({ label, value }: DetailItemProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2.5 border-b border-zinc-200 px-px py-2.5 dark:border-zinc-800">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <strong className="break-words text-xs font-semibold text-zinc-800 dark:text-zinc-200">{value}</strong>
    </div>
  );
}

function SectionTitle({ children }: SectionTitleProps): React.JSX.Element {
  return <h3 className="mb-2 text-[11px] font-bold tracking-[0.05em] text-zinc-600 uppercase dark:text-zinc-300">{children}</h3>;
}

function TraceDataSection({ title, value, emptyMessage }: TraceDataSectionProps): React.JSX.Element {
  return (
    <section className="mt-6">
      <SectionTitle>{title}</SectionTitle>
      {value === undefined ? (
        <div className="grid gap-0.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <strong className="text-[10px] text-zinc-600 uppercase dark:text-zinc-300">Sin captura</strong>
          <span className="text-[10px] text-zinc-500">{emptyMessage}</span>
        </div>
      ) : (
        <JsonViewerComponent value={value} label={`${title} de la traza`} />
      )}
    </section>
  );
}

function IdRow({ label, value, display, copied, onCopy }: IdRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-2 py-2 text-[10px] text-zinc-500">
      <span>{label}</span>
      <code className="truncate text-zinc-700 dark:text-zinc-300">{display}</code>
      <button className="text-[9px] font-semibold text-emerald-600 disabled:hidden dark:text-emerald-400" type="button" disabled={!value} onClick={() => void onCopy(label, value)}>
        {copied === label ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}
