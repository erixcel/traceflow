export function StudioPlaceholderLayout(): React.JSX.Element {
  return (
    <section className="grid h-full place-items-center bg-zinc-50 p-8 text-center dark:bg-zinc-950">
      <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-[10px] font-extrabold tracking-[0.14em] text-pink-600 uppercase dark:text-pink-400">Próximamente</span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">TraceFlow Studio</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Esta ruta ya forma parte del módulo Admin y queda preparada para la siguiente funcionalidad.</p>
      </div>
    </section>
  );
}
