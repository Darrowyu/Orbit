import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  projectId: string;
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['PENDING', 'COMPLETED'])
  status?: string;
}
