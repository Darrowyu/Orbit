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

export interface CockpitRiskTasks {
    overdue: any[];
    highPriority: any[];
    blocked: any[];
}

export interface ProjectCockpitData {
    stats: any;
    risks: CockpitRiskTasks;
    burndown: any[];
    cumulativeFlow: any[];
    teamWorkload: any[];
    activities: any[];
}
