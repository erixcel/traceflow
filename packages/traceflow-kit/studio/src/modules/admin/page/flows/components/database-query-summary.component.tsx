import { getDatabaseOperation, getDatabaseTables, isDatabaseQuery } from '../functions/database-query.function';
import type { DatabaseQuerySummaryProps } from '../interfaces/database-query.interface';

export function DatabaseQuerySummaryComponent({ span, compact = false, appearance = 'inline' }: DatabaseQuerySummaryProps): React.JSX.Element | null {
  if (!isDatabaseQuery(span)) return null;
  const tables = getDatabaseTables(span);
  const operation = getDatabaseOperation(span) ?? span.methodName ?? 'Consulta';
  const visibleTables = compact ? tables.slice(0, 3) : tables;
  if (appearance === 'chips') {
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label={`Tablas afectadas: ${tables.join(', ') || 'ninguna identificada'}`}>
        {tables.length ? (
          tables.map((table) => (
            <span
              key={table}
              className="inline-flex min-h-6 items-center rounded-md border border-amber-300 bg-white/80 px-2 py-1 font-mono text-[10px] leading-none text-amber-800 dark:border-amber-800 dark:bg-zinc-950/70 dark:text-amber-200"
            >
              {table}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{span.attributes['traceflow.db.tables.status'] === 'parsed' ? 'Sin tablas afectadas' : 'Tablas no identificadas'}</span>
        )}
      </span>
    );
  }
  return (
    <span className={`flex min-w-0 items-baseline gap-2 ${compact ? '' : 'mt-1 flex-wrap'}`} role="group" aria-label={`${operation}; tablas afectadas: ${tables.join(', ') || 'ninguna identificada'}`}>
      <strong className={`${compact ? 'text-[11px]' : 'text-xs'} shrink-0 font-semibold text-zinc-900 dark:text-zinc-100`}>{operation}</strong>
      <span className={`${compact ? 'truncate' : 'break-words'} min-w-0 font-mono text-[10px] text-zinc-500 dark:text-zinc-400`} title={tables.join(' · ')}>
        {visibleTables.length ? visibleTables.join(' · ') : span.attributes['traceflow.db.tables.status'] === 'parsed' ? 'sin tablas' : 'tablas no identificadas'}
        {tables.length > visibleTables.length ? ` · +${tables.length - visibleTables.length}` : ''}
      </span>
    </span>
  );
}
