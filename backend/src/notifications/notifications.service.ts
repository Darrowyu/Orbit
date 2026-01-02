import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

export type NotificationType = 
  | 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'SUBTASK_COMPLETED' 
  | 'TEAM_JOINED' | 'ROLE_CHANGED' | 'TEAM_MEMBER_ADDED'
  | 'PROJECT_MEMBER_ADDED' | 'PROJECT_MEMBER_REMOVED' | 'PROJECT_ROLE_CHANGED'
  | 'NEW_COMMENT' | 'TASK_DUE_SOON' | 'TASK_OVERDUE';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  async create(userId: string, type: NotificationType, title: string, message: string, data?: object) {
    if (!await this.shouldNotify(userId, type)) return null; // 检查偏好设置
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message, data },
    });
    this.gateway.sendToUser(userId, notification); // 实时推送
    return notification;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
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

  async delete(id: string, userId: string) {
    await this.prisma.notification.deleteMany({ where: { id, userId } });
    return { success: true };
  }

  async deleteAll(userId: string) {
    await this.prisma.notification.deleteMany({ where: { userId } });
    return { success: true };
  }

  // 偏好设置
  async getPreferences(userId: string) {
    let pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!pref) pref = await this.prisma.notificationPreference.create({ data: { userId } });
    return pref;
  }

  async updatePreferences(userId: string, data: Partial<{
    taskAssigned: boolean; taskStatusChanged: boolean; taskDueSoon: boolean; taskOverdue: boolean;
    newComment: boolean; projectMemberAdded: boolean; teamJoined: boolean; browserPush: boolean;
  }>) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  private async shouldNotify(userId: string, type: NotificationType): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!pref) return true; // 默认发送
    const typeMap: Record<NotificationType, keyof typeof pref> = {
      TASK_ASSIGNED: 'taskAssigned', TASK_STATUS_CHANGED: 'taskStatusChanged',
      TASK_DUE_SOON: 'taskDueSoon', TASK_OVERDUE: 'taskOverdue',
      NEW_COMMENT: 'newComment', PROJECT_MEMBER_ADDED: 'projectMemberAdded',
      PROJECT_MEMBER_REMOVED: 'projectMemberAdded', PROJECT_ROLE_CHANGED: 'projectMemberAdded',
      TEAM_JOINED: 'teamJoined', ROLE_CHANGED: 'teamJoined',
      TEAM_MEMBER_ADDED: 'teamJoined', SUBTASK_COMPLETED: 'taskStatusChanged',
    };
    const key = typeMap[type];
    return key ? Boolean(pref[key]) : true;
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

  // 项目相关通知
  async notifyProjectMemberAdded(projectName: string, userId: string, adderName: string) {
    await this.create(userId, 'PROJECT_MEMBER_ADDED', '加入项目', `${adderName} 将你添加到项目「${projectName}」`);
  }

  async notifyProjectMemberRemoved(projectName: string, userId: string, removerName: string) {
    await this.create(userId, 'PROJECT_MEMBER_REMOVED', '移出项目', `${removerName} 将你从项目「${projectName}」中移除`);
  }

  async notifyProjectRoleChanged(projectName: string, userId: string, newRole: string, changerName: string) {
    const roleMap: Record<string, string> = { owner: '所有者', admin: '管理员', member: '成员' };
    await this.create(userId, 'PROJECT_ROLE_CHANGED', '项目角色变更', `${changerName} 将你在项目「${projectName}」的角色改为「${roleMap[newRole] || newRole}」`);
  }

  // 评论通知
  async notifyNewComment(taskTitle: string, assigneeId: string, commenterName: string) {
    await this.create(assigneeId, 'NEW_COMMENT', '新评论', `${commenterName} 在任务「${taskTitle}」中发表了评论`);
  }

  // 截止提醒通知
  async notifyTaskDueSoon(taskTitle: string, assigneeId: string, dueDate: Date) {
    const dateStr = dueDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    await this.create(assigneeId, 'TASK_DUE_SOON', '任务即将到期', `任务「${taskTitle}」将于 ${dateStr} 到期`);
  }

  async notifyTaskOverdue(taskTitle: string, assigneeId: string) {
    await this.create(assigneeId, 'TASK_OVERDUE', '任务已逾期', `任务「${taskTitle}」已逾期，请尽快处理`);
  }
}
