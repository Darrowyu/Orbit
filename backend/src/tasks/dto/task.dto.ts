import { IsString, IsOptional, IsArray, IsBoolean, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export const TASK_STATUS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
export const TASK_PRIORITY = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskStatusType = typeof TASK_STATUS[number];
export type TaskPriorityType = typeof TASK_PRIORITY[number];

export class SubtaskDto {
  @IsString() id: string;
  @IsString() title: string;
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsString() assigneeId?: string;
}

export class CreateTaskDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: TaskStatusType;
  @IsOptional() @IsIn(TASK_PRIORITY) priority?: TaskPriorityType;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubtaskDto) subtasks?: SubtaskDto[];
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) dependsOn?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) labelIds?: string[];
}

export class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: TaskStatusType;
  @IsOptional() @IsIn(TASK_PRIORITY) priority?: TaskPriorityType;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubtaskDto) subtasks?: SubtaskDto[];
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) dependsOn?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) labelIds?: string[];
}

// WebSocket 传输用类型
export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId?: string;
  projectId?: string;
  teamId: string;
  subtasks: SubtaskDto[];
  dueDate?: string;
  dependsOn: string[];
  createdAt: string;
}

// 带标签的任务返回类型
export interface TaskWithLabels extends Task {
  labels: Array<{ id: string; name: string; color: string }>;
  archivedAt?: string | null;
  isArchived?: boolean;
  milestoneId?: string;
}

// 任务数据库实体类型（Prisma返回）
export interface TaskDbEntity {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId?: string | null;
  projectId?: string | null;
  teamId: string;
  dueDate: Date | null;
  dependsOn: string[];
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  archivedAt: Date | null;
  milestoneId?: string | null;
  subtasks?: Array<{ id: string; title: string; completed: boolean; assigneeId?: string | null }>;
  labels?: Array<{ label: { id: string; name: string; color: string } }>;
}
