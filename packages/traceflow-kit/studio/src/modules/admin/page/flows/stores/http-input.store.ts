import { create } from 'zustand';
import { cloneDefaultHttpInputPreferences, persistHttpInputPreferences, readHttpInputPreferences } from '../functions/http-input.function';
import type { HttpInputStore } from '../interfaces/http-input.interface';

export const useHttpInputStore = create<HttpInputStore>((set) => ({
  preferences: readHttpInputPreferences(),
  setSection: (section, visible) =>
    set((state) => {
      const preferences = { ...state.preferences, visible: { ...state.preferences.visible, [section]: visible } };
      persistHttpInputPreferences(preferences);
      return { preferences };
    }),
  setHideEmpty: (hideEmpty) =>
    set((state) => {
      const preferences = { ...state.preferences, hideEmpty };
      persistHttpInputPreferences(preferences);
      return { preferences };
    }),
  reset: () => {
    const preferences = cloneDefaultHttpInputPreferences();
    persistHttpInputPreferences(preferences);
    set({ preferences });
  },
}));
