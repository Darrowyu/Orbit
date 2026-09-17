import { IsEmail, IsString, MinLength, Length } from 'class-validator';

export class LoginDto {
  @IsString() @MinLength(2) email: string; // 支持邮箱或用户名
  @IsString() @MinLength(6) password: string;
}

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @MinLength(2) name: string;
}

export class ForgotPasswordDto {
  @IsEmail() email: string;
}

export class VerifyResetCodeDto {
  @IsEmail() email: string;
  @IsString() @Length(6, 6) code: string;
}

export class ResetPasswordDto {
  @IsEmail() email: string;
  @IsString() @Length(6, 6) code: string;
  @IsString() @MinLength(8) password: string;
}
