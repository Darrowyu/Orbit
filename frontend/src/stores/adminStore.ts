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

interface TrendData { dates: string[]; newUsers: number[]; completedTasks: number[]; activeUsers: number[] }
interface HealthIndicators { overdueTasks: number; inactiveUsers: number; unassignedTasks: number; storageSize: number; fileCount: number }
interface AdminTeam { id: string; name: string; code: string; createdAt: string; owner: { id: string; name: string; avatar: string; color: string }; _count: { members: number; projects: number; tasks: number } }
interface AdminProject { id: string; name: string; color: string; status: string; isArchived: boolean; createdAt: string; team: { id: string; name: string }; owner: { id: string; name: string; avatar: string; color: string }; _count: { tasks: number; milestones: number } }
interface OverdueTask { id: string; title: string; priority: string; status: string; dueDate: string; team: { id: string; name: string }; assignee: { id: string; name: string; avatar: string; color: string } | null }
interface TaskStats { statusDistribution: { status: string; count: number }[]; unassignedCount: number }
interface AdminAuditLog { id: string; action: string; entityType: string; entityId: string; oldValue: Record<string, unknown> | null; newValue: Record<string, unknown> | null; createdAt: string; user: { id: string; name: string; avatar: string; color: string } }

interface AdminStore {
  users: AdminUser[];
  stats: AdminStats | null;
  loginLogs: LoginLog[];
  total: number;
  page: number;
  isLoading: boolean;
  trends: TrendData | null;
  health: HealthIndicators | null;
  teams: AdminTeam[];
  teamsTotal: number;
  projects: AdminProject[];
  projectsTotal: number;
  overdueTasks: OverdueTask[];
  overdueTotal: number;
  taskStats: TaskStats | null;
  auditLogs: AdminAuditLog[];
  auditTotal: number;
  settings: Record<string, string>;
  storageStats: { totalSize: number; fileCount: number } | null;
  fetchStats: () => Promise<void>;
  fetchUsers: (query?: { page?: number; search?: string; status?: string }) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  resetPassword: (id: string, password: string) => Promise<void>;
  setSuperAdmin: (id: string, value: boolean) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  fetchLoginLogs: (userId?: string, page?: number) => Promise<void>;
  fetchTrends: (days?: number) => Promise<void>;
  fetchHealth: () => Promise<void>;
  fetchTeams: (query?: { page?: number; search?: string; sort?: string }) => Promise<void>;
  transferOwnership: (teamId: string, newOwnerId: string) => Promise<void>;
  dissolveTeam: (teamId: string) => Promise<void>;
  fetchProjects: (query?: { page?: number; status?: string; teamId?: string; search?: string }) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  fetchOverdueTasks: (page?: number) => Promise<void>;
  fetchTaskStats: () => Promise<void>;
  batchArchiveTasks: (taskIds: string[]) => Promise<void>;
  fetchAuditLogs: (query?: { page?: number; startDate?: string; endDate?: string; action?: string; entityType?: string; userId?: string }) => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  fetchStorageStats: () => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set) => ({
  users: [],
  stats: null,
  loginLogs: [],
  total: 0,
  page: 1,
  isLoading: false,
  trends: null,
  health: null,
  teams: [],
  teamsTotal: 0,
  projects: [],
  projectsTotal: 0,
  overdueTasks: [],
  overdueTotal: 0,
  taskStats: null,
  auditLogs: [],
  auditTotal: 0,
  settings: {},
  storageStats: null,

  fetchStats: async () => {
    try {
      const { data } = await adminApi.getStats();
      set({ stats: data });
    } catch { /* 静默处理统计获取失败 */ }
  },

  fetchUsers: async (query = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await adminApi.getUsers(query);
      set({ users: data.users, total: data.total, page: data.page, isLoading: false });
    } catch { set({ isLoading: false }); }
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
    } catch { /* 静默处理日志获取失败 */ }
  },

  fetchTrends: async (days = 7) => {
    try {
      const { data } = await adminApi.getTrends(days);
      set({ trends: data });
    } catch { /* 静默处理 */ }
  },

  fetchHealth: async () => {
    try {
      const { data } = await adminApi.getHealthIndicators();
      set({ health: data });
    } catch { /* 静默处理 */ }
  },

  fetchTeams: async (query = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await adminApi.getTeams(query);
      set({ teams: data.teams, teamsTotal: data.total, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  transferOwnership: async (teamId, newOwnerId) => {
    await adminApi.transferOwnership(teamId, newOwnerId);
  },

  dissolveTeam: async (teamId) => {
    await adminApi.dissolveTeam(teamId);
    set((s) => ({ teams: s.teams.filter((t) => t.id !== teamId), teamsTotal: s.teamsTotal - 1 }));
  },

  fetchProjects: async (query = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await adminApi.getProjects(query);
      set({ projects: data.projects, projectsTotal: data.total, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  archiveProject: async (id) => {
    await adminApi.archiveProject(id);
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, isArchived: true } : p)) }));
  },

  restoreProject: async (id) => {
    await adminApi.restoreProject(id);
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, isArchived: false } : p)) }));
  },

  fetchOverdueTasks: async (page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await adminApi.getOverdueTasks(page);
      set({ overdueTasks: data.tasks, overdueTotal: data.total, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  fetchTaskStats: async () => {
    try {
      const { data } = await adminApi.getTaskStats();
      set({ taskStats: data });
    } catch { /* 静默处理 */ }
  },

  batchArchiveTasks: async (taskIds) => {
    await adminApi.batchArchiveTasks(taskIds);
    set((s) => ({ overdueTasks: s.overdueTasks.filter((t) => !taskIds.includes(t.id)), overdueTotal: s.overdueTotal - taskIds.length }));
  },

  fetchAuditLogs: async (query = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await adminApi.getAuditLogs(query);
      set({ auditLogs: data.logs, auditTotal: data.total, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  fetchSettings: async () => {
    try {
      const { data } = await adminApi.getSettings();
      set({ settings: data });
    } catch { /* 静默处理 */ }
  },

  updateSetting: async (key, value) => {
    await adminApi.updateSetting(key, value);
    set((s) => ({ settings: { ...s.settings, [key]: value } }));
  },

  fetchStorageStats: async () => {
    try {
      const { data } = await adminApi.getStorageStats();
      set({ storageStats: data });
    } catch { /* 静默处理 */ }
  },
}));
