import { useContext } from 'react';
import { GROUPED_FLOW_LINK_CLASS } from '../constants/grouped-flow.constant';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { descendants, getResources } from '../functions/journey.function';
import { isDatabaseQuery } from '../functions/database-query.function';
import { formatMethodLabel } from '../functions/format.function';
import type { GroupedCardProps } from '../interfaces/grouped-flow.interface';
import { DatabaseQuerySummaryComponent } from './database-query-summary.component';
import { GroupedFlowStepsComponent } from './grouped-flow-steps.component';

export function GroupedFlowProcessComponent({ data }: GroupedCardProps): React.JSX.Element {
  const { selectSpan, toggleGroup } = useContext(GroupedFlowContext);
  const node = data.node;
  if (!node) return <p className="p-5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">No se registraron llamadas internas.</p>;
  const steps = descendants(node);
  const resources = getResources([node.span, ...steps]);
  const errors = steps.filter((span) => span.status === 'error').length;
  const preview = node.children.slice(0, 2).map((child) => ({ ...child, children: [] }));
  return (
    <>
      <div className="px-4 pt-2.5 pb-2">
        {isDatabaseQuery(node.span) ? (
          <DatabaseQuerySummaryComponent span={node.span} />
        ) : (
          <>
            <h3 className="text-[14px] font-semibold leading-5">{node.span.name}</h3>
            <p className="mt-1 truncate font-mono text-[10px] text-zinc-400" title={formatMethodLabel(node.span)}>
              {formatMethodLabel(node.span)}
            </p>
          </>
        )}
        {!isDatabaseQuery(node.span) && resources.length && (!steps.length || data.expanded) ? (
          <div className="mt-3 flex flex-wrap gap-1" aria-label="Tablas usadas">
            <span className="mr-1 self-center text-[9px] text-zinc-400">Tablas usadas</span>
            {resources.slice(0, 4).map((resource) => (
              <span
                key={resource.name}
                className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${resource.errors ? 'border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-300' : 'border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400'}`}
              >
                {resource.name}
                {resource.calls > 1 ? ` ×${resource.calls}` : ''}
              </span>
            ))}
            {resources.length > 4 ? <span className="self-center text-[9px] text-zinc-400">+{resources.length - 4}</span> : null}
          </div>
        ) : null}
        {node.span.error ? (
          <p className="mt-2 break-words text-[10px] text-rose-600 dark:text-rose-300">{node.span.error.message}</p>
        ) : errors ? (
          <p className="mt-2 text-[10px] text-rose-600 dark:text-rose-300">{errors} pasos internos con error</p>
        ) : null}
      </div>
      {steps.length ? (
        <div id={`steps-${node.span.spanId}`} className="nowheel nodrag nopan max-h-72 overflow-y-auto border-t border-zinc-100 bg-zinc-50/70 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-950/25">
          <GroupedFlowStepsComponent nodes={data.expanded ? node.children : preview} query={data.query} matchedIds={data.matchedIds} compact={!data.expanded} />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 rounded-b-xl border-t border-zinc-100 px-4 py-1.5 dark:border-zinc-800">
        {steps.length ? (
          <button
            className={GROUPED_FLOW_LINK_CLASS}
            aria-expanded={data.expanded}
            aria-controls={`steps-${node.span.spanId}`}
            disabled={Boolean(data.query)}
            onClick={() => toggleGroup(node.span.spanId)}
          >
            {data.expanded ? 'Contraer' : `Ver ${steps.length} pasos`} <span aria-hidden="true">{data.expanded ? '⌃' : '⌄'}</span>
          </button>
        ) : (
          <span className="text-[10px] text-zinc-400">{data.continuesInFlow ? 'Continúa en el flujo' : 'Sin llamadas internas'}</span>
        )}
        <button
          className="nodrag nopan cursor-pointer text-[10px] text-zinc-500 hover:text-pink-600 focus-visible:outline-2 focus-visible:outline-pink-500 dark:text-zinc-400 dark:hover:text-pink-300"
          onClick={() => selectSpan(node.span)}
        >
          Detalles ↗
        </button>
      </div>
    </>
  );
}
