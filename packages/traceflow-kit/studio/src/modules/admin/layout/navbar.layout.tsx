import { formatDuration } from '../functions/format.function';
import { statusBadgeClass } from '../functions/style.function';
import { useHeaderStore } from '../stores/header.store';

export function NavbarLayout(): React.JSX.Element {
  const eyebrow = useHeaderStore((state) => state.eyebrow);
  const title = useHeaderStore((state) => state.title);
  const summary = useHeaderStore((state) => state.summary);
  const mobileAction = useHeaderStore((state) => state.mobileAction);

  return (
    <header className="col-start-2 row-start-1 flex min-w-0 items-center justify-between gap-5 border-b border-zinc-200 bg-white/90 px-5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="min-w-0">
        <span className="text-[9px] font-extrabold tracking-[0.14em] text-zinc-500 uppercase">{eyebrow}</span>
        <h1 className="mt-0.5 max-w-[42vw] truncate text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
      </div>

      {mobileAction ? (
        <button
          className="hidden h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-[11px] font-semibold text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 max-md:flex"
          type="button"
          onClick={mobileAction.onClick}
        >
          <svg aria-hidden="true" className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M5.5 4h7M5.5 8h7M5.5 12h7" />
            <circle cx="2.75" cy="4" r=".7" fill="currentColor" stroke="none" />
            <circle cx="2.75" cy="8" r=".7" fill="currentColor" stroke="none" />
            <circle cx="2.75" cy="12" r=".7" fill="currentColor" stroke="none" />
          </svg>
          {mobileAction.label}
          {mobileAction.count !== undefined ? (
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{mobileAction.count}</span>
          ) : null}
        </button>
      ) : null}

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
