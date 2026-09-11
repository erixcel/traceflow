import { useContext } from 'react';
import { GROUPED_FLOW_LINK_CLASS } from '../constants/grouped-flow.constant';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { getHttpInputFields, getHttpInputSections, getVisibleHttpInputSections, isEmptyHttpInputValue } from '../functions/http-input.function';
import { getInputFields, summarizeValue } from '../functions/journey.function';
import { getTraceDataSections } from '../functions/trace-data.function';
import type { GroupedCardProps } from '../interfaces/grouped-flow.interface';
import { useHttpInputStore } from '../stores/http-input.store';
import { GroupedFlowStepsComponent } from './grouped-flow-steps.component';
import { HttpInputSummaryComponent } from './http-input-summary.component';

export function GroupedFlowEntryComponent({ data }: GroupedCardProps): React.JSX.Element {
  const { selectSpan, fit } = useContext(GroupedFlowContext);
  const preferences = useHttpInputStore((state) => state.preferences);
  const span = data.node?.span;
  if (!span) return <p className="p-5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">La entrada no está disponible en los pasos recibidos.</p>;
  const requestSpan = data.request?.span;
  const requestInput = requestSpan ? getTraceDataSections(requestSpan).input : undefined;
  const query = getHttpInputSections(requestInput).find((section) => section.key === 'query')?.value;
  const showQuery = preferences.visible.query && (!preferences.hideEmpty || !isEmptyHttpInputValue(query));
  const method = span.attributes['http.request.method'] ?? span.attributes['http.method'];
  const route = span.attributes['http.route'] ?? span.attributes['traceflow.controller.route'];
  const fields = requestSpan ? (showQuery ? getHttpInputFields(query) : []) : getInputFields(span);
  const visibleHttpSections = getVisibleHttpInputSections(requestInput, preferences);
  return (
    <>
      <div
        className="cursor-pointer p-4"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          selectSpan(requestSpan ?? span);
          if (data.openedSpanId) {
            fit({ cardIds: ['grouped-entry', `detail-${data.openedSpanId}`] });
          } else {
            fit({ cardIds: ['grouped-entry'] });
          }
        }}
      >
        <div className="flex items-start gap-2">
          {typeof method === 'string' ? <span className="rounded bg-emerald-50 px-1.5 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{method}</span> : null}
          <h3 className="min-w-0 break-words text-[13px] font-semibold leading-5">{typeof route === 'string' ? route : Array.isArray(route) ? route.join(' · ') : span.name}</h3>
        </div>
        <p className="mt-2 break-words font-mono text-[10px] leading-4 text-zinc-500 dark:text-zinc-400">
          {span.className}
          {span.methodName ? `.${span.methodName}` : ''}
        </p>
        {fields.length || (!requestSpan && preferences.visible.query) || (requestSpan && showQuery) ? (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {fields.slice(0, 6).map(([key, value]) => (
              <div className="min-w-0" key={key}>
                <span className="block truncate font-mono text-[9px] text-zinc-400">{key}</span>
                <span className="mt-0.5 block truncate font-mono text-[11px]" title={summarizeValue(value)}>
                  {summarizeValue(value)}
                </span>
              </div>
            ))}
            {!fields.length ? (
              <p className="col-span-2 text-[11px] text-zinc-400">{requestSpan ? 'Sin query params' : getTraceDataSections(span).input === undefined ? 'Entrada no capturada' : 'Sin parámetros'}</p>
            ) : null}
          </div>
        ) : null}
        <HttpInputSummaryComponent input={requestInput} omit={['query']} />
        <button
          className={`${GROUPED_FLOW_LINK_CLASS} mt-3`}
          onClick={() => {
            selectSpan(requestSpan ?? span, 'input');
            if (data.openedSpanId) {
              fit({ cardIds: ['grouped-entry', `detail-${data.openedSpanId}`] });
            } else {
              fit({ cardIds: ['grouped-entry'] });
            }
          }}
        >
          {requestSpan ? `Ver datos HTTP${visibleHttpSections.length ? ` · ${visibleHttpSections.length}` : ''}` : `Inspeccionar entrada${fields.length > 6 ? ` · ${fields.length} campos` : ''}`} ↗
        </button>
      </div>
      {data.preconditions.length ? (
        <div className="border-t border-zinc-200 bg-transparent px-4 py-3 dark:border-zinc-700">
          <p className="mb-1 text-[9px] font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">Antes del controller</p>
          <GroupedFlowStepsComponent nodes={data.preconditions} ownerId={data.cardId} openedSpanId={data.openedSpanId} query={data.query} matchedIds={data.matchedIds} compact />
        </div>
      ) : null}
    </>
  );
}
