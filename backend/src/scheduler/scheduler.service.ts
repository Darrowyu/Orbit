import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private notifiedDueSoon = new Set<string>();
  private notifiedOverdue = new Set<string>();

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
        const key = `${task.id}-${task.dueDate?.toDateString()}`;
        if (task.assigneeId && task.dueDate && !this.notifiedDueSoon.has(key)) {
          await this.notifications.notifyTaskDueSoon(task.title, task.assigneeId, task.dueDate);
          this.notifiedDueSoon.add(key);
        }
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
        const key = `${task.id}-overdue`;
        if (task.assigneeId && !this.notifiedOverdue.has(key)) {
          await this.notifications.notifyTaskOverdue(task.title, task.assigneeId);
          this.notifiedOverdue.add(key);
        }
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupNotificationCache() {
    try {
      const doneTasks = await this.prisma.task.findMany({
        where: { status: 'DONE' },
        select: { id: true },
      });

      const doneIds = new Set(doneTasks.map(t => t.id));
      this.cleanupSet(this.notifiedDueSoon, doneIds);
      this.cleanupSet(this.notifiedOverdue, doneIds);

      this.logger.log('Notification cache cleaned');
    } catch (error) {
      this.logger.error('Failed to cleanup notification cache:', error);
    }
  }

  private cleanupSet(set: Set<string>, doneIds: Set<string>): void {
    for (const key of set) {
      if (doneIds.has(key.split('-')[0])) {
        set.delete(key);
      }
    }
  }
}
