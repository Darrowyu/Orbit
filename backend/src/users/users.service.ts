import { Injectable, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoUtil } from '../common/crypto.util';
import { validatePassword } from '../common/validators';
import { UpdateAiConfigDto } from './dto/ai-config.dto';
import * as bcrypt from 'bcryptjs';

// 脱敏后的 AI 配置响应（不回传明文 apiKey）
export interface AiConfigMasked {
  aiProvider: string | null;
  aiApiKey: string | null; // 仅 masked 形式，如 sk-****1234
  aiBaseUrl: string | null;
  aiModelName: string | null;
  aiPrompt: string | null;
  isConfigured: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) { }

  findByEmail(email: string) { return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } }); } // 邮箱统一小写存储
  findByEmailOrName(identifier: string) { // 支持邮箱或用户名登录（大小写不敏感）
    return this.prisma.user.findFirst({ where: { OR: [{ email: { equals: identifier, mode: 'insensitive' } }, { name: { equals: identifier, mode: 'insensitive' } }] } });
  }
  findById(id: string) { return this.prisma.user.findUnique({ where: { id } }); }
  create(data: { email: string; password: string; name: string; avatar: string; color: string }) { return this.prisma.user.create({ data: { ...data, email: data.email.toLowerCase() } }); }

  async getTeamMembers(teamId: string) {
    const members = await this.prisma.teamMember.findMany({ where: { teamId }, include: { user: true } });
    return members.map(m => ({ id: m.user.id, name: m.user.name, email: m.user.email, avatar: m.user.avatar, color: m.user.color, role: m.role }));
  }

  async markFirstLoginComplete(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { isFirstLogin: false } });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(oldPassword, user.password))) throw new ForbiddenException('原密码错误');
    validatePassword(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 12) } });
    return { success: true };
  }

  async updateProfile(userId: string, data: { name?: string; avatar?: string; color?: string; skills?: string[]; aiPrompt?: string }) {
    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return { id: updated.id, name: updated.name, avatar: updated.avatar, color: updated.color, email: updated.email, skills: updated.skills, aiPrompt: updated.aiPrompt };
  }

  // 返回脱敏 AI 配置：解密出明文后只保留掩码形式
  private async getAiConfigMasked(user: { aiProvider: string | null; aiApiKey: string | null; aiBaseUrl: string | null; aiModelName: string | null; aiPrompt: string | null }): Promise<AiConfigMasked> {
    let maskedKey: string | null = null;
    if (user.aiApiKey) {
      try {
        const plain = CryptoUtil.decrypt(user.aiApiKey);
        // 保留前 3 位便于识别厂商，如 sk-****1234
        maskedKey = plain.length > 7 ? `${plain.slice(0, 3)}****${plain.slice(-4)}` : '****';
      } catch {
        this.logger.warn('AI apiKey 解密失败，按未配置处理'); // 不输出任何密文/明文内容
      }
    }
    return {
      aiProvider: user.aiProvider,
      aiApiKey: maskedKey,
      aiBaseUrl: user.aiBaseUrl,
      aiModelName: user.aiModelName,
      aiPrompt: user.aiPrompt,
      isConfigured: !!(maskedKey || user.aiBaseUrl),
    };
  }

  async getAiConfig(userId: string): Promise<AiConfigMasked> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('用户不存在');
    return this.getAiConfigMasked(user);
  }

  async updateAiConfig(userId: string, dto: UpdateAiConfigDto): Promise<AiConfigMasked> {
    const data: { aiProvider?: string | null; aiApiKey?: string | null; aiBaseUrl?: string | null; aiModelName?: string | null; aiPrompt?: string | null } = {};
    if (dto.aiProvider !== undefined) data.aiProvider = dto.aiProvider || null;
    if (dto.aiBaseUrl !== undefined) data.aiBaseUrl = dto.aiBaseUrl || null;
    if (dto.aiModelName !== undefined) data.aiModelName = dto.aiModelName || null;
    if (dto.aiPrompt !== undefined) data.aiPrompt = dto.aiPrompt || null;
    if (dto.aiApiKey !== undefined) { // 空串表示清除，非空加密存储
      if (dto.aiApiKey === '') {
        data.aiApiKey = null;
      } else {
        try {
          data.aiApiKey = CryptoUtil.encrypt(dto.aiApiKey);
        } catch {
          throw new InternalServerErrorException('服务器未配置加密密钥，无法保存 API Key');
        }
      }
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return this.getAiConfigMasked(updated);
  }

  async getUserTeams(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: { team: { include: { members: { include: { user: { select: { id: true, name: true, avatar: true, color: true, email: true } } } } } } },
    });
    return memberships.map((m) => ({ ...m.team, role: m.role, memberCount: m.team.members.length }));
  }
}
