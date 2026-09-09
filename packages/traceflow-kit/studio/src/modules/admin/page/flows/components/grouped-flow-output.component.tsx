import { useContext } from 'react';
import { formatDuration } from '../../../functions/format.function';
import { GROUPED_FLOW_LINK_CLASS } from '../constants/grouped-flow.constant';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { getOutputSummary, summarizeValue } from '../functions/journey.function';
import { getTraceDataSections } from '../functions/trace-data.function';
import type { GroupedCardProps } from '../interfaces/grouped-flow.interface';

export function GroupedFlowOutputComponent({ data }: GroupedCardProps): React.JSX.Element {
  const { selectSpan } = useContext(GroupedFlowContext);
  const span = data.node?.span;
  const output = span ? getTraceDataSections(span).output : undefined;
  const fields = output && typeof output === 'object' && !Array.isArray(output) ? Object.entries(output) : [];
  return (
    <div className="p-4">
      <h3 className="text-[15px] font-semibold">
        {!data.isComplete ? 'Traza incompleta' : data.traceStatus === 'error' ? 'Terminó con un error' : data.traceStatus === 'success' ? 'Ejecución completada' : 'Estado sin confirmar'}
      </h3>
      <p className={`mt-2 break-words text-[11px] leading-5 ${data.traceStatus === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
        {span ? getOutputSummary(span) : 'No se recibió el método de entrada.'}
      </p>
      {fields.length ? (
        <dl className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {fields.slice(0, 3).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3 font-mono text-[10px]">
              <dt className="truncate text-zinc-400">{key}</dt>
              <dd className="truncate" title={summarizeValue(value)}>
                {summarizeValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <span className="font-mono text-xs font-semibold">
          {formatDuration(data.totalDuration)}
          <span className="ml-1.5 font-sans text-[10px] font-normal text-zinc-400">total</span>
        </span>
        {span ? (
          <button className={GROUPED_FLOW_LINK_CLASS} onClick={() => selectSpan(span, 'output')}>
            Ver salida ↗
          </button>
        ) : null}
      </div>
      {data.unobserved.length ? (
        <details className="nodrag nopan mt-3 text-[10px] text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer">{data.unobserved.length} pasos declarados sin registro</summary>
          <ul className="mt-2 space-y-1">
            {data.unobserved.map((node) => (
              <li key={node.id}>{node.name}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
