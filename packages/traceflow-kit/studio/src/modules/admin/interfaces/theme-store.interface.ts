import type { ThemeMode } from '../types/theme.type';

export interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}
