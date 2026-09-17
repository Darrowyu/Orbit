import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkDueTasks() {
    try {
      const now = new Date();
      await this.notifyDueSoonTasks(now);
      await this.notifyOverdueTasks(now);
      this.logger.log('Task notification check completed');
    } catch (error) {
      this.logger.error('Failed to check due tasks:', error);
    }
  }

  // 同任务同类型 24h 内已发过则跳过（DB 查重，重启/多实例不丢状态）
  private async hasRecentNotification(userId: string, type: NotificationType, taskId: string): Promise<boolean> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await this.prisma.notification.findFirst({
      where: { userId, type, createdAt: { gte: since }, data: { path: ['taskId'], equals: taskId } },
      select: { id: true },
    });
    return !!existing;
  }

  private async notifyDueSoonTasks(now: Date): Promise<void> {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: tomorrow },
        status: { not: 'DONE' },
        assigneeId: { not: null },
        isArchived: false,
      },
    });

    for (const task of tasks) {
      await this.safeNotify(async () => {
        if (!task.assigneeId || !task.dueDate) return;
        if (await this.hasRecentNotification(task.assigneeId, 'TASK_DUE_SOON', task.id)) return;
        await this.notifications.notifyTaskDueSoon(task.title, task.assigneeId, task.dueDate, task.id);
      }, `due soon notification for task ${task.id}`);
    }
  }

  private async notifyOverdueTasks(now: Date): Promise<void> {
    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { not: 'DONE' },
        assigneeId: { not: null },
        isArchived: false,
      },
    });

    for (const task of tasks) {
      await this.safeNotify(async () => {
        if (!task.assigneeId) return;
        if (await this.hasRecentNotification(task.assigneeId, 'TASK_OVERDUE', task.id)) return;
        await this.notifications.notifyTaskOverdue(task.title, task.assigneeId, task.id);
      }, `overdue notification for task ${task.id}`);
    }
  }

  private async safeNotify(notifyFn: () => Promise<void>, context: string): Promise<void> {
    try {
      await notifyFn();
    } catch (error) {
      this.logger.error(`Failed to send ${context}:`, error);
    }
  }
}
