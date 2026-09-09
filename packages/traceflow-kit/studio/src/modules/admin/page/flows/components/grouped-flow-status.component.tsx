import type { GroupedStatusProps } from '../interfaces/grouped-flow.interface';

export function GroupedFlowStatusComponent({ status }: GroupedStatusProps): React.JSX.Element {
  return (
    <span
      aria-label={status === 'error' ? 'Error' : status === 'success' ? 'Correcto' : 'Sin confirmar'}
      className={`grid size-4 shrink-0 place-items-center rounded-full text-[10px] ${status === 'error' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300' : status === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}
    >
      {status === 'error' ? '!' : status === 'success' ? '✓' : '·'}
    </span>
  );
}
