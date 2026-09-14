import { useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import { formatDuration } from '../../../functions/format.function';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { GROUPED_FLOW_TYPE_STEP_CLASSES } from '../constants/grouped-flow.constant';
import { isDatabaseQuery } from '../functions/database-query.function';
import { groupConcurrentSpans, hasMonotonicTiming } from '../functions/execution-flow.function';
import { formatMethodLabel } from '../functions/format.function';
import type { GroupedStepsProps } from '../interfaces/grouped-flow.interface';
import { DatabaseQuerySummaryComponent } from './database-query-summary.component';
import { GroupedFlowStatusComponent } from './grouped-flow-status.component';

export function GroupedFlowStepsComponent({
  nodes,
  ownerId,
  openedSpanId,
  query,
  matchedIds,
  compact = false,
  visibleDepth = Number.POSITIVE_INFINITY,
  openAsCard = false,
  prefix = '',
}: GroupedStepsProps): React.JSX.Element {
  const { openStep, selectCard } = useContext(GroupedFlowContext);
  const groups = groupConcurrentSpans(nodes.map((node) => node.span));
  const byId = new Map(nodes.map((node) => [node.span.spanId, node]));
  return (
    <div className="space-y-1">
      {groups.map((group, groupIndex) => (
        <div key={group[0]?.spanId}>
          {groupIndex > 0 && !prefix ? (
            <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[9px] text-zinc-400">
              <span aria-hidden="true">↓</span> Después
            </p>
          ) : null}
          <div className={group.length > 1 ? 'rounded-lg border border-zinc-200/70 bg-white/60 p-1 dark:border-zinc-700/60 dark:bg-zinc-900/30' : ''}>
            {group.length > 1 ? (
              <p className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
                <span>⑂ {hasMonotonicTiming(group) ? 'En paralelo' : 'Solapamiento estimado'}</span>
                <span>{group.length} llamadas</span>
              </p>
            ) : null}
            {group.map((span, branchIndex) => {
              const node = byId.get(span.spanId)!;
              const label = `${prefix}${groupIndex + 1}${group.length > 1 ? String.fromCharCode(65 + branchIndex) : ''}`;
              const selected = !openAsCard && openedSpanId === span.spanId;
              return (
                <div key={span.spanId} className={query && !matchedIds.has(span.spanId) ? 'opacity-35' : ''}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (openAsCard) selectCard(span.spanId, span);
                        else openStep(ownerId, span);
                      }}
                      aria-label={`${openAsCard ? 'Ir al' : selected ? 'Cerrar' : 'Abrir'} paso ${label}: ${span.name}`}
                      aria-expanded={selected}
                      aria-controls={selected ? `card-detail-${span.spanId}` : undefined}
                      className={`nodrag nopan group flex min-h-9 w-full cursor-pointer items-center gap-1.5 rounded-md border-l-2 px-2 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-pink-500 ${selected ? 'bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'} ${GROUPED_FLOW_TYPE_STEP_CLASSES[span.type]}`}
                      title={`${formatMethodLabel(span)} · ${openAsCard ? 'Ir a la tarjeta del proceso' : selected ? 'Cerrar tarjeta' : 'Abrir tarjeta a la derecha'}`}
                    >
                      <span className="flex min-w-5 shrink-0 items-center justify-center rounded bg-zinc-100 px-1 py-0.5 font-mono text-[8px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {label}
                      </span>
                      <GroupedFlowStatusComponent status={span.status} />
                      {isDatabaseQuery(span) ? (
                        <span className="min-w-0 flex-1">
                          <DatabaseQuerySummaryComponent span={span} compact />
                        </span>
                      ) : (
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-200">{span.name}</span>
                          {!compact ? <span className="block truncate font-mono text-[9px] text-zinc-400">{span.methodName ?? span.type}</span> : null}
                        </span>
                      )}
                      <span className="shrink-0 font-mono text-[9px] text-zinc-500 dark:text-zinc-400">{formatDuration(span.durationMs)}</span>
                      <span aria-hidden="true" className={`text-xs ${selected ? 'text-pink-500' : 'text-zinc-400 group-hover:text-pink-500'}`}>
                        ›
                      </span>
                    </button>
                    {selected ? <Handle type="source" position={Position.Right} id={`step-${span.spanId}`} className="!size-1.5 !border-0 !bg-zinc-400" /> : null}
                  </div>
                  {visibleDepth > 1 && node.children.length ? (
                    <div className="mt-0.5 mb-1 ml-3 border-l border-zinc-200 pl-1.5 dark:border-zinc-700">
                      <GroupedFlowStepsComponent
                        nodes={node.children}
                        ownerId={ownerId}
                        openedSpanId={openedSpanId}
                        query={query}
                        matchedIds={matchedIds}
                        compact
                        visibleDepth={visibleDepth - 1}
                        prefix={`${label}.`}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
