import { create } from 'zustand';
import { adminApi } from '../services/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  color: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { teamMembers: number; ownedTeams: number };
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  disabledUsers: number;
  totalTeams: number;
  totalTasks: number;
}

interface LoginLog {
  id: string;
  userId: string;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface AdminStore {
  users: AdminUser[];
  stats: AdminStats | null;
  loginLogs: LoginLog[];
  total: number;
  page: number;
  isLoading: boolean;
  fetchStats: () => Promise<void>;
  fetchUsers: (query?: { page?: number; search?: string; status?: string }) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  resetPassword: (id: string, password: string) => Promise<void>;
  setSuperAdmin: (id: string, value: boolean) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  fetchLoginLogs: (userId?: string, page?: number) => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set) => ({
  users: [],
  stats: null,
  loginLogs: [],
  total: 0,
  page: 1,
  isLoading: false,

  fetchStats: async () => {
    try {
      const { data } = await adminApi.getStats();
      set({ stats: data });
    } catch (e) { console.error('fetchStats error:', e); }
  },

  fetchUsers: async (query = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await adminApi.getUsers(query);
      set({ users: data.users, total: data.total, page: data.page, isLoading: false });
    } catch (e) { console.error('fetchUsers error:', e); set({ isLoading: false }); }
  },

  toggleUserStatus: async (id) => {
    const { data } = await adminApi.toggleStatus(id);
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, isActive: data.isActive } : u)) }));
  },

  resetPassword: async (id, password) => {
    await adminApi.resetPassword(id, password);
  },

  setSuperAdmin: async (id, value) => {
    const { data } = await adminApi.setAdmin(id, value);
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, isSuperAdmin: data.isSuperAdmin } : u)) }));
  },

  deleteUser: async (id) => {
    await adminApi.deleteUser(id);
    set((s) => ({ users: s.users.filter((u) => u.id !== id), total: s.total - 1 }));
  },

  fetchLoginLogs: async (userId, page = 1) => {
    try {
      const { data } = await adminApi.getLoginLogs(userId, page);
      set({ loginLogs: data.logs });
    } catch (e) { console.error('fetchLoginLogs error:', e); }
  },
}));
