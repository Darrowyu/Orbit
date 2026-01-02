import axios from 'axios';
import { Task, User, AIResponse, Team, TeamMember, Notification, Project, ProjectStats } from '../types';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) useAuthStore.getState().logout();
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post<{ user: User; token: string }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) => api.post<{ user: User; token: string }>('/auth/register', data),
  me: () => api.get<User>('/auth/me'),
};

export const teamApi = {
  create: (name: string) => api.post<Team>('/teams', { name }),
  joinByCode: (code: string) => api.post<Team>('/teams/join/code', { code }),
  joinByLink: (inviteLink: string) => api.post<Team>(`/teams/join/link/${inviteLink}`),
  getMyTeams: () => api.get<(Team & { role: string })[]>('/teams/my'),
  getOne: (id: string) => api.get<Team>(`/teams/${id}`),
  switchTeam: (id: string) => api.post<Team>(`/teams/${id}/switch`),
  updateMemberRole: (teamId: string, memberId: string, role: string) => api.patch<Team>(`/teams/${teamId}/members/role`, { memberId, role }),
  removeMember: (teamId: string, memberId: string) => api.delete<Team>(`/teams/${teamId}/members/${memberId}`),
  regenerateCode: (teamId: string) => api.post<Team>(`/teams/${teamId}/regenerate-code`),
};

export const taskApi = {
  getAll: () => api.get<Task[]>('/tasks'),
  getArchived: () => api.get<Task[]>('/tasks/archived'),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data),
  update: (id: string, data: Partial<Task>) => api.patch<Task>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  archive: (id: string) => api.patch<Task>(`/tasks/${id}/archive`),
  restore: (id: string) => api.patch<Task>(`/tasks/${id}/restore`),
  // 批量操作
  batchMove: (ids: string[], status: string) => api.post<{ success: number; failed: number }>('/tasks/batch/move', { ids, status }),
  batchDelete: (ids: string[]) => api.post<{ success: number; failed: number }>('/tasks/batch/delete', { ids }),
  batchArchive: (ids: string[]) => api.post<{ success: number; failed: number }>('/tasks/batch/archive', { ids }),
  batchAssign: (ids: string[], assigneeId: string) => api.post<{ success: number; failed: number }>('/tasks/batch/assign', { ids, assigneeId }),
};

export const userApi = {
  getTeam: () => api.get<TeamMember[]>('/users/team'),
  completeOnboarding: () => api.post('/users/complete-onboarding'),
  changePassword: (oldPassword: string, newPassword: string) => api.post('/users/change-password', { oldPassword, newPassword }),
  updateProfile: (data: { name?: string; avatar?: string; color?: string; skills?: string[]; aiPrompt?: string }) => api.post('/users/profile', data),
  getMyTeams: () => api.get('/users/my-teams'),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // AI 配置管理
  getAiConfig: () => api.get<{ aiProvider: string | null; aiApiKey: string | null; aiBaseUrl: string | null; aiModelName: string | null; aiPrompt: string | null; isConfigured: boolean }>('/users/ai-config'),
  saveAiConfig: (data: { aiProvider?: string; aiApiKey?: string; aiBaseUrl?: string; aiModelName?: string; aiPrompt?: string; clearConfig?: boolean }) => api.post<{ success: boolean; message: string }>('/users/ai-config', data),
  testAiConfig: (data: { aiProvider: string; aiApiKey: string; aiBaseUrl?: string; aiModelName?: string }) => api.post<{ success: boolean; message: string; response?: string }>('/users/ai-config/test', data),
};

export interface TeamMemberInfo { id: string; name: string; skills?: string[] }
export interface TaskHistoryInfo { id: string; title: string; status: string; assigneeId?: string }
export interface RiskTask { id: string; title: string; status: string; dueDate?: string | null; priority?: string }

export const aiApi = {
  generate: (title: string, customPrompt?: string) => api.post<AIResponse>('/ai/generate', { title, customPrompt }),
  subdivide: (subtaskTitle: string, parentContext?: string) => api.post<{ steps: string[] }>('/ai/subdivide', { subtaskTitle, parentContext }),
  estimateWorkload: (taskTitle: string, description: string, subtasks: string[]) => api.post<{ hours: number; confidence: string; factors: string[] }>('/ai/estimate-workload', { taskTitle, description, subtasks }),
  recommendAssignee: (taskTitle: string, description: string, teamMembers: TeamMemberInfo[], taskHistory: TaskHistoryInfo[]) => api.post<{ recommendedId: string; reason: string; alternatives: { id: string; reason: string }[] }>('/ai/recommend-assignee', { taskTitle, description, teamMembers, taskHistory }),
  detectRisks: (tasks: RiskTask[]) => api.post<{ taskId: string; riskLevel: string; reasons: string[]; suggestions: string[] }[]>('/ai/detect-risks', { tasks }),
};

export const projectApi = {
  getAll: (archived = false) => api.get<Project[]>('/projects', { params: { archived } }),
  getOne: (id: string) => api.get<Project>(`/projects/${id}`),
  getStats: (id: string) => api.get<ProjectStats>(`/projects/${id}/stats`),
  create: (data: { name: string; description?: string; color?: string; startDate?: string; endDate?: string }) => api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  archive: (id: string) => api.post<Project>(`/projects/${id}/archive`),
  restore: (id: string) => api.post<Project>(`/projects/${id}/restore`),
  addMember: (projectId: string, userId: string, role?: string) => api.post<Project>(`/projects/${projectId}/members`, { userId, role }),
  updateMember: (projectId: string, memberId: string, role: string) => api.put<Project>(`/projects/${projectId}/members/${memberId}`, { role }),
  removeMember: (projectId: string, memberId: string) => api.delete<Project>(`/projects/${projectId}/members/${memberId}`),
};

export interface PaginatedNotifications { notifications: Notification[]; total: number; page: number; limit: number; totalPages: number }

export interface NotificationPreference {
  id: string;
  taskAssigned: boolean;
  taskStatusChanged: boolean;
  taskDueSoon: boolean;
  taskOverdue: boolean;
  newComment: boolean;
  projectMemberAdded: boolean;
  teamJoined: boolean;
  browserPush: boolean;
}

export const notificationApi = {
  getAll: (page = 1, limit = 20) => api.get<PaginatedNotifications>('/notifications', { params: { page, limit } }),
  getUnreadCount: () => api.get<number>('/notifications/unread-count'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications'),
  getPreferences: () => api.get<NotificationPreference>('/notifications/preferences'),
  updatePreferences: (data: Partial<NotificationPreference>) => api.put<NotificationPreference>('/notifications/preferences', data),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (query?: { page?: number; search?: string; status?: string }) => api.get('/admin/users', { params: query }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  toggleStatus: (id: string) => api.post(`/admin/users/${id}/toggle-status`),
  resetPassword: (id: string, password: string) => api.post(`/admin/users/${id}/reset-password`, { password }),
  setAdmin: (id: string, value: boolean) => api.post(`/admin/users/${id}/set-admin`, null, { params: { value } }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getLoginLogs: (userId?: string, page?: number) => api.get('/admin/login-logs', { params: { userId, page } }),
};

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user: { id: string; name: string; avatar: string; color: string };
  createdAt: string;
  updatedAt: string;
}

export const commentApi = {
  getByTask: (taskId: string) => api.get<Comment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: string, content: string) => api.post<Comment>(`/tasks/${taskId}/comments`, { content }),
  update: (taskId: string, id: string, content: string) => api.patch<Comment>(`/tasks/${taskId}/comments/${id}`, { content }),
  delete: (taskId: string, id: string) => api.delete(`/tasks/${taskId}/comments/${id}`),
};

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  user: { id: string; name: string; avatar: string; color: string };
  teamId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  createdAt: string;
}

export const auditApi = {
  getTeamLogs: (limit?: number, offset?: number) => api.get<AuditLog[]>('/audit/team', { params: { limit, offset } }),
  getEntityLogs: (type: string, id: string) => api.get<AuditLog[]>(`/audit/entity/${type}/${id}`),
};

export default api;
