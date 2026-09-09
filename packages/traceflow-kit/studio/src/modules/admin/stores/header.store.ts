import { create } from 'zustand';
import type { HeaderStore } from '../interfaces/header.interface';

export const useHeaderStore = create<HeaderStore>((set) => ({
  eyebrow: 'TraceFlow',
  title: 'Studio',
  summary: null,
  setHeader: (content) => set(content),
}));
