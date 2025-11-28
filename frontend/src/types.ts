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

export type TeamRole = 'owner' | 'admin' | 'member';

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

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  teamId: string;
  subtasks: Subtask[];
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

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'SUBTASK_COMPLETED' | 'TEAM_JOINED' | 'ROLE_CHANGED' | 'TEAM_MEMBER_ADDED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}
