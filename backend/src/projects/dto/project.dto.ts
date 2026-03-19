import { IsString, IsOptional, IsDateString, IsArray, IsBoolean } from 'class-validator';

export class CreateProjectDto {
    @IsString() name: string;
    @IsString() @IsOptional() description?: string;
    @IsString() @IsOptional() color?: string;
    @IsDateString() @IsOptional() startDate?: string;
    @IsDateString() @IsOptional() endDate?: string;
}

export class UpdateProjectDto {
    @IsString() @IsOptional() name?: string;
    @IsString() @IsOptional() description?: string;
    @IsString() @IsOptional() color?: string;
    @IsString() @IsOptional() status?: string; // ACTIVE, ON_HOLD, COMPLETED, ARCHIVED
    @IsDateString() @IsOptional() startDate?: string;
    @IsDateString() @IsOptional() endDate?: string;
}

export class AddProjectMemberDto {
    @IsString() userId: string;
    @IsString() @IsOptional() role?: string; // admin, member
}

export class UpdateProjectMemberDto {
    @IsString() role: string;
}

export class BatchAddMembersDto {
    @IsArray() @IsString({ each: true }) userIds: string[];
    @IsString() @IsOptional() role?: string;
}

// 驾驶舱风险任务项
export interface CockpitRiskTaskItem {
    id: string;
    title: string;
    status: string;
    priority?: string;
    dueDate?: Date | null;
    assignee?: { id: string; name: string; avatar: string; color: string } | null;
}

// 驾驶舱风险任务分类
export interface CockpitRiskTasks {
    overdue: CockpitRiskTaskItem[];
    highPriority: CockpitRiskTaskItem[];
    blocked: CockpitRiskTaskItem[];
}

// 燃尽图数据点
export interface BurndownDataPoint {
    date: string;
    remaining: number;
    completed: number;
}

// 累积流图数据点
export interface CumulativeFlowDataPoint {
    date: string;
    TODO: number;
    IN_PROGRESS: number;
    REVIEW: number;
    DONE: number;
}

// 团队成员工作负载
export interface TeamMemberWorkload {
    assigneeId: string | null;
    _count: { id: number };
}

// 项目活动项
export interface ProjectActivityItem {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    user: { id: string; name: string; avatar: string; color: string };
    createdAt: Date;
}

// 项目统计数据
export interface CockpitProjectStats {
    total: number;
    byStatus: { TODO: number; IN_PROGRESS: number; REVIEW: number; DONE: number };
    byPriority: { LOW: number; MEDIUM: number; HIGH: number };
    progress: number;
}

// 驾驶舱完整数据
export interface ProjectCockpitData {
    stats: CockpitProjectStats;
    risks: CockpitRiskTasks;
    burndown: BurndownDataPoint[];
    cumulativeFlow: CumulativeFlowDataPoint[];
    teamWorkload: TeamMemberWorkload[];
    activities: ProjectActivityItem[];
}
