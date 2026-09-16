import { create } from 'zustand';
import type { HeaderStore } from '../interfaces/header.interface';

export const useHeaderStore = create<HeaderStore>((set) => ({
  eyebrow: 'TraceFlow',
  title: 'Studio',
  summary: null,
  mobileAction: null,
  setHeader: (content) => set(content),
  setMobileAction: (mobileAction) => set({ mobileAction }),
}));
