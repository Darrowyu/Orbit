import { create } from 'zustand';
import { Label } from '../types';
import { labelApi } from '../services/api';

interface LabelState {
  labels: Label[];
  isLoading: boolean;
  fetchLabels: () => Promise<void>;
  setLabels: (labels: Label[]) => void;
  addLabel: (label: Label) => void;
  updateLabel: (id: string, data: Partial<Label>) => void;
  removeLabel: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useLabelStore = create<LabelState>((set, get) => ({
  labels: [],
  isLoading: false,
  fetchLabels: async () => {
    if (get().labels.length > 0) return;
    set({ isLoading: true });
    try {
      const { data } = await labelApi.getAll();
      set({ labels: data });
    } catch { /* 静默处理 */ }
    finally { set({ isLoading: false }); }
  },
  setLabels: (labels) => set({ labels }),
  addLabel: (label) => set((s) => ({ labels: [...s.labels, label] })),
  updateLabel: (id, data) => set((s) => ({ labels: s.labels.map((l) => l.id === id ? { ...l, ...data } : l) })),
  removeLabel: (id) => set((s) => ({ labels: s.labels.filter((l) => l.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
}));
