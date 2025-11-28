import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async findAll(teamId: string, includeArchived = false) {
    const tasks = await this.prisma.task.findMany({ where: { teamId, isArchived: includeArchived ? undefined : false }, include: { subtasks: true }, orderBy: { createdAt: 'desc' } });
    return tasks.map(this.format);
  }

  async findArchived(teamId: string) {
    const tasks = await this.prisma.task.findMany({ where: { teamId, isArchived: true }, include: { subtasks: true }, orderBy: { archivedAt: 'desc' } });
    return tasks.map(this.format);
  }

  async archive(id: string) {
    const task = await this.prisma.task.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() }, include: { subtasks: true } });
    return this.format(task);
  }

  async restore(id: string) {
    const task = await this.prisma.task.update({ where: { id }, data: { isArchived: false, archivedAt: null }, include: { subtasks: true } });
    return this.format(task);
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: { subtasks: true } });
    if (!task) throw new NotFoundException('任务不存在');
    return this.format(task);
  }

  async create(dto: CreateTaskDto, teamId: string, operatorId: string) {
    const { subtasks, dueDate, ...data } = dto;
    const task = await this.prisma.task.create({
      data: {
        ...data,
        teamId,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtasks: subtasks?.length ? { create: subtasks.map(s => ({ id: s.id, title: s.title, completed: s.completed || false, assigneeId: s.assigneeId })) } : undefined,
      },
      include: { subtasks: true },
    });
    if (task.assigneeId && task.assigneeId !== operatorId) {
      const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
      await this.notifications.notifyTaskAssigned(task.title, task.assigneeId, operator?.name || '某人');
    }
    return this.format(task);
  }

  async update(id: string, dto: UpdateTaskDto, operatorId: string) {
    const oldTask = await this.prisma.task.findUnique({ where: { id }, include: { subtasks: true } });
    if (!oldTask) throw new NotFoundException('任务不存在');
    const { subtasks, dueDate, ...data } = dto;
    if (subtasks) {
      await this.prisma.subtask.deleteMany({ where: { taskId: id } });
      await this.prisma.subtask.createMany({ data: subtasks.map(s => ({ id: s.id, title: s.title, completed: s.completed || false, assigneeId: s.assigneeId, taskId: id })) });
    }
    const task = await this.prisma.task.update({
      where: { id },
      data: { ...data, dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined },
      include: { subtasks: true },
    });
    const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
    const operatorName = operator?.name || '某人';
    if (dto.assigneeId && dto.assigneeId !== oldTask.assigneeId && dto.assigneeId !== operatorId) {
      await this.notifications.notifyTaskAssigned(task.title, dto.assigneeId, operatorName);
    }
    if (dto.status && dto.status !== oldTask.status && oldTask.assigneeId && oldTask.assigneeId !== operatorId) {
      await this.notifications.notifyTaskStatusChanged(task.title, oldTask.assigneeId, dto.status, operatorName);
    }
    if (subtasks && oldTask.assigneeId && oldTask.assigneeId !== operatorId) {
      const oldCompleted = new Set(oldTask.subtasks.filter(s => s.completed).map(s => s.id));
      const newCompleted = subtasks.filter(s => s.completed && !oldCompleted.has(s.id));
      for (const st of newCompleted) {
        await this.notifications.notifySubtaskCompleted(task.title, st.title, oldTask.assigneeId, operatorName);
      }
    }
    return this.format(task);
  }

  async remove(id: string) {
    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }

  private format(task: any) {
    return { ...task, createdAt: task.createdAt.toISOString(), dueDate: task.dueDate?.toISOString() || null, archivedAt: task.archivedAt?.toISOString() || null };
  }
}
