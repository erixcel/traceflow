import { GROUPED_FLOW_TYPE_BORDER_CLASSES, GROUPED_FLOW_TYPE_HEADER_CLASSES, GROUPED_FLOW_TYPE_LABELS } from '../../flows/constants/grouped-flow.constant';
import type { CardGuide } from '../interfaces/card-guide.interface';

export function CardGuideComponent({ guide }: { guide: CardGuide }): React.JSX.Element {
  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900 ${GROUPED_FLOW_TYPE_BORDER_CLASSES[guide.type]}`}>
      <header className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${GROUPED_FLOW_TYPE_HEADER_CLASSES[guide.type]}`}>
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full border border-current text-[10px]" aria-hidden="true">
            ●
          </span>
          <h3 className="text-xs font-bold tracking-[0.12em] uppercase">{GROUPED_FLOW_TYPE_LABELS[guide.type]}</h3>
        </div>
        <code className="rounded-md bg-white/60 px-2 py-1 text-[9px] dark:bg-zinc-950/40">{guide.type}</code>
      </header>
      <div className="space-y-4 p-4">
        <p className="text-sm font-medium leading-6 text-zinc-800 dark:text-zinc-100">{guide.purpose}</p>
        <dl className="space-y-3 text-xs leading-5">
          <div>
            <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Dónde aparece</dt>
            <dd className="mt-0.5 text-zinc-500 dark:text-zinc-400">{guide.placement}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Qué contiene</dt>
            <dd className="mt-0.5 text-zinc-500 dark:text-zinc-400">{guide.content}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Interacción</dt>
            <dd className="mt-0.5 text-zinc-500 dark:text-zinc-400">{guide.interaction}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
