import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const { page = 1, limit = 20, search, status } = query;
    const where: any = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    if (status === 'active') where.isActive = true;
    if (status === 'disabled') where.isActive = false;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, name: true, avatar: true, color: true, isSuperAdmin: true, isActive: true, lastLoginAt: true, createdAt: true, _count: { select: { teamMembers: true, ownedTeams: true } } } }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, avatar: true, color: true, isSuperAdmin: true, isActive: true, lastLoginAt: true, createdAt: true, teamMembers: { include: { team: { select: { id: true, name: true } } } }, ownedTeams: { select: { id: true, name: true } } } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async toggleUserStatus(id: string, adminId: string) {
    if (id === adminId) throw new ForbiddenException('不能禁用自己');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.isSuperAdmin) throw new ForbiddenException('不能禁用超级管理员');
    return this.prisma.user.update({ where: { id }, data: { isActive: !user.isActive }, select: { id: true, isActive: true } });
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!newPassword || newPassword.length < 6) throw new ForbiddenException('密码至少6位');
    await this.prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(newPassword, 10) } });
    return { success: true };
  }

  async setSuperAdmin(id: string, isSuperAdmin: boolean, adminId: string) {
    if (id === adminId) throw new ForbiddenException('不能修改自己的权限');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return this.prisma.user.update({ where: { id }, data: { isSuperAdmin }, select: { id: true, isSuperAdmin: true } });
  }

  async deleteUser(id: string, adminId: string) {
    if (id === adminId) throw new ForbiddenException('不能删除自己');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.isSuperAdmin) throw new ForbiddenException('不能删除超级管理员');
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  async getLoginLogs(userId?: string, page = 1, limit = 50) {
    const where = userId ? { userId } : {};
    const [logs, total] = await Promise.all([
      this.prisma.loginLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true } } } }),
      this.prisma.loginLog.count({ where }),
    ]);
    return { logs, total, page, limit };
  }

  async getStats() {
    const [totalUsers, activeUsers, totalTeams, totalTasks] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.team.count(),
      this.prisma.task.count(),
    ]);
    return { totalUsers, activeUsers, disabledUsers: totalUsers - activeUsers, totalTeams, totalTasks };
  }
}
