import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(private prisma: PrismaService) {}

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
        const subtasks = JSON.parse(rt.template.subtasks as string || '[]');
        const labelIds = JSON.parse(rt.template.labelIds as string || '[]');
        
        const task = await this.prisma.task.create({
          data: {
            title: rt.template.title,
            description: rt.template.description,
            priority: rt.template.priority,
            teamId: rt.teamId,
            subtasks: { create: subtasks.map((s: string) => ({ title: s })) },
          },
        });
        if (labelIds.length > 0) { // 应用模板标签
          await this.prisma.taskLabel.createMany({ data: labelIds.map((labelId: string) => ({ taskId: task.id, labelId })) });
        }

        const nextRun = this.calculateNextRun(now, rt.frequency, rt.interval, rt.daysOfWeek, rt.dayOfMonth ?? undefined);
        await this.prisma.recurringTask.update({
          where: { id: rt.id },
          data: { lastCreated: now, nextRun },
        });

        this.logger.log(`Created recurring task from template: ${rt.template.name}`);
      } catch (e) {
        this.logger.error(`Failed to create recurring task ${rt.id}: ${e.message}`);
      }
    }
  }

  private calculateNextRun(from: Date, frequency: string, interval: number, daysOfWeek?: number[], dayOfMonth?: number): Date {
    const next = new Date(from);
    
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + interval);
        break;
      case 'WEEKLY':
        if (daysOfWeek && daysOfWeek.length > 0) {
          let found = false;
          for (let i = 1; i <= 7; i++) {
            const check = new Date(next);
            check.setDate(check.getDate() + i);
            if (daysOfWeek.includes(check.getDay())) {
              next.setTime(check.getTime());
              found = true;
              break;
            }
          }
          if (!found) next.setDate(next.getDate() + 7 * interval);
        } else {
          next.setDate(next.getDate() + 7 * interval);
        }
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + interval);
        if (dayOfMonth) next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        break;
    }
    
    next.setHours(9, 0, 0, 0);
    return next;
  }
}
