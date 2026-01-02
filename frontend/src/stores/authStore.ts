import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { requestNotificationPermission, shouldAskPermission } from '../services/pushNotification';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(email, password);
          set({ user: data.user, token: data.token, isLoading: false });
          connectSocket();
          if (shouldAskPermission()) requestNotificationPermission();
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.register({ email, password, name });
          set({ user: data.user, token: data.token, isLoading: false });
          connectSocket();
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout: () => {
        disconnectSocket();
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) {
          set({ isInitialized: true });
          return;
        }
        try {
          const { data } = await authApi.me();
          set({ user: data, isInitialized: true });
          connectSocket(data.currentTeamId || undefined);
        } catch {
          get().logout();
          set({ isInitialized: true });
        }
      },

      updateUser: (updates) => {
        const user = get().user;
        if (user) set({ user: { ...user, ...updates } });
      },
    }),
    { name: 'orbit-auth', partialize: (state) => ({ token: state.token }) }
  )
);
