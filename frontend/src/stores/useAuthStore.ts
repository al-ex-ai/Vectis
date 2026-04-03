import { create } from 'zustand';
import { api } from '@services/api';
import type { User, Organization, MeResponse } from '@typedefs/index';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setAuth: (user: User, organization: Organization, token?: string) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  fetchMe: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  organization: null,
  token: localStorage.getItem('vectis_token'),
  isAuthenticated: false,
  loading: true,
  setAuth: (user, organization, token) => {
    if (token) {
      localStorage.setItem('vectis_token', token);
    }
    set({ user, organization, token: token ?? get().token, isAuthenticated: true, loading: false });
  },
  setToken: (token) => {
    localStorage.setItem('vectis_token', token);
    set({ token });
  },
  clearAuth: () => {
    localStorage.removeItem('vectis_token');
    set({ user: null, organization: null, token: null, isAuthenticated: false, loading: false });
  },
  fetchMe: async () => {
    try {
      const data = await api.get<MeResponse>('/auth/me');
      set({ user: data.user, organization: data.organization, isAuthenticated: true, loading: false });
      return true;
    } catch {
      localStorage.removeItem('vectis_token');
      set({ user: null, organization: null, token: null, isAuthenticated: false, loading: false });
      return false;
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    localStorage.removeItem('vectis_token');
    set({ user: null, organization: null, token: null, isAuthenticated: false, loading: false });
  },
}));
