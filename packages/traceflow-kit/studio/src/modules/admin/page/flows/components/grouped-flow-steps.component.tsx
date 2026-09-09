import { useContext } from 'react';
import { formatDuration } from '../../../functions/format.function';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { GROUPED_FLOW_TYPE_STEP_CLASSES } from '../constants/grouped-flow.constant';
import { isDatabaseQuery } from '../functions/database-query.function';
import { groupConcurrentSpans, hasMonotonicTiming } from '../functions/execution-flow.function';
import { formatMethodLabel } from '../functions/format.function';
import type { GroupedStepsProps } from '../interfaces/grouped-flow.interface';
import { DatabaseQuerySummaryComponent } from './database-query-summary.component';
import { GroupedFlowStatusComponent } from './grouped-flow-status.component';

export function GroupedFlowStepsComponent({ nodes, query, matchedIds, compact = false }: GroupedStepsProps): React.JSX.Element {
  const { selectSpan } = useContext(GroupedFlowContext);
  const groups = groupConcurrentSpans(nodes.map((node) => node.span));
  const byId = new Map(nodes.map((node) => [node.span.spanId, node]));
  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <div key={group[0]?.spanId} className={group.length > 1 && !compact ? 'my-1 rounded-lg border border-violet-200/70 bg-violet-50/40 p-1 dark:border-violet-900/60 dark:bg-violet-500/5' : ''}>
          {group.length > 1 && !compact ? (
            <p className="px-2 pt-1 pb-0.5 text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
              ⑂ {hasMonotonicTiming(group) ? 'Llamadas simultáneas' : 'Solapamiento estimado'} · {group.length}
            </p>
          ) : null}
          {group.map((span) => {
            const node = byId.get(span.spanId)!;
            const databaseQuery = isDatabaseQuery(span);
            return (
              <div key={span.spanId} className={query && !matchedIds.has(span.spanId) ? 'opacity-35' : ''}>
                <button
                  onClick={() => selectSpan(span)}
                  className={`nodrag nopan flex w-full cursor-pointer items-center gap-2 rounded-md border-l-2 px-2 text-left transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-pink-500 dark:hover:bg-zinc-800 ${GROUPED_FLOW_TYPE_STEP_CLASSES[span.type]} ${compact ? 'py-1' : 'py-1.5'}`}
                  title={`${formatMethodLabel(span)} · Inspeccionar paso`}
                >
                  <GroupedFlowStatusComponent status={span.status} />
                  {databaseQuery ? (
                    <span className="min-w-0 flex-1">
                      <DatabaseQuerySummaryComponent span={span} compact />
                    </span>
                  ) : (
                    <span className={`min-w-0 flex-1 ${compact ? 'flex items-baseline gap-2' : ''}`}>
                      <span className="block truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-200">{span.name}</span>
                      <span className="block truncate font-mono text-[9px] text-zinc-400">{span.methodName ?? span.type}</span>
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[9px] text-zinc-500 dark:text-zinc-400">{formatDuration(span.durationMs)}</span>
                </button>
                {node.children.length ? (
                  <div className="ml-4 border-l border-zinc-200 pl-1 dark:border-zinc-700">
                    <GroupedFlowStepsComponent nodes={node.children} query={query} matchedIds={matchedIds} compact={compact} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
