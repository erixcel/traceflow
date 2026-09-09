export function statusBadgeClass(status: string): string {
  const base = 'inline-flex h-5 items-center rounded-full border px-2 text-[9px] font-bold tracking-wide uppercase';
  return status === 'success'
    ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`
    : status === 'error'
      ? `${base} border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300`
      : `${base} border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`;
}
