import axios from 'axios';
import { Task, User, AIResponse, Team, TeamMember, Notification } from '../types';
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
};

export const aiApi = {
  generate: (title: string, customPrompt?: string) => api.post<AIResponse>('/ai/generate', { title, customPrompt }),
  subdivide: (subtaskTitle: string, parentContext?: string) => api.post<{ steps: string[] }>('/ai/subdivide', { subtaskTitle, parentContext }),
  estimateWorkload: (taskTitle: string, description: string, subtasks: string[]) => api.post<{ hours: number; confidence: string; factors: string[] }>('/ai/estimate-workload', { taskTitle, description, subtasks }),
  recommendAssignee: (taskTitle: string, description: string, teamMembers: any[], taskHistory: any[]) => api.post<{ recommendedId: string; reason: string; alternatives: { id: string; reason: string }[] }>('/ai/recommend-assignee', { taskTitle, description, teamMembers, taskHistory }),
  detectRisks: (tasks: any[]) => api.post<{ taskId: string; riskLevel: string; reasons: string[]; suggestions: string[] }[]>('/ai/detect-risks', { tasks }),
};

export const notificationApi = {
  getAll: () => api.get<Notification[]>('/notifications'),
  getUnreadCount: () => api.get<number>('/notifications/unread-count'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
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

export default api;
