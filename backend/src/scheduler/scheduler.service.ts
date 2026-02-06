import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private notifiedDueSoon = new Set<string>(); // 防止重复通知
  private notifiedOverdue = new Set<string>();

  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkDueTasks() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 即将到期的任务（24小时内）
      const dueSoonTasks = await this.prisma.task.findMany({
        where: {
          dueDate: { gte: now, lte: tomorrow },
          status: { not: 'DONE' },
          assigneeId: { not: null },
          isArchived: false,
        },
      });

      for (const task of dueSoonTasks) {
        try {
          const key = `${task.id}-${task.dueDate?.toDateString()}`;
          if (task.assigneeId && task.dueDate && !this.notifiedDueSoon.has(key)) {
            await this.notifications.notifyTaskDueSoon(task.title, task.assigneeId, task.dueDate);
            this.notifiedDueSoon.add(key);
          }
        } catch (error) {
          this.logger.error(`Failed to notify due soon for task ${task.id}:`, error);
        }
      }

      // 已逾期的任务
      const overdueTasks = await this.prisma.task.findMany({
        where: {
          dueDate: { lt: now },
          status: { not: 'DONE' },
          assigneeId: { not: null },
          isArchived: false,
        },
      });

      for (const task of overdueTasks) {
        try {
          const key = `${task.id}-overdue`;
          if (task.assigneeId && !this.notifiedOverdue.has(key)) {
            await this.notifications.notifyTaskOverdue(task.title, task.assigneeId);
            this.notifiedOverdue.add(key);
          }
        } catch (error) {
          this.logger.error(`Failed to notify overdue for task ${task.id}:`, error);
        }
      }

      this.logger.log(`Checked ${dueSoonTasks.length} due soon, ${overdueTasks.length} overdue tasks`);
    } catch (error) {
      this.logger.error('Error in checkDueTasks scheduler:', error);
    }
  }

  // 每天清理已完成任务的通知记录
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupNotificationCache() {
    try {
      const doneTasks = await this.prisma.task.findMany({ where: { status: 'DONE' }, select: { id: true } });
      const doneIds = new Set(doneTasks.map(t => t.id));
      this.notifiedDueSoon.forEach(key => { if (doneIds.has(key.split('-')[0])) this.notifiedDueSoon.delete(key); });
      this.notifiedOverdue.forEach(key => { if (doneIds.has(key.split('-')[0])) this.notifiedOverdue.delete(key); });
      this.logger.log('Notification cache cleaned up');
    } catch (error) {
      this.logger.error('Error in cleanupNotificationCache scheduler:', error);
    }
  }
}
