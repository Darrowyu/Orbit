import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateAiConfigDto {
  @IsOptional()
  @IsString()
  @IsIn(['openai', 'deepseek', 'moonshot', 'zhipu', 'custom'])
  aiProvider?: string;

  @IsOptional()
  @IsString()
  aiApiKey?: string; // 非空=更新（服务端加密存储），空串=清除，不传=不修改

  @IsOptional()
  @IsString()
  aiBaseUrl?: string;

  @IsOptional()
  @IsString()
  aiModelName?: string;

  @IsOptional()
  @IsString()
  aiPrompt?: string;
}
