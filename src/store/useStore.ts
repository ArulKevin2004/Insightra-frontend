import { create } from 'zustand';

interface AppState {
  currentModel: string;
  driftStatus: 'Stable' | 'Drift Detected' | 'Retraining';
  systemHealthy: boolean;
  setCurrentModel: (model: string) => void;
  setDriftStatus: (status: 'Stable' | 'Drift Detected' | 'Retraining') => void;
  setSystemHealthy: (healthy: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  currentModel: 'XGBoost v2.1',
  driftStatus: 'Stable',
  systemHealthy: true,
  setCurrentModel: (model) => set({ currentModel: model }),
  setDriftStatus: (status) => set({ driftStatus: status }),
  setSystemHealthy: (healthy) => set({ systemHealthy: healthy }),
}));
