import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateTeamDto {
  @IsString() name: string;
}

export class JoinTeamDto {
  @IsString() code: string;
}

export class UpdateMemberRoleDto {
  @IsString() memberId: string;
  @IsEnum(['admin', 'member']) role: 'admin' | 'member';
}

export class RemoveMemberDto {
  @IsString() memberId: string;
}
