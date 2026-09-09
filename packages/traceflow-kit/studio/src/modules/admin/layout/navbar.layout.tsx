import { formatDuration } from '../functions/format.function';
import { statusBadgeClass } from '../functions/style.function';
import { useHeaderStore } from '../stores/header.store';

export function NavbarLayout(): React.JSX.Element {
  const eyebrow = useHeaderStore((state) => state.eyebrow);
  const title = useHeaderStore((state) => state.title);
  const summary = useHeaderStore((state) => state.summary);

  return (
    <header className="col-start-2 row-start-1 flex min-w-0 items-center justify-between gap-5 border-b border-zinc-200 bg-white/90 px-5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="min-w-0">
        <span className="text-[9px] font-extrabold tracking-[0.14em] text-zinc-500 uppercase">{eyebrow}</span>
        <h1 className="mt-0.5 max-w-[42vw] truncate text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
      </div>

      {summary ? (
        <div className="hidden items-center gap-3 text-[11px] text-zinc-500 md:flex dark:text-zinc-400">
          <span className="hidden xl:inline">{summary.serviceName}</span>
          <strong className="text-zinc-800 dark:text-zinc-200">{formatDuration(summary.durationMs)}</strong>
          <span className="hidden lg:inline">{summary.spanCount} spans</span>
          <span className={statusBadgeClass(summary.status)}>{summary.status}</span>
        </div>
      ) : null}
    </header>
  );
}
