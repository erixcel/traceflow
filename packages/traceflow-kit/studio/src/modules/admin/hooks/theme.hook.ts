import { useEffect } from 'react';
import { persistThemePreference, useThemeStore } from '../stores/theme.store';

export function useTheme(): void {
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    const root = document.documentElement;
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    let releaseTransitionsFrame = 0;

    const applyTheme = (): void => {
      const isDark = mode === 'dark' || (mode === 'system' && colorScheme.matches);
      window.cancelAnimationFrame(releaseTransitionsFrame);
      root.classList.add('theme-switching');
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';

      // Calcula el nuevo tema sin transiciones antes del siguiente pintado.
      void root.offsetWidth;
      releaseTransitionsFrame = window.requestAnimationFrame(() => root.classList.remove('theme-switching'));
    };

    applyTheme();
    persistThemePreference(mode);

    if (mode === 'system') {
      colorScheme.addEventListener('change', applyTheme);
    }

    return () => {
      window.cancelAnimationFrame(releaseTransitionsFrame);
      root.classList.remove('theme-switching');
      colorScheme.removeEventListener('change', applyTheme);
    };
  }, [mode]);
}
