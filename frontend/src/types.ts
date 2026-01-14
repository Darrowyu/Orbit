export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export type TeamRole = 'owner' | 'admin' | 'member';
export type ProjectRole = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  color: string;
  skills?: string[];
  aiPrompt?: string;
  isFirstLogin?: boolean;
  isSuperAdmin?: boolean;
  currentTeamId?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  skills?: string[];
  role?: TeamRole;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  inviteLink: string;
  ownerId: string;
  members: { id: string; role: TeamRole; user: TeamMember }[];
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  role: ProjectRole;
  joinedAt: string;
  user: { id: string; name: string; email: string; avatar: string; color: string };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  teamId: string;
  ownerId: string;
  owner?: User;
  members: ProjectMember[];
  taskCount: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStats {
  total: number;
  byStatus: { TODO: number; IN_PROGRESS: number; REVIEW: number; DONE: number };
  byPriority: { LOW: number; MEDIUM: number; HIGH: number };
  progress: number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  teamId: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  taskId: string;
  uploaderId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  projectId?: string;
  teamId: string;
  subtasks: Subtask[];
  labels?: Label[];
  attachments?: Attachment[];
  createdAt: string;
  dueDate: string | null;
  dependsOn: string[];
  isArchived?: boolean;
  archivedAt?: string | null;
}

export interface AIResponse {
  description: string;
  subtasks: string[];
  priority: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
  projectId: string;
  tasks?: { id: string; title: string; status: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: string;
  subtasks: string[];
  labelIds: string[];
  teamId: string;
  createdBy: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  description: string;
  createdAt: string;
  task?: { id: string; title: string };
  user?: { id: string; name: string; avatar: string; color: string };
}

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'SUBTASK_COMPLETED' | 'TEAM_JOINED' | 'ROLE_CHANGED' | 'TEAM_MEMBER_ADDED' | 'MENTION';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// 创建/更新任务时的数据传输对象
export interface TaskCreateData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  projectId?: string;
  subtasks?: Subtask[];
  dueDate?: string | null;
  dependsOn?: string[];
  labelIds?: string[];
}
