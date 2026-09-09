import { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '../stores/theme.store';
import type { ThemeMode } from '../types/theme.type';

const THEME_OPTIONS: ReadonlyArray<{ mode: ThemeMode; label: string }> = [
  { mode: 'system', label: 'Sistema' },
  { mode: 'light', label: 'Claro' },
  { mode: 'dark', label: 'Oscuro' },
];

export function ThemeMenuComponent(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectTheme = (nextMode: ThemeMode): void => {
    setMode(nextMode);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        className={`group flex w-[3.75rem] cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold transition ${
          open
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
        }`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="theme-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <ThemeIcon mode={mode} className="size-5" />
        <span>Tema</span>
      </button>

      {open ? (
        <div
          id="theme-menu"
          className="absolute bottom-0 left-[calc(100%+0.25rem)] z-50 w-44 rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-700 shadow-[0_12px_32px_rgba(24,24,27,0.16)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)]"
          role="menu"
          aria-label="Seleccionar tema visual"
        >
          <span aria-hidden="true" className="absolute bottom-4 -left-[7px] size-3 rotate-45 border-b border-l border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900" />
          <p className="px-2 pt-1 pb-1.5 text-[9px] font-bold tracking-[0.12em] text-zinc-400 uppercase dark:text-zinc-500">Apariencia</p>
          {THEME_OPTIONS.map((option) => {
            const selected = option.mode === mode;
            return (
              <button
                key={option.mode}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[11px] transition ${
                  selected ? 'bg-pink-50 font-semibold text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => selectTheme(option.mode)}
              >
                <ThemeIcon mode={option.mode} className="size-4 shrink-0" />
                <span>{option.label}</span>
                {selected ? (
                  <svg aria-hidden="true" className="ml-auto size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3.5 8 3 3 6-6" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ThemeIcon({ mode, className }: { mode: ThemeMode; className: string }): React.JSX.Element {
  if (mode === 'light') {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="10" cy="10" r="3.25" />
        <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.35 4.35l1.05 1.05M14.6 14.6l1.05 1.05M15.65 4.35 14.6 5.4M5.4 14.6l-1.05 1.05" />
      </svg>
    );
  }

  if (mode === 'dark') {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.4 12.35A6.8 6.8 0 0 1 7.65 3.6a6.8 6.8 0 1 0 8.75 8.75Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.75" y="3.5" width="14.5" height="10.5" rx="1.75" />
      <path d="M7.25 17h5.5M10 14v3" />
    </svg>
  );
}
