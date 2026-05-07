import { create } from "zustand";

type AnalyticsState = {
  loading: boolean;
  lastComputedAt: number | null;
  hasSufficientData: boolean;
  setLoading: (loading: boolean) => void;
  setSufficiency: (hasSufficientData: boolean) => void;
  setComputedAt: (timestamp: number) => void;
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  loading: true,
  lastComputedAt: null,
  hasSufficientData: false,
  setLoading: (loading) => set({ loading }),
  setSufficiency: (hasSufficientData) => set({ hasSufficientData }),
  setComputedAt: (timestamp) => set({ lastComputedAt: timestamp }),
}));

