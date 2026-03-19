import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validatePassword } from '../common/validators';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private aggregateByDate(data: { createdAt?: Date; updatedAt?: Date; _count: number | { userId: number } }[], dates: string[]): number[] {
    const map = new Map<string, number>();
    dates.forEach(d => map.set(d, 0));
    data.forEach(item => {
      const date = (item.createdAt || item.updatedAt)?.toISOString().split('T')[0];
      if (date && map.has(date)) {
        const count = typeof item._count === 'number' ? item._count : item._count.userId;
        map.set(date, (map.get(date) || 0) + count);
      }
    });
    return dates.map(d => map.get(d) || 0);
  }

  async getUsers(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const { page = 1, limit = 20, search, status } = query;
    const where: { OR?: { name?: object; email?: object }[]; isActive?: boolean } = {};
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
    validatePassword(newPassword);
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
    const user = await this.prisma.user.findUnique({ where: { id }, include: { ownedTeams: true, ownedProjects: true } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.isSuperAdmin) throw new ForbiddenException('不能删除超级管理员');
    if (user.ownedTeams.length > 0) throw new ForbiddenException(`该用户是 ${user.ownedTeams.length} 个团队的所有者，请先转让所有权`);
    if (user.ownedProjects.length > 0) throw new ForbiddenException(`该用户是 ${user.ownedProjects.length} 个项目的所有者，请先转让所有权`);
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

  async getTrends(days = 7) {
    const dates: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const startDate = new Date(dates[0]);
    const [newUsers, completedTasks, activeLogins] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } }),
      this.prisma.task.findMany({ where: { status: 'DONE', updatedAt: { gte: startDate } }, select: { updatedAt: true } }),
      this.prisma.loginLog.findMany({ where: { createdAt: { gte: startDate }, success: true }, select: { createdAt: true, userId: true } }),
    ]);
    const newUsersAgg = this.aggregateByDate(newUsers.map(u => ({ createdAt: u.createdAt, _count: 1 })), dates);
    const completedAgg = this.aggregateByDate(completedTasks.map(t => ({ updatedAt: t.updatedAt, _count: 1 })), dates);
    const uniqueLogins = new Map<string, Set<string>>();
    dates.forEach(d => uniqueLogins.set(d, new Set()));
    activeLogins.forEach(l => { const d = l.createdAt.toISOString().split('T')[0]; uniqueLogins.get(d)?.add(l.userId); });
    const activeUsersAgg = dates.map(d => uniqueLogins.get(d)?.size || 0);
    return { dates, newUsers: newUsersAgg, completedTasks: completedAgg, activeUsers: activeUsersAgg };
  }

  async getHealthIndicators() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [overdueTasks, inactiveUsers, unassignedTasks, storageStats] = await Promise.all([
      this.prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { not: 'DONE' }, isArchived: false } }),
      this.prisma.user.count({ where: { isActive: true, OR: [{ lastLoginAt: { lt: sevenDaysAgo } }, { lastLoginAt: null }] } }),
      this.prisma.task.count({ where: { assigneeId: null, isArchived: false } }),
      this.prisma.attachment.aggregate({ _sum: { size: true }, _count: true }),
    ]);
    return { overdueTasks, inactiveUsers, unassignedTasks, storageSize: storageStats._sum.size || 0, fileCount: storageStats._count };
  }

  async getTeams(query: { page?: number; limit?: number; search?: string; sort?: string }) {
    const { page = 1, limit = 20, search, sort = 'createdAt' } = query;
    const where: { OR?: { name?: object; code?: object }[] } = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }];
    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { [sort]: 'desc' }, include: { owner: { select: { id: true, name: true, avatar: true, color: true } }, _count: { select: { members: true, projects: true, tasks: true } } } }),
      this.prisma.team.count({ where }),
    ]);
    return { teams, total, page, limit };
  }

  async getTeamDetail(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id }, include: { owner: { select: { id: true, name: true, avatar: true, color: true } }, members: { include: { user: { select: { id: true, name: true, avatar: true, color: true, email: true } } } }, projects: { select: { id: true, name: true, status: true, color: true } }, _count: { select: { tasks: true } } } });
    if (!team) throw new NotFoundException('团队不存在');
    return team;
  }

  async transferTeamOwnership(teamId: string, newOwnerId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: { members: true } });
    if (!team) throw new NotFoundException('团队不存在');
    if (!team.members.some(m => m.userId === newOwnerId)) throw new ForbiddenException('新所有者必须是团队成员');
    return this.prisma.team.update({ where: { id: teamId }, data: { ownerId: newOwnerId } });
  }

  async dissolveTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('团队不存在');
    await this.prisma.team.delete({ where: { id: teamId } });
    return { success: true };
  }

  async getProjects(query: { page?: number; limit?: number; status?: string; teamId?: string; search?: string }) {
    const { page = 1, limit = 20, status, teamId, search } = query;
    const where: { isArchived?: boolean; status?: string; teamId?: string; name?: object } = {};
    if (status === 'archived') where.isArchived = true;
    else if (status) { where.status = status; where.isArchived = false; }
    else where.isArchived = false;
    if (teamId) where.teamId = teamId;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { team: { select: { id: true, name: true } }, owner: { select: { id: true, name: true, avatar: true, color: true } }, _count: { select: { tasks: true, milestones: true } } } }),
      this.prisma.project.count({ where }),
    ]);
    return { projects, total, page, limit };
  }

  async getProjectDetail(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, include: { team: { select: { id: true, name: true } }, owner: { select: { id: true, name: true, avatar: true, color: true } }, milestones: { orderBy: { dueDate: 'asc' } }, _count: { select: { tasks: true } } } });
    if (!project) throw new NotFoundException('项目不存在');
    const taskStats = await this.prisma.task.groupBy({ by: ['status'], where: { projectId: id }, _count: true });
    return { ...project, taskStats };
  }

  async archiveProject(id: string) {
    return this.prisma.project.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() } });
  }

  async restoreProject(id: string) {
    return this.prisma.project.update({ where: { id }, data: { isArchived: false, archivedAt: null } });
  }

  async deleteProject(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id }, include: { _count: { select: { tasks: true } } } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project._count.tasks > 0) throw new ForbiddenException(`该项目下有 ${project._count.tasks} 个任务，请先删除或转移任务`);
    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }

  async getOverdueTasks(page = 1, limit = 20) {
    const where = { dueDate: { lt: new Date() }, status: { not: 'DONE' }, isArchived: false };
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { dueDate: 'asc' }, include: { team: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true, avatar: true, color: true } } } }),
      this.prisma.task.count({ where }),
    ]);
    return { tasks, total, page, limit };
  }

  async getTaskStats() {
    const [statusDist, unassigned] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], where: { isArchived: false }, _count: true }),
      this.prisma.task.count({ where: { assigneeId: null, isArchived: false } }),
    ]);
    return { statusDistribution: statusDist.map(s => ({ status: s.status, count: s._count })), unassignedCount: unassigned };
  }

  async batchArchiveTasks(taskIds: string[]) {
    const result = await this.prisma.task.updateMany({ where: { id: { in: taskIds } }, data: { isArchived: true, archivedAt: new Date() } });
    return { success: result.count, failed: taskIds.length - result.count };
  }

  async getAuditLogs(query: { page?: number; limit?: number; startDate?: string; endDate?: string; action?: string; entityType?: string; userId?: string }) {
    const { page = 1, limit = 50, startDate, endDate, action, entityType, userId } = query;
    const where: { createdAt?: { gte?: Date; lte?: Date }; action?: string; entityType?: string; userId?: string } = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, avatar: true, color: true } } } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page, limit };
  }

  async getSettings() {
    const settings = await this.prisma.systemSetting.findMany();
    return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {} as Record<string, string>);
  }

  async updateSetting(key: string, value: string) {
    return this.prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  async getStorageStats() {
    const stats = await this.prisma.attachment.aggregate({ _sum: { size: true }, _count: true });
    return { totalSize: stats._sum.size || 0, fileCount: stats._count };
  }
}
