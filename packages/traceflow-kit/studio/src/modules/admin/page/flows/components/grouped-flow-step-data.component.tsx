import { useContext } from 'react';
import type { TraceFlowSpanDto } from 'traceflow/protocol';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { getTraceDataSections } from '../functions/trace-data.function';
import { summarizeValue } from '../functions/journey.function';

export function GroupedFlowStepDataComponent({ span }: { span: TraceFlowSpanDto }): React.JSX.Element {
  const { selectSpan } = useContext(GroupedFlowContext);
  const sections = getTraceDataSections(span);
  return (
    <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
      {(['input', 'output'] as const).map((key) => (
        <button key={key} className="nodrag nopan min-w-0 cursor-pointer rounded-md text-left focus-visible:outline-2 focus-visible:outline-pink-500" onClick={() => selectSpan(span, key)}>
          <span className="block text-[9px] font-semibold tracking-wide text-zinc-400 uppercase">{key === 'input' ? 'Entrada' : 'Salida'} ↗</span>
          <span className="mt-1 block truncate text-[11px] text-zinc-600 dark:text-zinc-300">{sections[key] === undefined ? 'No capturada' : summarizeValue(sections[key])}</span>
        </button>
      ))}
    </div>
  );
}
