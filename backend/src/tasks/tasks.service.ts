import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, TaskDbEntity } from './dto/task.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

interface TaskLabel { label: { id: string; name: string; color: string } }
export interface FormattedTask { createdAt: string; dueDate: string | null; archivedAt: string | null; [key: string]: unknown }

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService, private audit: AuditService) { }

  private readonly taskInclude = { subtasks: true, labels: { include: { label: true } } } as const;

  private formatWithLabels(task: TaskDbEntity & { labels?: TaskLabel[] }): FormattedTask & { labels: Array<{ id: string; name: string; color: string }> } {
    return { ...this.format(task), labels: task.labels?.map((tl) => tl.label) || [] };
  }

  private async validateDependencies(taskId: string, newStatus: string, teamId: string): Promise<{ valid: boolean; error?: string }> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { dependsOn: true } });
    if (!task?.dependsOn?.length) return { valid: true };
    const restrictedStatuses = ['IN_PROGRESS', 'REVIEW', 'DONE'];
    if (!restrictedStatuses.includes(newStatus)) return { valid: true };
    const incompleteDeps = await this.prisma.task.findMany({
      where: { id: { in: task.dependsOn }, teamId, status: { not: 'DONE' } },
      select: { id: true, title: true }
    });
    if (incompleteDeps.length > 0) {
      return { valid: false, error: `依赖的前置任务未完成：${incompleteDeps.map(t => t.title).join('、')}` };
    }
    return { valid: true };
  }

  private async validateProjectAndMilestone(projectId?: string, milestoneId?: string, teamId?: string, assigneeId?: string): Promise<void> {
    if (projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { teamId: true, isArchived: true } });
      if (!project) throw new BadRequestException('指定的项目不存在');
      if (teamId && project.teamId !== teamId) throw new BadRequestException('任务只能关联到同一团队的项目');
      if (project.isArchived) throw new BadRequestException('无法将任务关联到已归档的项目');
      if (assigneeId) { // 验证 assignee 是项目成员
        const isMember = await this.prisma.projectMember.findUnique({ where: { userId_projectId: { userId: assigneeId, projectId } } });
        if (!isMember) throw new BadRequestException('任务负责人必须是项目成员');
      }
    }
    if (milestoneId) {
      const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId }, select: { projectId: true } });
      if (!milestone) throw new BadRequestException('指定的里程碑不存在');
      if (projectId && milestone.projectId !== projectId) throw new BadRequestException('里程碑必须属于任务所在的项目');
    }
  }

  private async detectCircularDependency(taskId: string, newDependsOn: string[], teamId: string): Promise<{ hasCircle: boolean; path?: string[] }> {
    if (!newDependsOn?.length) return { hasCircle: false };
    const allTasks = await this.prisma.task.findMany({
      where: { teamId, isArchived: false },
      select: { id: true, dependsOn: true, title: true }
    });
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const path: string[] = [];
    const dfs = (currentId: string): boolean => {
      if (currentId === taskId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);
      path.push(taskMap.get(currentId)?.title || currentId);
      const task = taskMap.get(currentId);
      const deps = currentId === taskId ? newDependsOn : (task?.dependsOn || []);
      for (const depId of deps) {
        if (dfs(depId)) return true;
      }
      path.pop();
      return false;
    };
    for (const depId of newDependsOn) {
      visited.clear();
      path.length = 0;
      if (dfs(depId)) return { hasCircle: true, path: [...path] };
    }
    return { hasCircle: false };
  }

  async findAll(teamId: string, options?: { includeArchived?: boolean; page?: number; limit?: number; projectId?: string }) {
    const { includeArchived = false, page = 1, limit = 100, projectId } = options || {};
    const where = { teamId, isArchived: includeArchived ? undefined : false, ...(projectId && { projectId }) };
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({ where, include: this.taskInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.task.count({ where })
    ]);
    return { data: tasks.map(t => this.formatWithLabels(t)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findArchived(teamId: string) {
    const tasks = await this.prisma.task.findMany({ where: { teamId, isArchived: true }, include: { subtasks: true }, orderBy: { archivedAt: 'desc' } });
    return tasks.map(this.format);
  }

  async archive(id: string, operatorId?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true } });
    if (!existing) throw new NotFoundException('任务不存在');
    await this.cleanupDanglingDependencies(id, existing.teamId);
    const task = await this.prisma.task.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() }, include: { subtasks: true } });
    if (operatorId) {
      await this.audit.log({ action: 'ARCHIVE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: task.teamId });
    }
    return this.format(task);
  }

  async restore(id: string, operatorId?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true } });
    if (!existing) throw new NotFoundException('任务不存在');
    const task = await this.prisma.task.update({ where: { id }, data: { isArchived: false, archivedAt: null }, include: { subtasks: true } });
    if (operatorId) {
      await this.audit.log({ action: 'RESTORE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: task.teamId });
    }
    return this.format(task);
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: { subtasks: true } });
    if (!task) throw new NotFoundException('任务不存在');
    return this.format(task);
  }

  async create(dto: CreateTaskDto, teamId: string, operatorId: string) {
    const { subtasks, dueDate, labelIds, ...data } = dto;
    // 验证权限：普通成员只能指定自己为负责人
    if (dto.assigneeId && dto.assigneeId !== operatorId) {
      const membership = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId: operatorId, teamId } } });
      if (!membership || membership.role === 'member') {
        throw new BadRequestException('普通成员只能将任务指派给自己');
      }
    }
    await this.validateProjectAndMilestone(dto.projectId, undefined, teamId, dto.assigneeId);
    if (dto.dependsOn?.length) {
      const circleCheck = await this.detectCircularDependency('', dto.dependsOn, teamId);
      if (circleCheck.hasCircle) throw new BadRequestException(`检测到循环依赖：${circleCheck.path?.join(' → ')}`);
    }
    const task = await this.prisma.task.create({
      data: {
        ...data, teamId, dueDate: dueDate ? new Date(dueDate) : null,
        subtasks: subtasks?.length ? { create: subtasks.map(s => ({ id: s.id, title: s.title, completed: s.completed || false, assigneeId: s.assigneeId })) } : undefined,
        labels: labelIds?.length ? { create: labelIds.map(labelId => ({ labelId })) } : undefined,
      },
      include: this.taskInclude,
    });
    if (task.assigneeId && task.assigneeId !== operatorId) {
      const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
      await this.notifications.notifyTaskAssigned(task.title, task.assigneeId, operator?.name || '某人');
    }
    await this.audit.log({ action: 'CREATE', entityType: 'TASK', entityId: task.id, userId: operatorId, teamId, newValue: { title: task.title, status: task.status, priority: task.priority } });
    return this.formatWithLabels(task);
  }

  async update(id: string, dto: UpdateTaskDto, operatorId: string) {
    const oldTask = await this.prisma.task.findUnique({ where: { id }, include: { subtasks: true } });
    if (!oldTask) throw new NotFoundException('任务不存在');
    // 验证权限：普通成员只能将任务指派给自己
    if (dto.assigneeId && dto.assigneeId !== operatorId && dto.assigneeId !== oldTask.assigneeId) {
      const membership = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId: operatorId, teamId: oldTask.teamId } } });
      if (!membership || membership.role === 'member') {
        throw new BadRequestException('普通成员只能将任务指派给自己');
      }
    }
    if (dto.status && dto.status !== oldTask.status) {
      const depCheck = await this.validateDependencies(id, dto.status, oldTask.teamId);
      if (!depCheck.valid) throw new BadRequestException(depCheck.error);
    }
    if (dto.dependsOn) {
      const circleCheck = await this.detectCircularDependency(id, dto.dependsOn, oldTask.teamId);
      if (circleCheck.hasCircle) throw new BadRequestException(`检测到循环依赖：${circleCheck.path?.join(' → ')}`);
    }
    const targetProjectId = dto.projectId !== undefined ? dto.projectId : oldTask.projectId;
    if (dto.projectId !== undefined || dto.assigneeId) {
      await this.validateProjectAndMilestone(targetProjectId || undefined, undefined, oldTask.teamId, dto.assigneeId);
    }
    const { subtasks, dueDate, labelIds, ...data } = dto;
    if (subtasks) {
      const existingIds = oldTask.subtasks.map(s => s.id);
      const newIds = subtasks.map(s => s.id);
      const toDelete = existingIds.filter(existId => !newIds.includes(existId));
      const toCreate = subtasks.filter(s => !existingIds.includes(s.id));
      const toUpdate = subtasks.filter(s => existingIds.includes(s.id));
      await this.prisma.$transaction(async (tx) => { // 使用事务批量操作，消除 N+1 问题
        if (toDelete.length) await tx.subtask.deleteMany({ where: { id: { in: toDelete } } });
        if (toCreate.length) await tx.subtask.createMany({ data: toCreate.map(s => ({ id: s.id, title: s.title, completed: s.completed || false, assigneeId: s.assigneeId, taskId: id })) });
        if (toUpdate.length) {
          await Promise.all(toUpdate.map(s => tx.subtask.update({ where: { id: s.id }, data: { title: s.title, completed: s.completed || false, assigneeId: s.assigneeId } })));
        }
      });
    }
    if (labelIds !== undefined) { // 更新标签：先删后建
      await this.prisma.taskLabel.deleteMany({ where: { taskId: id } });
      if (labelIds.length) await this.prisma.taskLabel.createMany({ data: labelIds.map(labelId => ({ taskId: id, labelId })), skipDuplicates: true });
    }
    const task = await this.prisma.task.update({
      where: { id },
      data: { ...data, dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined },
      include: this.taskInclude,
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
    await this.audit.log({
      action: 'UPDATE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: oldTask.teamId,
      oldValue: { title: oldTask.title, status: oldTask.status, priority: oldTask.priority, assigneeId: oldTask.assigneeId },
      newValue: { title: task.title, status: task.status, priority: task.priority, assigneeId: task.assigneeId }
    });
    return this.formatWithLabels(task);
  }

  async remove(id: string, operatorId?: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true, title: true } });
    if (!task) throw new NotFoundException('任务不存在');
    await this.cleanupDanglingDependencies(id, task.teamId);
    await this.prisma.task.delete({ where: { id } });
    if (operatorId) {
      await this.audit.log({ action: 'DELETE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: task.teamId, oldValue: { title: task.title } });
    }
    return { success: true };
  }

  private async cleanupDanglingDependencies(deletedTaskId: string, teamId: string): Promise<void> {
    const tasksWithDep = await this.prisma.task.findMany({
      where: { teamId, dependsOn: { has: deletedTaskId } },
      select: { id: true, dependsOn: true }
    });
    if (tasksWithDep.length > 0) {
      await Promise.all(tasksWithDep.map(task =>
        this.prisma.task.update({ where: { id: task.id }, data: { dependsOn: task.dependsOn.filter(depId => depId !== deletedTaskId) } })
      ));
    }
  }

  private format(task: TaskDbEntity): FormattedTask {
    return { ...task, createdAt: task.createdAt.toISOString(), dueDate: task.dueDate?.toISOString() || null, archivedAt: task.archivedAt?.toISOString() || null };
  }
}
