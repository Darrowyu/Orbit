import { create } from 'zustand';
import { Label } from '../types';

interface LabelState {
  labels: Label[];
  isLoading: boolean;
  setLabels: (labels: Label[]) => void;
  addLabel: (label: Label) => void;
  updateLabel: (id: string, data: Partial<Label>) => void;
  removeLabel: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useLabelStore = create<LabelState>((set) => ({
  labels: [],
  isLoading: false,
  setLabels: (labels) => set({ labels }),
  addLabel: (label) => set((s) => ({ labels: [...s.labels, label] })),
  updateLabel: (id, data) => set((s) => ({ labels: s.labels.map((l) => l.id === id ? { ...l, ...data } : l) })),
  removeLabel: (id) => set((s) => ({ labels: s.labels.filter((l) => l.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
}));
