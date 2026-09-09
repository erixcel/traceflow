import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useContext } from 'react';
import { TRACE_NODE_TEXT_CLASSES, TRACE_NODE_TYPE_BORDER_CLASSES, TRACE_NODE_TYPE_HEADER_CLASSES } from '../constants/flow.constant';
import { TraceSelectionContext } from '../contexts/trace-selection.context';
import { formatDuration } from '../../../functions/format.function';
import { stateHandleClass } from '../functions/style.function';
import { formatMethodLabel } from '../functions/format.function';
import { isDatabaseQuery } from '../functions/database-query.function';
import type { TraceGraphNode } from '../interfaces/trace-graph.interface';
import { DatabaseQuerySummaryComponent } from './database-query-summary.component';

export function TraceNodeCardComponent({ data, selected }: NodeProps<TraceGraphNode>): React.JSX.Element {
  const { definition, span, state } = data;
  const selectSpan = useContext(TraceSelectionContext);
  const stateLabel = state === 'success' ? 'Completado' : state === 'error' ? 'Error' : 'No ejecutado';

  return (
    <article
      className={`relative flex w-max max-w-[min(32.5rem,80vw)] min-w-0 flex-col overflow-visible rounded-2xl border-2 bg-white shadow-[0_12px_34px_rgba(39,43,55,0.12)] transition dark:bg-zinc-950 dark:shadow-[0_18px_44px_rgba(0,0,0,0.4)] ${TRACE_NODE_TYPE_BORDER_CLASSES[definition.type]} ${state === 'error' ? 'ring-2 ring-rose-400/40' : ''} ${selected ? 'ring-4 ring-pink-500/15' : ''}`}
    >
      <Handle type="target" position={Position.Left} className={`!size-3 !border-2 !border-white dark:!border-zinc-950 ${stateHandleClass(state)}`} />
      <header className={`grid min-h-11 grid-cols-[minmax(max-content,1fr)_max-content] items-center gap-x-6 rounded-t-[13px] px-4 ${TRACE_NODE_TYPE_HEADER_CLASSES[definition.type]}`}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="relative block size-5 shrink-0 rounded-full border border-current" aria-hidden="true">
            <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
          </span>
          <span className="text-[10px] font-extrabold tracking-[0.1em] uppercase">{definition.type}</span>
        </span>
        <span className="justify-self-end font-mono text-[11px] whitespace-nowrap">{span ? formatDuration(span.durationMs) : '—'}</span>
      </header>
      <div className="px-4 pt-3">
        {span && isDatabaseQuery(span) ? (
          <DatabaseQuerySummaryComponent span={span} />
        ) : (
          <>
            <h3 className="max-w-full text-sm font-bold tracking-tight break-words text-zinc-900 dark:text-zinc-100">{definition.name}</h3>
            <p className="mt-0.5 max-w-full font-mono text-[10px] leading-4 break-words text-zinc-500 dark:text-zinc-400">{formatMethodLabel(definition)}</p>
          </>
        )}
      </div>
      <footer className={`mt-3 flex items-center gap-3 px-4 pb-3 text-[10px] ${TRACE_NODE_TEXT_CLASSES[state]}`}>
        <span>{stateLabel}</span>
        {span ? (
          <button
            className="nodrag nopan ml-auto cursor-pointer border-0 bg-transparent p-0 text-[9px] font-bold hover:brightness-125"
            type="button"
            aria-label={`Ver detalles de ${definition.name}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              selectSpan(span);
            }}
          >
            Detalles
          </button>
        ) : null}
      </footer>
      <Handle type="source" position={Position.Right} className={`!size-3 !border-2 !border-white dark:!border-zinc-950 ${stateHandleClass(state)}`} />
    </article>
  );
}
