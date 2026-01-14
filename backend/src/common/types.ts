// 通用类型定义 - 消除 any 类型

export interface JwtPayload { // JWT 载荷
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RequestUser { // 请求中的用户信息
  id: string;
  sub: string;
  email: string;
  currentTeamId?: string | null;
}

export interface AuthenticatedRequest extends Request { // 带认证的请求
  user: RequestUser;
}

export interface UserEntity { // 用户实体（数据库返回）
  id: string;
  email: string;
  name: string;
  password: string;
  avatar: string;
  color: string;
  skills?: string[];
  aiPrompt?: string | null;
  aiProvider?: string | null;
  aiApiKey?: string | null;
  aiBaseUrl?: string | null;
  aiModelName?: string | null;
  isFirstLogin?: boolean;
  isSuperAdmin?: boolean;
  isActive?: boolean;
  currentTeamId?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date | null;
}

export interface TeamEntity { // 团队实体
  id: string;
  name: string;
  code: string;
  inviteLink: string;
  ownerId: string;
  createdAt: Date;
  members?: TeamMemberEntity[];
}

export interface TeamMemberEntity { // 团队成员实体
  id: string;
  role: string;
  joinedAt: Date;
  user: { id: string; name: string; email: string; avatar: string; color: string };
}

export interface ProjectEntity { // 项目实体
  id: string;
  name: string;
  description: string;
  color: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  teamId: string;
  ownerId: string;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  members?: ProjectMemberEntity[];
  _count?: { tasks: number };
}

export interface ProjectMemberEntity { // 项目成员实体
  id: string;
  role: string;
  joinedAt: Date;
  user: { id: string; name: string; email: string; avatar: string; color: string };
}

export interface TaskEntity { // 任务实体
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId?: string | null;
  projectId?: string | null;
  teamId: string;
  dueDate: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  subtasks?: SubtaskEntity[];
}

export interface SubtaskEntity { // 子任务实体
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
}

export interface NotificationEntity { // 通知实体
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

export interface PaginatedQuery { // 分页查询
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> { // 分页结果
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
