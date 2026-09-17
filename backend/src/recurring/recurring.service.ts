import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TasksGateway } from '../gateway/tasks.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';

interface CreateRecurringDto {
  templateId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
}

// 兼容历史 stringify 写入的数据：string 则 parse，数组直接用
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private gateway: TasksGateway,
  ) {}

  async create(dto: CreateRecurringDto, teamId: string, userId: string) {
    const template = await this.prisma.taskTemplate.findFirst({ where: { id: dto.templateId, teamId } });
    if (!template) throw new NotFoundException('模板不存在');

    const startDate = new Date(dto.startDate);
    const nextRun = this.calculateNextRun(startDate, dto.frequency, dto.interval || 1, dto.daysOfWeek, dto.dayOfMonth);

    return this.prisma.recurringTask.create({
      data: {
        templateId: dto.templateId,
        frequency: dto.frequency,
        interval: dto.interval || 1,
        daysOfWeek: dto.daysOfWeek || [],
        dayOfMonth: dto.dayOfMonth,
        startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextRun,
        teamId,
        createdBy: userId,
      },
      include: { template: true },
    });
  }

  async findAll(teamId: string) {
    return this.prisma.recurringTask.findMany({
      where: { teamId },
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: { isActive?: boolean; endDate?: string }, teamId: string) {
    const rt = await this.prisma.recurringTask.findFirst({ where: { id, teamId } });
    if (!rt) throw new NotFoundException('重复任务不存在');
    return this.prisma.recurringTask.update({
      where: { id },
      data: { ...data, endDate: data.endDate ? new Date(data.endDate) : undefined },
    });
  }

  async delete(id: string, teamId: string) {
    const rt = await this.prisma.recurringTask.findFirst({ where: { id, teamId } });
    if (!rt) throw new NotFoundException('重复任务不存在');
    return this.prisma.recurringTask.delete({ where: { id } });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processRecurringTasks() {
    const now = new Date();
    const dueRecurring = await this.prisma.recurringTask.findMany({
      where: { isActive: true, nextRun: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] },
      include: { template: true },
    });

    for (const rt of dueRecurring) {
      try {
        const subtasks = parseJsonArray(rt.template.subtasks);
        const labelIds = parseJsonArray(rt.template.labelIds);
        const nextRun = this.calculateNextRun(now, rt.frequency, rt.interval, rt.daysOfWeek, rt.dayOfMonth ?? undefined);

        // 乐观锁抢占执行权 + 建任务与推进 nextRun 同事务：任一步失败整体回滚，下一周期重试
        const validLabelIds = labelIds.length > 0
          ? (await this.prisma.label.findMany({ where: { id: { in: labelIds }, teamId: rt.teamId }, select: { id: true } })).map(l => l.id) // 过滤已删除/跨团队标签，避免 FK 报错导致周期任务每小时重试
          : [];
        const task = await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.recurringTask.updateMany({
            where: { id: rt.id, nextRun: rt.nextRun },
            data: { lastCreated: now, nextRun },
          });
          if (claimed.count === 0) return null; // 已被其他实例处理
          const created = await tx.task.create({
            data: {
              title: rt.template.title,
              description: rt.template.description,
              priority: rt.template.priority,
              teamId: rt.teamId,
              subtasks: { create: subtasks.map((title) => ({ title })) },
            },
            include: { subtasks: true, labels: { include: { label: true } } },
          });
          if (validLabelIds.length > 0) { // 应用模板标签
            await tx.taskLabel.createMany({ data: validLabelIds.map((labelId) => ({ taskId: created.id, labelId })), skipDuplicates: true });
          }
          return created;
        });
        if (!task) continue;

        if (rt.createdBy) {
          await this.audit.log({ action: 'CREATE', entityType: 'TASK', entityId: task.id, userId: rt.createdBy, teamId: rt.teamId, newValue: { title: task.title, source: 'recurring', recurringTaskId: rt.id } });
        }
        this.gateway.emitTaskCreated(rt.teamId, { ...task, labels: task.labels.map((tl) => tl.label) });
        this.logger.log(`Created recurring task from template: ${rt.template.name}`);
      } catch (e) {
        this.logger.error(`Failed to create recurring task ${rt.id}: ${e.message}`);
      }
    }
  }

  // 统一按 UTC 计算，消除服务器时区/DST 漂移
  private calculateNextRun(from: Date, frequency: string, interval: number, daysOfWeek?: number[], dayOfMonth?: number): Date {
    const next = new Date(from);

    switch (frequency) {
      case 'DAILY':
        next.setUTCDate(next.getUTCDate() + interval);
        break;
      case 'WEEKLY':
        if (daysOfWeek && daysOfWeek.length > 0) {
          let found = false;
          for (let i = 1; i <= 7; i++) {
            const check = new Date(next);
            check.setUTCDate(check.getUTCDate() + i);
            if (daysOfWeek.includes(check.getUTCDay())) {
              next.setTime(check.getTime());
              found = true;
              break;
            }
          }
          if (!found) next.setUTCDate(next.getUTCDate() + 7 * interval);
        } else {
          next.setUTCDate(next.getUTCDate() + 7 * interval);
        }
        break;
      case 'MONTHLY': {
        // 先按 year/month 算术定位目标月份，再把日钳制到目标月最后一天，
        // 避免锚点 1/31 直接 setUTCMonth(+1) 溢出到 3 月跳过 2 月
        const totalMonths = next.getUTCFullYear() * 12 + next.getUTCMonth() + interval;
        const targetYear = Math.floor(totalMonths / 12);
        const targetMonth = ((totalMonths % 12) + 12) % 12;
        const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        next.setUTCFullYear(targetYear, targetMonth, Math.min(dayOfMonth ?? next.getUTCDate(), lastDay));
        break;
      }
    }

    next.setUTCHours(9, 0, 0, 0);
    return next;
  }
}
