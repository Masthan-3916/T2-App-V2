// src/store/authStore.ts
import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { apiClient } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setTokenAndFetchUser: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const storeCreator: StateCreator<AuthState, [['zustand/persist', unknown]]> = (set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  setTokenAndFetchUser: async (token: string) => {
    set({ isLoading: true });
    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const res = await apiClient.get('/auth/me');
      set({
        accessToken: token,
        user: res.data.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, accessToken: null, user: null, isAuthenticated: false });
      delete apiClient.defaults.headers.common['Authorization'];
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch { /* ignore */ }
    set({ user: null, accessToken: null, isAuthenticated: false });
    delete apiClient.defaults.headers.common['Authorization'];
  },

  refreshToken: async () => {
    try {
      const res = await apiClient.post('/auth/refresh');
      const token = res.data.data?.access_token;
      if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ accessToken: token });
        return true;
      }
      return false;
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false });
      return false;
    }
  },
});

export const useAuthStore = create<AuthState>()(
  persist(storeCreator, {
    name: 't2-auth',
    partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
  })
);
