import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { validatePassword } from '../common/validators';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';
import { LoginDto, RegisterDto, ForgotPasswordDto, VerifyResetCodeDto, ResetPasswordDto } from './dto/auth.dto';
import { UserEntity } from '../common/types';

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_LOCKOUT_MINUTES = 15;
const IP_ATTEMPT_LIMIT = 20; // 同一 IP 在锁定期内的失败次数上限
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12); // 预计算常量 hash，用于消除用户枚举时序差

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService, private prisma: PrismaService, private mail: MailService) { }

  private async checkLoginAttempts(identifier: string, ip?: string): Promise<void> {
    const id = identifier.toLowerCase(); // 邮箱统一小写存储，先归一化防大小写轮换绕过账号锁定
    const since = new Date(Date.now() - LOGIN_LOCKOUT_MINUTES * 60 * 1000);
    const recentFails = await this.prisma.loginLog.count({
      where: { user: { OR: [{ email: id }, { name: id }] }, success: false, createdAt: { gte: since } }
    });
    if (recentFails >= LOGIN_ATTEMPT_LIMIT) {
      throw new ForbiddenException(`登录失败次数过多，请 ${LOGIN_LOCKOUT_MINUTES} 分钟后重试`);
    }
    if (ip) { // IP 维度锁定，防止撞库绕过账号维度
      const ipFails = await this.prisma.loginLog.count({ where: { ip, success: false, createdAt: { gte: since } } });
      if (ipFails >= IP_ATTEMPT_LIMIT) {
        throw new ForbiddenException(`登录失败次数过多，请 ${LOGIN_LOCKOUT_MINUTES} 分钟后重试`);
      }
    }
  }

  async register(dto: RegisterDto) {
    const exists = await this.users.findByEmail(dto.email);
    if (exists) throw new ConflictException('邮箱已被注册');
    validatePassword(dto.password);
    const hash = await bcrypt.hash(dto.password, 12);
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
    await this.checkLoginAttempts(dto.email, ip); // dto.email 可以是邮箱或用户名
    const user = await this.users.findByEmailOrName(dto.email);
    const matched = await bcrypt.compare(dto.password, user ? user.password : DUMMY_HASH); // 用户不存在也比较一次，消除时序差
    const success = !!user && matched;
    await this.prisma.loginLog.create({ data: { userId: user ? user.id : null, ip, userAgent, success } }); // 不存在账号的撞库也落库（IP 维度锁定依赖）
    if (!success) throw new UnauthorizedException('账号或密码错误');
    if (!user.isActive) throw new ForbiddenException('账号已被禁用');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { user: this.sanitize(user), token };
  }

  /** 发送密码重置验证码。无论邮箱是否注册都返回成功，防止账号枚举。 */
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.users.findByEmail(email);
    if (user) {
      const recent = await this.prisma.passwordResetCode.findFirst({ // 同一邮箱 60 秒内只允许发一次
        where: { email, createdAt: { gte: new Date(Date.now() - 60_000) } },
      });
      if (recent) throw new HttpException('发送过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      await this.prisma.passwordResetCode.create({
        data: { email, codeHash: this.hashCode(code), expiresAt: new Date(Date.now() + 10 * 60_000) },
      });
      await this.mail.sendMail(email, 'Orbit 密码重置验证码', `您的密码重置验证码是：${code}，10 分钟内有效。如非本人操作请忽略本邮件。`);
    }
    return { success: true };
  }

  async verifyResetCode(dto: VerifyResetCodeDto) {
    await this.findValidCode(dto.email, dto.code);
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rc = await this.findValidCode(dto.email, dto.code);
    validatePassword(dto.password);
    const user = await this.users.findByEmail(dto.email.toLowerCase());
    if (!user) throw new BadRequestException('重置失败，请重新发起');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(dto.password, 12) } }),
      this.prisma.passwordResetCode.updateMany({ where: { email: dto.email.toLowerCase(), consumedAt: null }, data: { consumedAt: new Date() } }), // 作废旧验证码
    ]);
    return { success: true };
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private async findValidCode(email: string, code: string) {
    const rc = await this.prisma.passwordResetCode.findFirst({
      where: { email: email.toLowerCase(), consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!rc) throw new BadRequestException('验证码错误或已过期');
    // 原子占位防并发竞态：先尝试占一次尝试次数，占不到说明已超限或已被消费
    const claimed = await this.prisma.passwordResetCode.updateMany({
      where: { id: rc.id, attempts: { lt: 5 }, consumedAt: null },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) throw new BadRequestException('验证码错误或已过期');
    const inputHash = Buffer.from(this.hashCode(code), 'utf8');
    const storedHash = Buffer.from(rc.codeHash, 'utf8');
    // 恒定时间比较，先等长判断避免 timingSafeEqual 长度不等抛异常
    const matched = inputHash.length === storedHash.length && timingSafeEqual(inputHash, storedHash);
    if (!matched) throw new BadRequestException('验证码错误或已过期'); // 占位已计一次，5 次错误作废
    return rc;
  }

  sanitize(user: Partial<UserEntity> & { password?: string; aiApiKey?: string | null }) { const { password, aiApiKey, ...rest } = user; return rest; } // 密钥与加密 API Key 一律不下发
}
