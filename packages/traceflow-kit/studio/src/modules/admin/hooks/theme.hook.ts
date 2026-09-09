import { useEffect } from 'react';
import { persistThemePreference, useThemeStore } from '../stores/theme.store';

export function useTheme(): void {
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (): void => {
      const isDark = mode === 'dark' || (mode === 'system' && colorScheme.matches);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    };

    applyTheme();
    persistThemePreference(mode);

    if (mode !== 'system') {
      return;
    }

    colorScheme.addEventListener('change', applyTheme);
    return () => colorScheme.removeEventListener('change', applyTheme);
  }, [mode]);
}
