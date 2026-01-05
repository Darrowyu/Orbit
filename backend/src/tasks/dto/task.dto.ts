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
