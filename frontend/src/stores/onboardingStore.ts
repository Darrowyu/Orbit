import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingStore {
  isRunning: boolean;
  stepIndex: number;
  hasCompletedOnce: boolean;
  startTour: () => void;
  stopTour: () => void;
  setStepIndex: (index: number) => void;
  completeTour: () => void;
  resetTour: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      isRunning: false,
      stepIndex: 0,
      hasCompletedOnce: false,
      startTour: () => set({ isRunning: true, stepIndex: 0 }),
      stopTour: () => set({ isRunning: false }),
      setStepIndex: (index) => set({ stepIndex: index }),
      completeTour: () => set({ isRunning: false, stepIndex: 0, hasCompletedOnce: true }),
      resetTour: () => set({ hasCompletedOnce: false }),
    }),
    { name: 'orbit-onboarding', partialize: (state) => ({ hasCompletedOnce: state.hasCompletedOnce }) } // 只持久化完成标记，运行态不落地
  )
);

if (import.meta.hot) {
  import.meta.hot.accept();
}
