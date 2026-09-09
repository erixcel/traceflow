import { getVisibleHttpInputSections, summarizeHttpInputSection } from '../functions/http-input.function';
import type { HttpInputSummaryProps } from '../interfaces/http-input.interface';
import { useHttpInputStore } from '../stores/http-input.store';

export function HttpInputSummaryComponent({ input, omit = [] }: HttpInputSummaryProps): React.JSX.Element | null {
  const preferences = useHttpInputStore((state) => state.preferences);
  const sections = getVisibleHttpInputSections(input, preferences, omit);
  if (!sections.length) return null;
  return (
    <div className="mt-3 grid gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
      {sections.map((section) => {
        const summary = summarizeHttpInputSection(section);
        return (
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2 rounded-md bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900/70" key={section.key}>
            <span className="text-[8px] font-semibold tracking-wide text-zinc-400 uppercase">{section.label}</span>
            <code className="truncate text-right text-[9px] text-zinc-600 dark:text-zinc-300" title={summary}>
              {summary}
            </code>
          </div>
        );
      })}
    </div>
  );
}
