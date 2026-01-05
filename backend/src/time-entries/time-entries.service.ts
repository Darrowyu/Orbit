import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) {}

  async start(taskId: string, userId: string, teamId: string, description?: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, teamId } });
    if (!task) throw new NotFoundException('任务不存在');
    
    const running = await this.prisma.timeEntry.findFirst({ where: { userId, endTime: null } });
    if (running) throw new BadRequestException('请先停止当前计时');
    
    return this.prisma.timeEntry.create({ data: { taskId, userId, startTime: new Date(), description: description || '' } });
  }

  async stop(id: string, userId: string) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId, endTime: null } });
    if (!entry) throw new NotFoundException('计时记录不存在或已结束');
    
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / 60000);
    
    return this.prisma.timeEntry.update({ where: { id }, data: { endTime, duration } });
  }

  async getRunning(userId: string) {
    return this.prisma.timeEntry.findFirst({ where: { userId, endTime: null }, include: { task: { select: { id: true, title: true } } } });
  }

  async getByTask(taskId: string, teamId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, teamId } });
    if (!task) throw new NotFoundException('任务不存在');
    return this.prisma.timeEntry.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
      orderBy: { startTime: 'desc' },
    });
  }

  async getByUser(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { userId };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }
    return this.prisma.timeEntry.findMany({
      where,
      include: { task: { select: { id: true, title: true, projectId: true } } },
      orderBy: { startTime: 'desc' },
    });
  }

  async getTotalByTask(taskId: string, teamId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, teamId } });
    if (!task) throw new NotFoundException('任务不存在');
    const entries = await this.prisma.timeEntry.findMany({ where: { taskId, duration: { not: null } }, select: { duration: true } });
    return entries.reduce((sum, e) => sum + (e.duration || 0), 0);
  }

  async delete(id: string, userId: string) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('记录不存在');
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  async update(id: string, userId: string, data: { description?: string; duration?: number }) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw new NotFoundException('记录不存在');
    return this.prisma.timeEntry.update({ where: { id }, data });
  }
}
