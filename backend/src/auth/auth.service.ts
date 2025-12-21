import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService, private prisma: PrismaService) { }

  async register(dto: RegisterDto) {
    const exists = await this.users.findByEmail(dto.email);
    if (exists) throw new ConflictException('邮箱已被注册');
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
    const user = await this.users.findByEmail(dto.email);
    const success = user && (await bcrypt.compare(dto.password, user.password));
    if (user) await this.prisma.loginLog.create({ data: { userId: user.id, ip, userAgent, success: !!success } }); // 记录登录日志
    if (!success) throw new UnauthorizedException('邮箱或密码错误');
    if (!user.isActive) throw new ForbiddenException('账号已被禁用');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { user: this.sanitize(user), token };
  }

  sanitize(user: any) { const { password, ...rest } = user; return rest; }
}
