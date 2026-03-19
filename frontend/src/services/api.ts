import axios from 'axios';
import { Task, User, AIResponse, Team, TeamMember, Notification, Project, ProjectStats, Label, Attachment, Milestone, TaskTemplate, TimeEntry, ProjectCockpitData } from '../types';
import { useAuthStore } from '../stores/authStore';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
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

export interface TaskListResponse {
  data: Task[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const taskApi = {
  getAll: (params?: { page?: number; limit?: number; projectId?: string }) => api.get<TaskListResponse>('/tasks', { params }),
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
  getCockpit: (id: string, startDate?: string, endDate?: string) => api.get<ProjectCockpitData>(`/projects/${id}/cockpit`, { params: { startDate, endDate } }),
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
  getTrends: (days?: number) => api.get('/admin/stats/trends', { params: { days } }),
  getHealthIndicators: () => api.get('/admin/stats/health'),
  getTeams: (query?: { page?: number; search?: string; sort?: string }) => api.get('/admin/teams', { params: query }),
  getTeamDetail: (id: string) => api.get(`/admin/teams/${id}`),
  transferOwnership: (id: string, newOwnerId: string) => api.post(`/admin/teams/${id}/transfer-ownership`, { newOwnerId }),
  dissolveTeam: (id: string) => api.delete(`/admin/teams/${id}`),
  getProjects: (query?: { page?: number; status?: string; teamId?: string; search?: string }) => api.get('/admin/projects', { params: query }),
  getProjectDetail: (id: string) => api.get(`/admin/projects/${id}`),
  archiveProject: (id: string) => api.post(`/admin/projects/${id}/archive`),
  restoreProject: (id: string) => api.post(`/admin/projects/${id}/restore`),
  deleteProject: (id: string) => api.delete(`/admin/projects/${id}`),
  getOverdueTasks: (page?: number) => api.get('/admin/tasks/overdue', { params: { page } }),
  getTaskStats: () => api.get('/admin/tasks/stats'),
  batchArchiveTasks: (taskIds: string[]) => api.post('/admin/tasks/batch-archive', { taskIds }),
  getAuditLogs: (query?: { page?: number; startDate?: string; endDate?: string; action?: string; entityType?: string; userId?: string }) => api.get('/admin/audit-logs', { params: query }),
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key: string, value: string) => api.post('/admin/settings', { key, value }),
  getStorageStats: () => api.get('/admin/storage/stats'),
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

export const labelApi = {
  getAll: () => api.get<Label[]>('/labels'),
  create: (data: { name: string; color?: string }) => api.post<Label>('/labels', data),
  update: (id: string, data: { name?: string; color?: string }) => api.put<Label>(`/labels/${id}`, data),
  delete: (id: string) => api.delete(`/labels/${id}`),
  addToTask: (taskId: string, labelId: string) => api.post(`/labels/task/${taskId}/${labelId}`),
  removeFromTask: (taskId: string, labelId: string) => api.delete(`/labels/task/${taskId}/${labelId}`),
  getTaskLabels: (taskId: string) => api.get<Label[]>(`/labels/task/${taskId}`),
  setTaskLabels: (taskId: string, labelIds: string[]) => api.put<Label[]>(`/labels/task/${taskId}`, { labelIds }),
};

export interface SearchResult {
  tasks: Array<{ id: string; title: string; description: string; status: string; projectId?: string; priority: string }>;
  projects: Array<{ id: string; name: string; description: string; color: string }>;
  comments: Array<{ id: string; content: string; taskId: string; taskTitle: string }>;
}

export const searchApi = {
  search: (query: string, limit?: number) => api.get<SearchResult>('/search', { params: { q: query, limit } }),
};

export const attachmentApi = {
  getByTask: (taskId: string) => api.get<Attachment[]>(`/attachments/${taskId}`),
  upload: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Attachment>(`/attachments/${taskId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id: string) => api.delete(`/attachments/${id}`),
};

export const milestoneApi = {
  getByProject: (projectId: string) => api.get<Milestone[]>('/milestones', { params: { projectId } }),
  getOne: (id: string) => api.get<Milestone>(`/milestones/${id}`),
  getProgress: (id: string) => api.get<{ total: number; done: number; progress: number }>(`/milestones/${id}/progress`),
  create: (data: { name: string; description?: string; dueDate: string; projectId: string }) => api.post<Milestone>('/milestones', data),
  update: (id: string, data: { name?: string; description?: string; dueDate?: string; status?: string }) => api.put<Milestone>(`/milestones/${id}`, data),
  delete: (id: string) => api.delete(`/milestones/${id}`),
  addTask: (milestoneId: string, taskId: string) => api.post(`/milestones/${milestoneId}/tasks/${taskId}`),
  removeTask: (milestoneId: string, taskId: string) => api.delete(`/milestones/${milestoneId}/tasks/${taskId}`),
};

export const templateApi = {
  getAll: () => api.get<TaskTemplate[]>('/templates'),
  getOne: (id: string) => api.get<TaskTemplate>(`/templates/${id}`),
  create: (data: { name: string; title: string; description?: string; priority?: string; subtasks?: string[]; labelIds?: string[] }) => api.post<TaskTemplate>('/templates', data),
  update: (id: string, data: Partial<TaskTemplate>) => api.put<TaskTemplate>(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

export const timeEntryApi = {
  start: (taskId: string, description?: string) => api.post<TimeEntry>(`/time-entries/start/${taskId}`, { description }),
  stop: (id: string) => api.post<TimeEntry>(`/time-entries/stop/${id}`),
  getRunning: () => api.get<TimeEntry | null>('/time-entries/running'),
  getByTask: (taskId: string) => api.get<TimeEntry[]>(`/time-entries/task/${taskId}`),
  getTotalByTask: (taskId: string) => api.get<number>(`/time-entries/task/${taskId}/total`),
  getMy: (start?: string, end?: string) => api.get<TimeEntry[]>('/time-entries/my', { params: { start, end } }),
  update: (id: string, data: { description?: string; duration?: number }) => api.put<TimeEntry>(`/time-entries/${id}`, data),
  delete: (id: string) => api.delete(`/time-entries/${id}`),
};

export interface BurndownData { date: string; remaining: number; completed: number }
export interface CumulativeFlowData { date: string; TODO: number; IN_PROGRESS: number; REVIEW: number; DONE: number }
export interface TeamWorkload { user: { id: string; name: string; avatar: string; color: string }; total: number; byStatus: Record<string, number>; byPriority: Record<string, number> }

export const reportApi = {
  getBurndown: (projectId: string, start: string, end: string) => api.get<BurndownData[]>('/reports/burndown', { params: { projectId, start, end } }),
  getCumulativeFlow: (projectId: string, start: string, end: string) => api.get<CumulativeFlowData[]>('/reports/cumulative-flow', { params: { projectId, start, end } }),
  getTeamWorkload: () => api.get<TeamWorkload[]>('/reports/team-workload'),
  getProjectStats: (projectId: string) => api.get('/reports/project-stats', { params: { projectId } }),
  getTimeReport: (start?: string, end?: string) => api.get('/reports/time', { params: { start, end } }),
};

export interface RecurringTask {
  id: string;
  templateId: string;
  template: TaskTemplate;
  frequency: string;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  nextRun: string | null;
  isActive: boolean;
}

export const recurringApi = {
  getAll: () => api.get<RecurringTask[]>('/recurring'),
  create: (data: { templateId: string; frequency: string; interval?: number; daysOfWeek?: number[]; dayOfMonth?: number; startDate: string; endDate?: string }) => api.post<RecurringTask>('/recurring', data),
  update: (id: string, data: { isActive?: boolean; endDate?: string }) => api.put<RecurringTask>(`/recurring/${id}`, data),
  delete: (id: string) => api.delete(`/recurring/${id}`),
};

export default api;
