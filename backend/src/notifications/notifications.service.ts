import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'SUBTASK_COMPLETED' | 'TEAM_JOINED' | 'ROLE_CHANGED' | 'TEAM_MEMBER_ADDED';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  async create(userId: string, type: NotificationType, title: string, message: string, data?: any) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message, data },
    });
    this.gateway.sendToUser(userId, notification); // 实时推送
    return notification;
  }

  async getUserNotifications(userId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  // 通知触发方法
  async notifyTaskAssigned(taskTitle: string, assigneeId: string, assignerName: string) {
    await this.create(assigneeId, 'TASK_ASSIGNED', '新任务指派', `${assignerName} 将任务「${taskTitle}」指派给了你`);
  }

  async notifyTaskStatusChanged(taskTitle: string, assigneeId: string, newStatus: string, changerName: string) {
    const statusMap: Record<string, string> = { TODO: '待处理', IN_PROGRESS: '进行中', REVIEW: '审核中', DONE: '已完成' };
    await this.create(assigneeId, 'TASK_STATUS_CHANGED', '任务状态更新', `${changerName} 将任务「${taskTitle}」状态改为「${statusMap[newStatus] || newStatus}」`);
  }

  async notifySubtaskCompleted(taskTitle: string, subtaskTitle: string, assigneeId: string, completerName: string) {
    await this.create(assigneeId, 'SUBTASK_COMPLETED', '子任务完成', `${completerName} 完成了任务「${taskTitle}」的子任务「${subtaskTitle}」`);
  }

  async notifyTeamJoined(teamName: string, userId: string) {
    await this.create(userId, 'TEAM_JOINED', '加入团队', `你已成功加入团队「${teamName}」`);
  }

  async notifyRoleChanged(teamName: string, userId: string, newRole: string) {
    const roleMap: Record<string, string> = { owner: '所有者', admin: '管理员', member: '成员' };
    await this.create(userId, 'ROLE_CHANGED', '角色变更', `你在团队「${teamName}」的角色已变更为「${roleMap[newRole] || newRole}」`);
  }

  async notifyNewTeamMember(teamId: string, newMemberName: string, excludeUserId: string) {
    const members = await this.prisma.teamMember.findMany({ where: { teamId, userId: { not: excludeUserId } }, select: { userId: true } });
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    for (const m of members) {
      await this.create(m.userId, 'TEAM_MEMBER_ADDED', '新成员加入', `${newMemberName} 加入了团队「${team?.name}」`);
    }
  }
}
