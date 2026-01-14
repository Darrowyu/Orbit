import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateTemplateDto {
  @IsString() name: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) subtasks?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) labelIds?: string[];
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) subtasks?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) labelIds?: string[];
}
