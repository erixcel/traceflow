import { HTTP_INPUT_SECTIONS } from '../constants/http-input.constant';
import { useHttpInputStore } from '../stores/http-input.store';

export function HttpInputSettingsComponent(): React.JSX.Element {
  const preferences = useHttpInputStore((state) => state.preferences);
  const setSection = useHttpInputStore((state) => state.setSection);
  const setHideEmpty = useHttpInputStore((state) => state.setHideEmpty);
  const reset = useHttpInputStore((state) => state.reset);
  const visibleCount = Object.values(preferences.visible).filter(Boolean).length;
  return (
    <details className="relative z-30">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-0 text-[11px] font-semibold text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-white [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true">⚙</span>
        Visualizar
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{visibleCount}</span>
      </summary>
      <div className="absolute top-[calc(100%+0.5rem)] right-0 w-64 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 dark:border-zinc-800">
          <div>
            <p className="text-[11px] font-semibold">Datos HTTP visibles</p>
            <p className="mt-0.5 text-[9px] text-zinc-500">La preferencia queda guardada en Studio.</p>
          </div>
          <button className="text-[9px] font-semibold text-pink-600 hover:text-pink-700 dark:text-pink-400" type="button" onClick={reset}>
            Restablecer
          </button>
        </div>
        <div className="grid gap-1 py-2">
          {HTTP_INPUT_SECTIONS.map(({ key, label }) => (
            <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-[10px] hover:bg-zinc-50 dark:hover:bg-zinc-800" key={key}>
              <span>{label}</span>
              <input
                className="size-3.5 accent-pink-600"
                type="checkbox"
                aria-label={`Mostrar ${label}`}
                checked={preferences.visible[key]}
                onChange={(event) => setSection(key, event.target.checked)}
              />
            </label>
          ))}
        </div>
        <label className="flex cursor-pointer items-center justify-between border-t border-zinc-100 px-2 pt-2 text-[10px] dark:border-zinc-800">
          <span>Ocultar secciones vacías</span>
          <input className="size-3.5 accent-pink-600" type="checkbox" aria-label="Ocultar secciones vacías" checked={preferences.hideEmpty} onChange={(event) => setHideEmpty(event.target.checked)} />
        </label>
      </div>
    </details>
  );
}
