import { formatDuration } from '../../../functions/format.function';
import { formatTime } from '../functions/format.function';
import type { TraceHistoryCardProps } from '../interfaces/trace-history-card.interface';

const STATUS_PRESENTATION = {
  success: {
    label: 'Correcta',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    activeBorder: 'border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]',
    activeRail: 'bg-emerald-600 dark:bg-emerald-500',
    action: 'text-emerald-700 hover:text-emerald-600 focus-visible:ring-emerald-500/50 dark:text-emerald-400 dark:hover:text-emerald-300',
    focusRing: 'focus-visible:ring-emerald-500/60',
  },
  error: {
    label: 'Con error',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    dot: 'bg-rose-500',
    activeBorder: 'border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]',
    activeRail: 'bg-rose-500 dark:bg-rose-400',
    action: 'text-rose-700 hover:text-rose-600 focus-visible:ring-rose-500/50 dark:text-rose-400 dark:hover:text-rose-300',
    focusRing: 'focus-visible:ring-rose-500/60',
  },
  skipped: {
    label: 'Sin estado',
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    dot: 'bg-zinc-400 dark:bg-zinc-500',
    activeBorder: 'border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:shadow-[0_1px_3px_rgba(0,0,0,0.24)]',
    activeRail: 'bg-zinc-500 dark:bg-zinc-400',
    action: 'text-zinc-700 hover:text-zinc-600 focus-visible:ring-zinc-500/50 dark:text-zinc-300 dark:hover:text-zinc-200',
    focusRing: 'focus-visible:ring-zinc-500/60',
  },
} as const;

export function TraceHistoryCardComponent({ trace, active, onSelect, onShowDetails }: TraceHistoryCardProps): React.JSX.Element {
  const state = trace.status === 'success' ? 'success' : trace.status === 'error' ? 'error' : 'skipped';
  const status = STATUS_PRESENTATION[state];

  return (
    <article
      className={`group relative overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow,transform] duration-150 dark:bg-zinc-950 ${
        active
          ? status.activeBorder
          : 'border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-px hover:shadow-[0_3px_8px_rgba(0,0,0,0.07)] dark:border-zinc-800 dark:hover:shadow-[0_3px_10px_rgba(0,0,0,0.3)]'
      }`}
    >
      {active ? <span aria-hidden="true" className={`absolute inset-y-2 left-[-1px] z-10 w-[3px] rounded-r-full ${status.activeRail}`} /> : null}

      <button
        className={`flex w-full min-w-0 cursor-pointer flex-col border-0 bg-transparent px-3 pt-3 pb-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset ${status.focusRing}`}
        type="button"
        onClick={() => void onSelect(trace.traceId)}
        aria-pressed={active}
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className={`inline-flex h-5 items-center gap-1.5 rounded px-1.5 text-[9px] font-semibold ${status.badge}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <time className="shrink-0 text-[9px] tabular-nums text-zinc-400 dark:text-zinc-500">{formatTime(trace.updatedAt)}</time>
        </span>

        <span className="mt-2 line-clamp-2 text-[12px] leading-4 font-semibold text-zinc-900 dark:text-zinc-100">{trace.rootName}</span>
        <span className="mt-1 flex max-w-full items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
          <svg aria-hidden="true" className="size-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
            <rect x="2.5" y="3" width="11" height="4" rx="1" />
            <rect x="2.5" y="9" width="11" height="4" rx="1" />
            <path strokeLinecap="round" d="M5 5h.01M5 11h.01" />
          </svg>
          <span className="truncate">{trace.serviceName}</span>
        </span>
      </button>

      <div className="flex min-h-8 items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/80 px-3 dark:border-zinc-800 dark:bg-zinc-900/70">
        <span className="flex min-w-0 items-center gap-2 text-[9px] tabular-nums text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <svg aria-hidden="true" className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="5.25" />
              <path d="M8 5v3.25l2.1 1.25" />
            </svg>
            {formatDuration(trace.durationMs)}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span>{trace.spanCount} pasos</span>
        </span>
        <button
          className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded px-1 text-[9px] font-semibold outline-none transition focus-visible:ring-2 ${status.action}`}
          type="button"
          onClick={() => void onShowDetails(trace.traceId)}
          aria-label={`Ver detalles de ${trace.rootName}`}
        >
          Detalles
          <svg aria-hidden="true" className="size-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" />
          </svg>
        </button>
      </div>
    </article>
  );
}
