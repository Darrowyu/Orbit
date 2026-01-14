import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { UserEntity } from '../common/types';

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService, private prisma: PrismaService) { }

  private validatePassword(password: string): void {
    if (password.length < 8) throw new BadRequestException('密码长度至少8位');
    if (!/[A-Za-z]/.test(password)) throw new BadRequestException('密码必须包含字母');
    if (!/[0-9]/.test(password)) throw new BadRequestException('密码必须包含数字');
  }

  private async checkLoginAttempts(identifier: string): Promise<void> {
    const since = new Date(Date.now() - LOGIN_LOCKOUT_MINUTES * 60 * 1000);
    const recentFails = await this.prisma.loginLog.count({
      where: { user: { OR: [{ email: identifier }, { name: identifier }] }, success: false, createdAt: { gte: since } }
    });
    if (recentFails >= LOGIN_ATTEMPT_LIMIT) {
      throw new ForbiddenException(`登录失败次数过多，请 ${LOGIN_LOCKOUT_MINUTES} 分钟后重试`);
    }
  }

  async register(dto: RegisterDto) {
    const exists = await this.users.findByEmail(dto.email);
    if (exists) throw new ConflictException('邮箱已被注册');
    this.validatePassword(dto.password);
    const hash = await bcrypt.hash(dto.password, 10);
    const avatars = ['😊', '😎', '🤓', '🧐', '🤖', '👻', '🐱', '🐶']; // 使用简单emoji避免组合字符显示问题
    const colors = ['bg-blue-100 text-blue-700', 'bg-pink-100 text-pink-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700'];
    const user = await this.users.create({
      email: dto.email, password: hash, name: dto.name,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { user: this.sanitize(user), token };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    await this.checkLoginAttempts(dto.email); // dto.email 可以是邮箱或用户名
    const user = await this.users.findByEmailOrName(dto.email);
    const success = user && (await bcrypt.compare(dto.password, user.password));
    if (user) await this.prisma.loginLog.create({ data: { userId: user.id, ip, userAgent, success: !!success } });
    if (!success) throw new UnauthorizedException('账号或密码错误');
    if (!user.isActive) throw new ForbiddenException('账号已被禁用');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { user: this.sanitize(user), token };
  }

  sanitize(user: Partial<UserEntity> & { password?: string }) { const { password, ...rest } = user; return rest; }
}
