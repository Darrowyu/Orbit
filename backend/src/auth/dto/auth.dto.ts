import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() @MinLength(2) email: string; // 支持邮箱或用户名
  @IsString() @MinLength(6) password: string;
}

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() @MinLength(2) name: string;
}
