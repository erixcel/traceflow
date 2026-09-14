import { useRef } from 'react';
import { GROUPED_FLOW_CONTROL_CLASS } from '../constants/grouped-flow.constant';
import type { GroupedFlowDepthProps } from '../interfaces/grouped-flow.interface';

function levelLabel(depth: number): string {
  return Array.from({ length: depth }, () => '1').join('.');
}

export function GroupedFlowDepthComponent({ value, max, onChange }: GroupedFlowDepthProps): React.JSX.Element {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const levels = Array.from({ length: max }, (_, index) => index + 1);

  return (
    <details ref={detailsRef} className="pointer-events-auto relative z-30">
      <summary className={`${GROUPED_FLOW_CONTROL_CLASS} cursor-pointer list-none gap-2 [&::-webkit-details-marker]:hidden`}>
        <span aria-hidden="true" className="text-[13px] leading-none">
          ⇲
        </span>
        Expandir grupos
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{levelLabel(value)}</span>
      </summary>

      <div className="absolute right-0 bottom-[calc(100%+0.5rem)] w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100">Niveles visibles</p>
          <p className="mt-1 text-[9px] leading-4 text-zinc-500 dark:text-zinc-400">El nivel 1 conserva los pasos principales. Cada nivel adicional revela sus descendientes.</p>
        </div>

        <div className="grid max-h-64 gap-1 overflow-y-auto p-2" role="menu" aria-label="Profundidad visible del recorrido">
          {levels.map((depth) => {
            const selected = depth === value;
            return (
              <button
                key={depth}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                  selected ? 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300' : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
                onClick={() => {
                  onChange(depth);
                  detailsRef.current?.removeAttribute('open');
                }}
              >
                <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${selected ? 'border-pink-500' : 'border-zinc-300 dark:border-zinc-600'}`}>
                  {selected ? <span className="size-2 rounded-full bg-pink-500" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold">Nivel {levelLabel(depth)}</span>
                  <span className="mt-0.5 block text-[9px] text-zinc-500 dark:text-zinc-400">
                    {depth === 1 ? 'Solo pasos principales' : depth === 2 ? 'Incluye hijos directos' : `Incluye ${depth} niveles de la jerarquía`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}
