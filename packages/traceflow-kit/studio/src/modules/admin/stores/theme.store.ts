import { create } from 'zustand';
import { THEME_STORAGE_KEY } from '../constants/theme.constant';
import type { ThemeStore } from '../interfaces/theme-store.interface';
import type { ThemeMode } from '../types/theme.type';

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: readThemePreference(),
  setMode: (mode) => set({ mode }),
}));

export function persistThemePreference(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // La preferencia visual es opcional cuando el navegador bloquea storage.
  }
}

function readThemePreference(): ThemeMode {
  try {
    const preference = window.localStorage.getItem(THEME_STORAGE_KEY);
    return preference === 'light' || preference === 'dark' || preference === 'system' ? preference : 'dark';
  } catch {
    return 'dark';
  }
}
