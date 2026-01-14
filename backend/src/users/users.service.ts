import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validatePassword } from '../common/validators';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  findByEmail(email: string) { return this.prisma.user.findUnique({ where: { email } }); }
  findByEmailOrName(identifier: string) { // 支持邮箱或用户名登录（大小写不敏感）
    return this.prisma.user.findFirst({ where: { OR: [{ email: { equals: identifier, mode: 'insensitive' } }, { name: { equals: identifier, mode: 'insensitive' } }] } });
  }
  findById(id: string) { return this.prisma.user.findUnique({ where: { id } }); }
  create(data: { email: string; password: string; name: string; avatar: string; color: string }) { return this.prisma.user.create({ data }); }

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
    await this.prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10) } });
    return { success: true };
  }

  async updateProfile(userId: string, data: { name?: string; avatar?: string; color?: string; skills?: string[]; aiPrompt?: string }) {
    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return { id: updated.id, name: updated.name, avatar: updated.avatar, color: updated.color, email: updated.email, skills: updated.skills, aiPrompt: updated.aiPrompt };
  }

  async getUserTeams(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: { team: { include: { members: { include: { user: { select: { id: true, name: true, avatar: true, color: true, email: true } } } } } } },
    });
    return memberships.map((m) => ({ ...m.team, role: m.role, memberCount: m.team.members.length }));
  }
}
