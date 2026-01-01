import { IsString, IsOptional, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubtaskDto {
  @IsString() id: string;
  @IsString() title: string;
  @IsOptional() @IsBoolean() completed?: boolean;
  @IsOptional() @IsString() assigneeId?: string;
}

export class CreateTaskDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubtaskDto) subtasks?: SubtaskDto[];
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsArray() dependsOn?: string[];
}

export class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubtaskDto) subtasks?: SubtaskDto[];
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsArray() dependsOn?: string[];
}

// WebSocket 传输用类型
export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId?: string;
  teamId: string;
  subtasks: SubtaskDto[];
  dueDate?: string;
  dependsOn: string[];
  createdAt: string;
}
