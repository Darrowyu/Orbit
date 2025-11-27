import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, JoinTeamDto, UpdateMemberRoleDto } from './dto/team.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  private generateCode() { return randomBytes(4).toString('hex').toUpperCase(); } // 8位邀请码
  private generateInviteLink() { return randomBytes(16).toString('hex'); } // 32位邀请链接

  async create(dto: CreateTeamDto, userId: string) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        code: this.generateCode(),
        inviteLink: this.generateInviteLink(),
        ownerId: userId,
        members: { create: { userId, role: 'owner' } },
      },
      include: { members: { include: { user: true } } },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { currentTeamId: team.id } });
    return this.formatTeam(team);
  }

  async joinByCode(dto: JoinTeamDto, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { code: dto.code } });
    if (!team) throw new NotFoundException('邀请码无效');
    return this.addMember(team.id, userId);
  }

  async joinByLink(inviteLink: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { inviteLink } });
    if (!team) throw new NotFoundException('邀请链接无效');
    return this.addMember(team.id, userId);
  }

  private async addMember(teamId: string, userId: string) {
    const exists = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } });
    if (exists) throw new ConflictException('您已是该团队成员');
    await this.prisma.teamMember.create({ data: { userId, teamId, role: 'member' } });
    await this.prisma.user.update({ where: { id: userId }, data: { currentTeamId: teamId } });
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.notifications.notifyTeamJoined(team?.name || '', userId);
    await this.notifications.notifyNewTeamMember(teamId, user?.name || '', userId);
    return this.findOne(teamId);
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id }, include: { members: { include: { user: true } }, owner: true } });
    if (!team) throw new NotFoundException('团队不存在');
    return this.formatTeam(team);
  }

  async getUserTeams(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({ where: { userId }, include: { team: { include: { members: { include: { user: true } }, owner: true } } } });
    return memberships.map(m => ({ ...this.formatTeam(m.team), role: m.role }));
  }

  async updateMemberRole(teamId: string, dto: UpdateMemberRoleDto, userId: string) {
    await this.checkPermission(teamId, userId, ['owner', 'admin']);
    const member = await this.prisma.teamMember.findFirst({ where: { id: dto.memberId, teamId }, include: { user: true } });
    if (!member) throw new NotFoundException('成员不存在');
    if (member.role === 'owner') throw new ForbiddenException('无法修改团队所有者角色');
    await this.prisma.teamMember.update({ where: { id: dto.memberId }, data: { role: dto.role } });
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    await this.notifications.notifyRoleChanged(team?.name || '', member.userId, dto.role);
    return this.findOne(teamId);
  }

  async removeMember(teamId: string, memberId: string, userId: string) {
    await this.checkPermission(teamId, userId, ['owner', 'admin']);
    const member = await this.prisma.teamMember.findFirst({ where: { id: memberId, teamId } });
    if (!member) throw new NotFoundException('成员不存在');
    if (member.role === 'owner') throw new ForbiddenException('无法移除团队所有者');
    await this.prisma.teamMember.delete({ where: { id: memberId } });
    return this.findOne(teamId);
  }

  async switchTeam(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } });
    if (!member) throw new ForbiddenException('您不是该团队成员');
    await this.prisma.user.update({ where: { id: userId }, data: { currentTeamId: teamId } });
    return this.findOne(teamId);
  }

  async regenerateCode(teamId: string, userId: string) {
    await this.checkPermission(teamId, userId, ['owner', 'admin']);
    const team = await this.prisma.team.update({ where: { id: teamId }, data: { code: this.generateCode() }, include: { members: { include: { user: true } } } });
    return this.formatTeam(team);
  }

  private async checkPermission(teamId: string, userId: string, roles: string[]) {
    const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } });
    if (!member || !roles.includes(member.role)) throw new ForbiddenException('权限不足');
  }

  private formatTeam(team: any) {
    return {
      id: team.id, name: team.name, code: team.code, inviteLink: team.inviteLink,
      ownerId: team.ownerId, createdAt: team.createdAt?.toISOString(),
      members: team.members?.map((m: any) => ({
        id: m.id, role: m.role, joinedAt: m.joinedAt?.toISOString(),
        user: { id: m.user.id, name: m.user.name, email: m.user.email, avatar: m.user.avatar, color: m.user.color },
      })),
    };
  }
}
