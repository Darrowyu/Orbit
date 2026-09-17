import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, TaskDbEntity, TaskStatusType } from './dto/task.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { TasksGateway } from '../gateway/tasks.gateway';

export interface TaskLabel { label: { id: string; name: string; color: string } }
export interface BatchError { id: string; reason: string }

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService, private notifications: NotificationsService, private audit: AuditService, private gateway: TasksGateway) { }

  private readonly taskInclude = { subtasks: true, labels: { include: { label: true } } } as const;

  private format(task: TaskDbEntity & { labels?: TaskLabel[] }) {
    const base = {
      ...task,
      createdAt: task.createdAt.toISOString(),
      dueDate: task.dueDate?.toISOString() || null,
      archivedAt: task.archivedAt?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() || null
    };
    return task.labels ? { ...base, labels: task.labels.map((tl) => tl.label) } : base;
  }

  private async validateAssigneePermission(newAssigneeId: string | undefined, currentAssigneeId: string | null | undefined, operatorId: string, teamId: string): Promise<void> {
    if (!newAssigneeId || newAssigneeId === operatorId || newAssigneeId === currentAssigneeId) return;
    
    const membership = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId: operatorId, teamId } } });
    if (!membership || membership.role === 'member') {
      throw new ForbiddenException('普通成员只能将任务指派给自己');
    }
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

  // 标签必须全部属于本团队，防止跨团队引用
  private async validateLabelIds(labelIds: string[], teamId: string): Promise<void> {
    if (!labelIds?.length) return;
    const unique = [...new Set(labelIds)];
    const found = await this.prisma.label.count({ where: { id: { in: unique }, teamId } });
    if (found !== unique.length) throw new BadRequestException('包含不存在或不属于本团队的标签');
  }

  // 依赖任务必须全部属于本团队
  private async validateDependsOn(dependsOn: string[], teamId: string): Promise<void> {
    if (!dependsOn?.length) return;
    const unique = [...new Set(dependsOn)];
    const found = await this.prisma.task.count({ where: { id: { in: unique }, teamId } });
    if (found !== unique.length) throw new BadRequestException('包含不存在或不属于本团队的依赖任务');
  }

  // 子任务负责人必须是团队成员
  private async validateSubtaskAssignees(subtasks: { assigneeId?: string }[], teamId: string): Promise<void> {
    const assigneeIds = [...new Set(subtasks.map(s => s.assigneeId).filter((id): id is string => !!id))];
    if (!assigneeIds.length) return;
    const found = await this.prisma.teamMember.count({ where: { teamId, userId: { in: assigneeIds } } });
    if (found !== assigneeIds.length) throw new BadRequestException('子任务负责人必须是团队成员');
  }

  private async validateProjectAndMilestone(projectId?: string, milestoneId?: string, teamId?: string, assigneeId?: string): Promise<void> {
    if (!projectId && !milestoneId) return;

    if (projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { teamId: true, isArchived: true } });
      if (!project) throw new BadRequestException('指定的项目不存在');
      if (teamId && project.teamId !== teamId) throw new BadRequestException('任务只能关联到同一团队的项目');
      if (project.isArchived) throw new BadRequestException('无法将任务关联到已归档的项目');
      
      if (assigneeId) {
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
    return { data: tasks.map(t => this.format(t)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findArchived(teamId: string) {
    const tasks = await this.prisma.task.findMany({ where: { teamId, isArchived: true }, include: { subtasks: true }, orderBy: { archivedAt: 'desc' }, take: 200 });
    return tasks.map(this.format);
  }

  async archive(id: string, operatorId?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true } });
    if (!existing) throw new NotFoundException('任务不存在');
    const task = await this.prisma.$transaction(async (tx) => { // 清理悬挂依赖与归档需原子完成；归档不动 completedAt
      await this.cleanupDanglingDependencies([id], existing.teamId, tx);
      return tx.task.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() }, include: { subtasks: true } });
    });
    if (operatorId) {
      await this.audit.log({ action: 'ARCHIVE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: task.teamId });
    }
    this.gateway.emitTaskDeleted(task.teamId, id); // 归档后从各客户端活跃看板移除
    return this.format(task);
  }

  async restore(id: string, operatorId?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true } });
    if (!existing) throw new NotFoundException('任务不存在');
    const task = await this.prisma.task.update({ where: { id }, data: { isArchived: false, archivedAt: null }, include: { subtasks: true } });
    if (operatorId) {
      await this.audit.log({ action: 'RESTORE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: task.teamId });
    }
    this.gateway.emitTaskCreated(task.teamId, this.format(task)); // 恢复后重新出现在看板
    return this.format(task);
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: { subtasks: true } });
    if (!task) throw new NotFoundException('任务不存在');
    return this.format(task);
  }

  async create(dto: CreateTaskDto, teamId: string, operatorId: string) {
    const { subtasks, dueDate, labelIds, ...data } = dto;
    await this.validateAssigneePermission(dto.assigneeId, null, operatorId, teamId);
    await this.validateProjectAndMilestone(dto.projectId, undefined, teamId, dto.assigneeId);
    await this.validateLabelIds(labelIds || [], teamId);
    if (subtasks) await this.validateSubtaskAssignees(subtasks, teamId);
    if (dto.dependsOn?.length) {
      await this.validateDependsOn(dto.dependsOn, teamId);
      const circleCheck = await this.detectCircularDependency('', dto.dependsOn, teamId);
      if (circleCheck.hasCircle) throw new BadRequestException(`检测到循环依赖：${circleCheck.path?.join(' → ')}`);
    }
    const task = await this.prisma.task.create({
      data: {
        ...data, teamId, dueDate: dueDate ? new Date(dueDate) : null,
        completedAt: dto.status === 'DONE' ? new Date() : null, // 与 update 路径口径一致：直接建 DONE 任务即写完成时间
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
    const formatted = this.format(task);
    this.gateway.emitTaskCreated(teamId, formatted);
    return formatted;
  }

  async update(id: string, dto: UpdateTaskDto, operatorId: string) {
    const oldTask = await this.prisma.task.findUnique({ where: { id }, include: { subtasks: true } });
    if (!oldTask) throw new NotFoundException('任务不存在');
    
    await this.validateAssigneePermission(dto.assigneeId, oldTask.assigneeId, operatorId, oldTask.teamId);
    if (dto.status && dto.status !== oldTask.status) {
      const depCheck = await this.validateDependencies(id, dto.status, oldTask.teamId);
      if (!depCheck.valid) throw new BadRequestException(depCheck.error);
    }
    if (dto.dependsOn) {
      await this.validateDependsOn(dto.dependsOn, oldTask.teamId);
      const circleCheck = await this.detectCircularDependency(id, dto.dependsOn, oldTask.teamId);
      if (circleCheck.hasCircle) throw new BadRequestException(`检测到循环依赖：${circleCheck.path?.join(' → ')}`);
    }
    if (dto.labelIds) await this.validateLabelIds(dto.labelIds, oldTask.teamId);
    if (dto.subtasks) await this.validateSubtaskAssignees(dto.subtasks, oldTask.teamId);
    const targetProjectId = dto.projectId !== undefined ? dto.projectId : oldTask.projectId;
    if (dto.projectId !== undefined || dto.assigneeId) {
      await this.validateProjectAndMilestone(targetProjectId || undefined, undefined, oldTask.teamId, dto.assigneeId);
    }
    const { subtasks, dueDate, labelIds, ...data } = dto;
    const updateData: Prisma.TaskUpdateInput = {
      ...data,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
    };
    if (dto.status && dto.status !== oldTask.status) { // 状态进入/离开 DONE 时维护 completedAt
      if (dto.status === 'DONE') updateData.completedAt = new Date();
      else if (oldTask.status === 'DONE') updateData.completedAt = null;
    }
    const task = await this.prisma.$transaction(async (tx) => { // 子任务 diff + 标签先删后建 + 任务更新需原子完成
      if (subtasks) {
        const existingIds = oldTask.subtasks.map(s => s.id);
        const newIds = subtasks.map(s => s.id);
        const toDelete = existingIds.filter(existId => !newIds.includes(existId));
        const toCreate = subtasks.filter(s => !existingIds.includes(s.id));
        const toUpdate = subtasks.filter(s => existingIds.includes(s.id));
        if (toDelete.length) await tx.subtask.deleteMany({ where: { id: { in: toDelete } } });
        if (toCreate.length) await tx.subtask.createMany({ data: toCreate.map(s => ({ id: s.id, title: s.title, completed: s.completed || false, assigneeId: s.assigneeId, taskId: id })) });
        if (toUpdate.length) {
          await Promise.all(toUpdate.map(s => tx.subtask.update({ where: { id: s.id }, data: { title: s.title, completed: s.completed || false, assigneeId: s.assigneeId } })));
        }
      }
      if (labelIds !== undefined) { // 更新标签：先删后建
        await tx.taskLabel.deleteMany({ where: { taskId: id } });
        if (labelIds.length) await tx.taskLabel.createMany({ data: labelIds.map(labelId => ({ taskId: id, labelId })), skipDuplicates: true });
      }
      return tx.task.update({ where: { id }, data: updateData, include: this.taskInclude });
    });
    // 通知、审计、WS 广播均在事务提交后执行；数据已提交，单个副作用失败仅记日志，互不影响也不 500
    const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
    const operatorName = operator?.name || '某人';
    if (dto.assigneeId && dto.assigneeId !== oldTask.assigneeId && dto.assigneeId !== operatorId) {
      try { await this.notifications.notifyTaskAssigned(task.title, dto.assigneeId, operatorName); }
      catch (e) { this.logger.warn(`指派通知失败 task=${id}: ${e?.message || e}`); }
    }
    if (dto.status && dto.status !== oldTask.status && oldTask.assigneeId && oldTask.assigneeId !== operatorId) {
      try { await this.notifications.notifyTaskStatusChanged(task.title, oldTask.assigneeId, dto.status, operatorName); }
      catch (e) { this.logger.warn(`状态变更通知失败 task=${id}: ${e?.message || e}`); }
    }
    if (subtasks && oldTask.assigneeId && oldTask.assigneeId !== operatorId) {
      const oldCompleted = new Set(oldTask.subtasks.filter(s => s.completed).map(s => s.id));
      const newCompleted = subtasks.filter(s => s.completed && !oldCompleted.has(s.id));
      for (const st of newCompleted) {
        try { await this.notifications.notifySubtaskCompleted(task.title, st.title, oldTask.assigneeId, operatorName); }
        catch (e) { this.logger.warn(`子任务完成通知失败 task=${id}: ${e?.message || e}`); }
      }
    }
    try {
      await this.audit.log({
        action: 'UPDATE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: oldTask.teamId,
        oldValue: { title: oldTask.title, status: oldTask.status, priority: oldTask.priority, assigneeId: oldTask.assigneeId },
        newValue: { title: task.title, status: task.status, priority: task.priority, assigneeId: task.assigneeId }
      });
    } catch (e) { this.logger.warn(`审计日志写入失败 task=${id}: ${e?.message || e}`); }
    const formatted = this.format(task);
    try { this.gateway.emitTaskUpdated(oldTask.teamId, formatted); }
    catch (e) { this.logger.warn(`任务更新广播失败 task=${id}: ${e?.message || e}`); }
    return formatted;
  }

  async remove(id: string, operatorId?: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true, title: true } });
    if (!task) throw new NotFoundException('任务不存在');
    const attachments = await this.prisma.attachment.findMany({ where: { taskId: id }, select: { filename: true } });
    await this.prisma.$transaction(async (tx) => { // 清理悬挂依赖与删除需原子完成
      await this.cleanupDanglingDependencies([id], task.teamId, tx);
      await tx.task.delete({ where: { id } });
    });
    this.unlinkAttachmentFiles(attachments.map(a => a.filename));
    if (operatorId) {
      await this.audit.log({ action: 'DELETE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: task.teamId, oldValue: { title: task.title } });
    }
    this.gateway.emitTaskDeleted(task.teamId, id);
    return { success: true };
  }

  // 异步清理孤儿附件文件，失败仅告警不影响主流程
  private unlinkAttachmentFiles(filenames: string[]): void {
    for (const filename of filenames) {
      fs.promises.unlink(path.join(process.cwd(), 'uploads/attachments', filename))
        .catch((e) => this.logger.warn(`附件文件清理失败 ${filename}: ${e?.message || e}`));
    }
  }

  private async cleanupDanglingDependencies(deletedTaskIds: string[], teamId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    const tasksWithDep = await client.task.findMany({
      where: { teamId, OR: deletedTaskIds.map(depId => ({ dependsOn: { has: depId } })) },
      select: { id: true, dependsOn: true }
    });
    await Promise.all(
      tasksWithDep.map(task =>
        client.task.update({
          where: { id: task.id },
          data: { dependsOn: task.dependsOn.filter(depId => !deletedTaskIds.includes(depId)) }
        })
      )
    );
  }

  // ========== 批量操作（校验规则与单条路径一致，写入整体一个事务） ==========

  // 一次查询校验所有任务归属当前团队，拆分有效任务与错误项
  private async loadTeamTasks(ids: string[], teamId: string) {
    const tasks = await this.prisma.task.findMany({ where: { id: { in: ids }, teamId } });
    const found = new Map(tasks.map(t => [t.id, t]));
    const valid: typeof tasks = [];
    const errors: BatchError[] = [];
    for (const id of ids) {
      const task = found.get(id);
      if (task) valid.push(task);
      else errors.push({ id, reason: '任务不存在或不属于当前团队' });
    }
    return { valid, errors };
  }

  async batchMove(ids: string[], status: TaskStatusType, teamId: string, operatorId: string) {
    const { valid, errors } = await this.loadTeamTasks(ids, teamId);
    const movable: typeof valid = [];
    for (const task of valid) { // 依赖校验复用单条路径逻辑
      if (task.status === status) continue; // 状态未变化：跳过，不更新、不审计、不广播
      const depCheck = await this.validateDependencies(task.id, status, teamId);
      if (!depCheck.valid) { errors.push({ id: task.id, reason: depCheck.error as string }); continue; }
      movable.push(task);
    }
    if (movable.length) {
      await this.prisma.$transaction(async (tx) => { // 整体一个事务，失败即整体回滚
        for (const task of movable) { // movable 中任务状态必然变化，completedAt 仅在真实状态迁移时写
          const completedAt = status === 'DONE' ? new Date() : task.status === 'DONE' ? null : undefined;
          await tx.task.update({ where: { id: task.id }, data: { status, ...(completedAt !== undefined && { completedAt }) } });
        }
      });
    }
    const changed = await this.prisma.task.findMany({ where: { id: { in: movable.map(t => t.id) } }, include: this.taskInclude });
    for (const task of changed) { // 提交后统一审计 + WS 广播
      await this.audit.log({ action: 'MOVE', entityType: 'TASK', entityId: task.id, userId: operatorId, teamId, newValue: { status } });
      this.gateway.emitTaskUpdated(teamId, this.format(task));
    }
    return { succeeded: movable.length, failed: errors.length, errors };
  }

  async batchDelete(ids: string[], teamId: string, operatorId: string) {
    const { valid, errors } = await this.loadTeamTasks(ids, teamId);
    if (!valid.length) return { succeeded: 0, failed: errors.length, errors };
    const validIds = valid.map(t => t.id);
    const attachments = await this.prisma.attachment.findMany({ where: { taskId: { in: validIds } }, select: { filename: true } });
    await this.prisma.$transaction(async (tx) => { // 悬挂依赖清理与删除整体一个事务
      await this.cleanupDanglingDependencies(validIds, teamId, tx);
      await tx.task.deleteMany({ where: { id: { in: validIds } } });
    });
    this.unlinkAttachmentFiles(attachments.map(a => a.filename));
    for (const task of valid) {
      await this.audit.log({ action: 'DELETE', entityType: 'TASK', entityId: task.id, userId: operatorId, teamId, oldValue: { title: task.title } });
      this.gateway.emitTaskDeleted(teamId, task.id);
    }
    return { succeeded: valid.length, failed: errors.length, errors };
  }

  async batchArchive(ids: string[], teamId: string, operatorId: string) {
    const { valid, errors } = await this.loadTeamTasks(ids, teamId);
    if (!valid.length) return { succeeded: 0, failed: errors.length, errors };
    const validIds = valid.map(t => t.id);
    await this.prisma.$transaction(async (tx) => { // 与单条归档一致：悬挂依赖清理 + 归档（不动 completedAt）
      await this.cleanupDanglingDependencies(validIds, teamId, tx);
      await tx.task.updateMany({ where: { id: { in: validIds } }, data: { isArchived: true, archivedAt: new Date() } });
    });
    for (const task of valid) {
      await this.audit.log({ action: 'ARCHIVE', entityType: 'TASK', entityId: task.id, userId: operatorId, teamId });
      this.gateway.emitTaskDeleted(teamId, task.id); // 归档后从各客户端活跃看板移除
    }
    return { succeeded: valid.length, failed: errors.length, errors };
  }

  async batchAssign(ids: string[], assigneeId: string | undefined, teamId: string, operatorId: string) {
    const targetAssigneeId = assigneeId || null;
    if (targetAssigneeId) { // 与单条路径一致：操作者权限 + 负责人须为团队成员
      await this.validateAssigneePermission(targetAssigneeId, undefined, operatorId, teamId);
      const assigneeMember = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId: targetAssigneeId, teamId } } });
      if (!assigneeMember) throw new BadRequestException('负责人不是团队成员');
    }
    const { valid, errors } = await this.loadTeamTasks(ids, teamId);
    const assignable: typeof valid = [];
    for (const task of valid) { // 与单条路径一致：负责人须为任务所属项目成员
      if (targetAssigneeId && task.projectId) {
        const isMember = await this.prisma.projectMember.findUnique({ where: { userId_projectId: { userId: targetAssigneeId, projectId: task.projectId } } });
        if (!isMember) { errors.push({ id: task.id, reason: '任务负责人必须是项目成员' }); continue; }
      }
      assignable.push(task);
    }
    if (assignable.length) {
      await this.prisma.$transaction(async (tx) => {
        await tx.task.updateMany({ where: { id: { in: assignable.map(t => t.id) } }, data: { assigneeId: targetAssigneeId } });
      });
    }
    const changed = await this.prisma.task.findMany({ where: { id: { in: assignable.map(t => t.id) } }, include: this.taskInclude });
    const oldAssigneeById = new Map(assignable.map(t => [t.id, t.assigneeId])); // 更新前的 assigneeId，用于通知判断
    const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
    for (const task of changed) {
      // 与单条 update 路径语义一致：真正变化且非自指派才发 TASK_ASSIGNED
      if (targetAssigneeId && oldAssigneeById.get(task.id) !== targetAssigneeId && targetAssigneeId !== operatorId) {
        await this.notifications.notifyTaskAssigned(task.title, targetAssigneeId, operator?.name || '某人');
      }
      await this.audit.log({ action: 'ASSIGN', entityType: 'TASK', entityId: task.id, userId: operatorId, teamId, newValue: { assigneeId: targetAssigneeId } });
      this.gateway.emitTaskUpdated(teamId, this.format(task));
    }
    return { succeeded: assignable.length, failed: errors.length, errors };
  }
}
