import { useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GROUPED_FLOW_LINK_CLASS } from '../constants/grouped-flow.constant';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { getHttpInputFields, getHttpInputSections, isEmptyHttpInputValue } from '../functions/http-input.function';
import { descendants, getInputFields, summarizeValue } from '../functions/journey.function';
import { getTraceDataSections } from '../functions/trace-data.function';
import { getValidationContract } from '../functions/validation-contract.function';
import type { GroupedCardProps } from '../interfaces/grouped-flow.interface';
import { useHttpInputStore } from '../stores/http-input.store';
import { GroupedFlowStatusComponent } from './grouped-flow-status.component';
import { GroupedFlowStepsComponent } from './grouped-flow-steps.component';
import { HttpInputSummaryComponent } from './http-input-summary.component';

export function GroupedFlowEntryComponent({ data }: GroupedCardProps): React.JSX.Element {
  const { selectCard, toggleGroup, openStep } = useContext(GroupedFlowContext);
  const preferences = useHttpInputStore((state) => state.preferences);

  const requestSpan = data.request?.span ?? (data.node?.span.type === 'http' ? data.node.span : undefined);
  const validationSpan = data.validation?.span;
  const controllerSpan = data.node?.span.type === 'controller' ? data.node.span : undefined;
  const activeSpan = controllerSpan ?? requestSpan ?? data.node?.span;

  if (!activeSpan) {
    return <p className="p-5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">La entrada no está disponible en los pasos recibidos.</p>;
  }

  const contract = getValidationContract(controllerSpan ?? requestSpan);
  const requestInput = requestSpan ? getTraceDataSections(requestSpan).input : getTraceDataSections(activeSpan).input;
  const query = getHttpInputSections(requestInput).find((section) => section.key === 'query')?.value;
  const showQuery = preferences.visible.query && (!preferences.hideEmpty || !isEmptyHttpInputValue(query));
  const method = requestSpan?.attributes['http.request.method'] ?? activeSpan.attributes['http.request.method'] ?? activeSpan.attributes['http.method'];
  const route =
    requestSpan?.attributes['url.path'] ?? activeSpan.attributes['url.path'] ?? activeSpan.attributes['http.route'] ?? activeSpan.attributes['traceflow.controller.route'] ?? activeSpan.name;
  const fields = requestSpan ? (showQuery ? getHttpInputFields(query) : []) : getInputFields(activeSpan);

  const hasValidationError = (requestSpan?.attributes['http.response.status_code'] === 400 || requestSpan?.status === 'error') && !controllerSpan;
  const validationErrorMessage = hasValidationError ? (requestSpan?.error?.message ?? 'Fallo de validación en parámetros de entrada') : null;
  const authStepNumber = data.preconditions.length > 0 ? 1 : 0;
  const dtoStepNumber = authStepNumber + (validationSpan ? 1 : 0);
  const validationSelected = data.openedSpanId === validationSpan?.spanId;
  const visibleStepCount = data.preconditions.reduce((total, node) => total + 1 + descendants(node).length, 0) + (validationSpan ? 1 : 0);

  return (
    <>
      {/* Datos HTTP de Entrada */}
      <div
        className="cursor-pointer p-4"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          selectCard(data.cardId, requestSpan ?? activeSpan, 'input');
        }}
      >
        <div className="flex items-start gap-2">
          {typeof method === 'string' ? <span className="rounded bg-emerald-50 px-1.5 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{method}</span> : null}
          <h3 className="min-w-0 break-words text-[13px] font-semibold leading-5">{typeof route === 'string' ? route : Array.isArray(route) ? route.join(' · ') : activeSpan.name}</h3>
        </div>

        {/* Query parameters recibidos */}
        {fields.length || (!requestSpan && preferences.visible.query) || (requestSpan && showQuery) ? (
          <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {fields.slice(0, 6).map(([key, value]) => (
              <div className="min-w-0" key={key}>
                <span className="block truncate font-mono text-[9px] text-zinc-400">{key}</span>
                <span className="mt-0.5 block truncate font-mono text-[11px]" title={summarizeValue(value)}>
                  {summarizeValue(value)}
                </span>
              </div>
            ))}
            {!fields.length ? (
              <p className="col-span-2 text-[11px] text-zinc-400">
                {requestSpan ? 'Sin query params' : getTraceDataSections(activeSpan).input === undefined ? 'Entrada no capturada' : 'Sin parámetros'}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Resumen de Authorization y Headers */}
        <HttpInputSummaryComponent input={requestInput} omit={['query']} />
      </div>

      {/* Pasos previos al controller: guards y validación del DTO. */}
      {data.preconditions.length || validationSpan ? (
        <div className="border-t border-zinc-200 bg-transparent px-4 py-3 dark:border-zinc-700">
          <p className="mb-2 text-[9px] font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">Antes del controller</p>

          <div id={`steps-${data.cardId}`} className="space-y-1.5">
            {data.preconditions.length ? (
              <GroupedFlowStepsComponent
                nodes={data.preconditions}
                ownerId={data.cardId}
                openedSpanId={data.openedSpanId}
                query={data.query}
                matchedIds={data.matchedIds}
                compact
                visibleDepth={data.visibleDepth}
              />
            ) : null}

            {validationSpan ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    openStep(data.cardId, validationSpan, 'input');
                  }}
                  className={`nodrag nopan group flex min-h-9 w-full cursor-pointer items-center gap-1.5 rounded-md border-l-2 px-2 py-1.5 text-left transition ${
                    validationSelected
                      ? `${hasValidationError ? 'border-l-rose-500' : 'border-l-emerald-500'} bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-600`
                      : hasValidationError
                        ? 'border-l-rose-500 bg-rose-50/60 hover:bg-rose-100/70 dark:bg-rose-950/30 dark:hover:bg-rose-950/50'
                        : 'border-l-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                  title={hasValidationError ? (validationErrorMessage ?? 'Error de validación') : 'Abrir tarjeta de validación a la derecha'}
                >
                  <span className="flex min-w-5 shrink-0 items-center justify-center rounded bg-zinc-100 px-1 py-0.5 font-mono text-[8px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {dtoStepNumber}
                  </span>
                  <GroupedFlowStatusComponent status={hasValidationError ? 'error' : 'success'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-zinc-700 dark:text-zinc-200" title="Validación">
                      Validación
                    </span>
                    <span
                      className={`block truncate font-mono text-[9px] ${hasValidationError ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`}
                      title={hasValidationError ? (validationErrorMessage ?? undefined) : undefined}
                    >
                      {contract?.dtoName ?? 'DTO'}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[9px] text-zinc-500 dark:text-zinc-400">&lt; 1 ms</span>
                  <span aria-hidden="true" className={`text-xs ${validationSelected ? 'text-pink-500' : 'text-zinc-400 group-hover:text-pink-500'}`}>
                    ›
                  </span>
                </button>
                {validationSelected ? <Handle type="source" position={Position.Right} id={`step-${validationSpan.spanId}`} className="!size-1.5 !border-0 !bg-zinc-400" /> : null}
              </div>
            ) : null}
          </div>

          {data.preconditions.some((node) => node.children.length > 0) ? (
            <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <button
                type="button"
                className={GROUPED_FLOW_LINK_CLASS}
                aria-expanded={data.expanded}
                aria-controls={`steps-${data.cardId}`}
                disabled={Boolean(data.query)}
                onClick={() => toggleGroup(data.cardId, requestSpan ?? activeSpan)}
              >
                {data.expanded ? 'Mostrar solo nivel 1' : `Ver niveles internos · ${visibleStepCount}`} <span aria-hidden="true">{data.expanded ? '⌃' : '⌄'}</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
