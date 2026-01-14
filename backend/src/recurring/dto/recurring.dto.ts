import { IsString, IsOptional, IsArray, IsNumber, IsIn, IsDateString, IsBoolean } from 'class-validator';

export class CreateRecurringDto {
  @IsString() templateId: string;
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY']) frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  @IsOptional() @IsNumber() interval?: number;
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) daysOfWeek?: number[];
  @IsOptional() @IsNumber() dayOfMonth?: number;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateRecurringDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() endDate?: string;
}
