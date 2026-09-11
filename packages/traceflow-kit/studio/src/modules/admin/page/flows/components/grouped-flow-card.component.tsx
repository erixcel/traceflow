import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { useContext, useLayoutEffect } from 'react';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import type { NodeProps } from '@xyflow/react';
import { formatDuration } from '../../../functions/format.function';
import { GROUPED_FLOW_TYPE_BORDER_CLASSES, GROUPED_FLOW_TYPE_HANDLE_CLASSES, GROUPED_FLOW_TYPE_HEADER_CLASSES, GROUPED_FLOW_TYPE_LABELS } from '../constants/grouped-flow.constant';
import type { GroupedCardNode } from '../types/grouped-flow.type';
import { GroupedFlowEntryComponent } from './grouped-flow-entry.component';
import { GroupedFlowOutputComponent } from './grouped-flow-output.component';
import { GroupedFlowProcessComponent } from './grouped-flow-process.component';
import { GroupedFlowStatusComponent } from './grouped-flow-status.component';

export function GroupedFlowCardComponent({ data }: NodeProps<GroupedCardNode>): React.JSX.Element {
  const { closeDetail, selectSpan, fit } = useContext(GroupedFlowContext);
  const updateNodeInternals = useUpdateNodeInternals();
  useLayoutEffect(() => {
    updateNodeInternals(data.cardId);
  }, [data.cardId, data.expanded, data.openedSpanId, data.node, updateNodeInternals]);
  const status = data.kind === 'output' ? data.traceStatus : (data.node?.span.status ?? 'unset');
  const nodeType = data.kind === 'entry' ? 'controller' : (data.node?.span.type ?? 'custom');
  const borderClass = status === 'error' ? 'border-rose-300 dark:border-rose-800' : data.kind === 'output' ? 'border-emerald-200 dark:border-emerald-900' : GROUPED_FLOW_TYPE_BORDER_CLASSES[nodeType];
  const headerClass =
    data.kind === 'output'
      ? 'border-emerald-100 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-300'
      : GROUPED_FLOW_TYPE_HEADER_CLASSES[nodeType];
  const handleClass = status === 'error' ? '!bg-rose-400' : data.kind === 'output' ? '!bg-emerald-400' : GROUPED_FLOW_TYPE_HANDLE_CLASSES[nodeType];
  const targetSpan = data.kind === 'entry' ? (data.node?.span ?? data.request?.span) : data.node?.span;
  const onHeaderClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    if (targetSpan) {
      selectSpan(targetSpan, data.kind === 'output' ? 'output' : undefined);
      if (data.detail) {
        fit();
      } else if (data.openedSpanId) {
        fit({ cardIds: [data.cardId, `detail-${data.openedSpanId}`] });
      } else {
        fit({ cardIds: [data.cardId] });
      }
    }
  };
  return (
    <article
      aria-label={`${data.detail ? 'Detalle' : data.kind === 'entry' ? 'Entrada' : data.kind === 'output' ? 'Salida' : 'Proceso'}: ${data.node?.span.name ?? 'Sin registro'}`}
      id={`card-${data.cardId}`}
      className={`pointer-events-auto relative w-full rounded-xl border bg-white text-zinc-800 shadow-[0_4px_18px_-8px_rgba(24,24,27,0.18)] transition-opacity dark:bg-[#191a21] dark:text-zinc-100 ${borderClass} ${data.highlighted ? '' : 'opacity-30'}`}
    >
      {data.kind !== 'entry' ? <Handle type="target" position={Position.Left} id="left" className={`!size-2 !border-2 !border-white dark:!border-zinc-800 ${handleClass}`} /> : null}
      {data.kind !== 'output' && !data.detail ? <Handle type="source" position={Position.Right} id="right" className={`!size-2 !border-2 !border-white dark:!border-zinc-800 ${handleClass}`} /> : null}
      <Handle type="target" position={Position.Top} id="top" className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!opacity-0" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!opacity-0" />
      <header onClick={onHeaderClick} className={`flex cursor-pointer items-center justify-between gap-2 rounded-t-xl border-b px-4 py-1.5 ${headerClass}`}>
        <span className="text-[9px] font-semibold tracking-wider uppercase">
          {data.kind === 'entry' ? '↳ Controller' : data.kind === 'output' ? '↗ Resultado' : `${data.stepLabel} · ${GROUPED_FLOW_TYPE_LABELS[data.node?.span.type ?? 'custom'] ?? 'Operación'}`}
        </span>
        <span className="flex items-center gap-1.5">
          <GroupedFlowStatusComponent status={status} />
          {data.kind === 'process' && data.node ? <span className="font-mono text-[9px] opacity-70">{formatDuration(data.node.span.durationMs)}</span> : null}
          {data.detail ? (
            <button
              className="nodrag nopan ml-1 flex size-5 cursor-pointer items-center justify-center rounded hover:bg-black/5 focus:outline-none focus-visible:outline-2 focus-visible:outline-pink-500 dark:hover:bg-white/10"
              aria-label={`Cerrar detalle de ${data.node?.span.name}`}
              onClick={() => closeDetail(data.cardId)}
            >
              ×
            </button>
          ) : null}
        </span>
      </header>
      {data.kind === 'entry' ? <GroupedFlowEntryComponent data={data} /> : data.kind === 'output' ? <GroupedFlowOutputComponent data={data} /> : <GroupedFlowProcessComponent data={data} />}
    </article>
  );
}
