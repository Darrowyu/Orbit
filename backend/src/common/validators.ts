import { BadRequestException } from '@nestjs/common';

export function validatePassword(password: string): void {
  if (!password || password.length < 8) throw new BadRequestException('密码长度至少8位');
  if (!/[A-Za-z]/.test(password)) throw new BadRequestException('密码必须包含字母');
  if (!/[0-9]/.test(password)) throw new BadRequestException('密码必须包含数字');
}
