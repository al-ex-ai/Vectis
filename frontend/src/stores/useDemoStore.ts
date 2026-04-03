import { create } from 'zustand';
import { api } from '@services/api';

interface HealthData {
  demo_mode: boolean;
  demo_email: string;
  demo_password: string;
}

interface DemoState {
  demoMode: boolean;
  demoEmail: string;
  demoPassword: string;
  loaded: boolean;
  toastOpen: boolean;
  fetchDemoMode: () => Promise<void>;
  showDemoToast: () => void;
  closeDemoToast: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  demoMode: false,
  demoEmail: '',
  demoPassword: '',
  loaded: false,
  toastOpen: false,
  fetchDemoMode: async () => {
    try {
      const data = await api.get<HealthData>('/health');
      set({
        demoMode: data.demo_mode,
        demoEmail: data.demo_email ?? '',
        demoPassword: data.demo_password ?? '',
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
  showDemoToast: () => set({ toastOpen: true }),
  closeDemoToast: () => set({ toastOpen: false }),
}));
