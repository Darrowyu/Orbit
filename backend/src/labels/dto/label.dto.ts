import { IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @MaxLength(30)
  name: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}
