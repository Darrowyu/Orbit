# 任务系统全面重构 实施计划

**目标：** 修复任务系统的安全漏洞、数据验证缺陷、一致性问题，并优化性能

**架构：** 
- 后端：增强 DTO 验证、添加依赖校验服务、事务管理、审计日志集成
- 前端：乐观更新回滚机制、错误处理优化
- WebSocket：添加团队成员权限验证

**技术栈：** NestJS, Prisma, class-validator, Zustand, Socket.IO

---

## 任务概览

| 任务 | 优先级 | 描述 |
|-----|--------|-----|
| 1 | P0 | WebSocket 权限验证 |
| 2 | P1 | DTO 枚举验证增强 |
| 3 | P1 | 后端依赖状态校验 |
| 4 | P1 | 循环依赖检测 |
| 5 | P2 | TasksService 审计日志集成 |
| 6 | P2 | 批量操作事务化 |
| 7 | P2 | 删除时清理悬空引用 |
| 8 | P3 | 任务列表分页支持 |
| 9 | P3 | 前端乐观更新回滚 |

---

### 任务 1: WebSocket 权限验证

**文件：**
- 修改: `backend/src/gateway/tasks.gateway.ts`

**步骤1: 注入 PrismaService**

```typescript
// 在 constructor 中添加
constructor(private jwt: JwtService, private prisma: PrismaService) { }
```

**步骤2: 添加团队成员验证方法**

```typescript
private async verifyTeamMember(userId: string, teamId: string): Promise<boolean> {
  const member = await this.prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } }
  });
  return !!member;
}
```

**步骤3: 修改 handleConnection 添加验证**

```typescript
async handleConnection(client: Socket): Promise<void> {
  try {
    const token = client.handshake.auth?.token;
    if (!token) { client.disconnect(); return; }
    const payload = this.jwt.verify(token);
    client.data.userId = payload.sub;
    const teamId = client.handshake.query.teamId as string;
    if (teamId) {
      const isMember = await this.verifyTeamMember(payload.sub, teamId);
      if (!isMember) { client.disconnect(); return; } // 非团队成员断开连接
      client.join(`team:${teamId}`);
      this.userTeams.set(client.id, teamId);
    }
    this.logger.debug(`Client connected: ${client.id}, team: ${teamId || 'none'}`);
  } catch { client.disconnect(); }
}
```

**步骤4: 修改 handleJoinTeam 添加验证**

```typescript
@SubscribeMessage('join:team')
async handleJoinTeam(client: Socket, teamId: string) {
  const userId = client.data.userId;
  if (!userId) return;
  const isMember = await this.verifyTeamMember(userId, teamId);
  if (!isMember) {
    client.emit('error', { message: '您不是该团队成员' });
    return;
  }
  const oldTeamId = this.userTeams.get(client.id);
  if (oldTeamId) client.leave(`team:${oldTeamId}`);
  client.join(`team:${teamId}`);
  this.userTeams.set(client.id, teamId);
}
```

**步骤5: 添加 PrismaModule 到 imports**

在 `tasks.gateway.ts` 顶部添加：
```typescript
import { PrismaService } from '../prisma/prisma.service';
```

确保 `GatewayModule` 中导入了 `PrismaModule`。

**步骤6: 提交**

```bash
git add backend/src/gateway/tasks.gateway.ts
git commit -m "fix(gateway): add team membership verification for WebSocket"
```

---

### 任务 2: DTO 枚举验证增强

**文件：**
- 修改: `backend/src/tasks/dto/task.dto.ts`

**步骤1: 定义枚举常量**

```typescript
import { IsString, IsOptional, IsArray, IsBoolean, ValidateNested, IsIn, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export const TASK_STATUS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
export const TASK_PRIORITY = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskStatusType = typeof TASK_STATUS[number];
export type TaskPriorityType = typeof TASK_PRIORITY[number];
```

**步骤2: 更新 CreateTaskDto**

```typescript
export class CreateTaskDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: TaskStatusType;
  @IsOptional() @IsIn(TASK_PRIORITY) priority?: TaskPriorityType;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubtaskDto) subtasks?: SubtaskDto[];
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) dependsOn?: string[];
}
```

**步骤3: 更新 UpdateTaskDto**

```typescript
export class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: TaskStatusType;
  @IsOptional() @IsIn(TASK_PRIORITY) priority?: TaskPriorityType;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SubtaskDto) subtasks?: SubtaskDto[];
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) dependsOn?: string[];
}
```

**步骤4: 提交**

```bash
git add backend/src/tasks/dto/task.dto.ts
git commit -m "fix(dto): add enum validation for status and priority"
```

---

### 任务 3: 后端依赖状态校验

**文件：**
- 修改: `backend/src/tasks/tasks.service.ts`

**步骤1: 添加依赖校验方法**

```typescript
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
```

**步骤2: 在 update 方法中调用验证**

在 `update` 方法的开头，`const oldTask` 之后添加：

```typescript
if (dto.status && dto.status !== oldTask.status) {
  const depCheck = await this.validateDependencies(id, dto.status, oldTask.teamId);
  if (!depCheck.valid) {
    throw new BadRequestException(depCheck.error);
  }
}
```

**步骤3: 添加 BadRequestException 导入**

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
```

**步骤4: 提交**

```bash
git add backend/src/tasks/tasks.service.ts
git commit -m "feat(tasks): add dependency status validation on backend"
```

---

### 任务 4: 循环依赖检测

**文件：**
- 修改: `backend/src/tasks/tasks.service.ts`

**步骤1: 添加循环依赖检测方法**

```typescript
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
    if (currentId === taskId) return true; // 找到循环
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
    if (dfs(depId)) {
      return { hasCircle: true, path: [...path] };
    }
  }
  return { hasCircle: false };
}
```

**步骤2: 在 create 方法中调用检测**

在 `create` 方法的 `const task = await this.prisma.task.create` 之前添加：

```typescript
if (dto.dependsOn?.length) {
  const circleCheck = await this.detectCircularDependency('', dto.dependsOn, teamId);
  if (circleCheck.hasCircle) {
    throw new BadRequestException(`检测到循环依赖：${circleCheck.path?.join(' → ')}`);
  }
}
```

**步骤3: 在 update 方法中调用检测**

在依赖状态验证之后添加：

```typescript
if (dto.dependsOn) {
  const circleCheck = await this.detectCircularDependency(id, dto.dependsOn, oldTask.teamId);
  if (circleCheck.hasCircle) {
    throw new BadRequestException(`检测到循环依赖：${circleCheck.path?.join(' → ')}`);
  }
}
```

**步骤4: 提交**

```bash
git add backend/src/tasks/tasks.service.ts
git commit -m "feat(tasks): add circular dependency detection"
```

---

### 任务 5: TasksService 审计日志集成

**文件：**
- 修改: `backend/src/tasks/tasks.service.ts`
- 修改: `backend/src/tasks/tasks.module.ts`

**步骤1: 在 TasksService 中注入 AuditService**

```typescript
import { AuditService } from '../audit/audit.service';

constructor(
  private prisma: PrismaService, 
  private notifications: NotificationsService,
  private audit: AuditService
) { }
```

**步骤2: 在 create 方法末尾添加审计**

在 `return this.format(task);` 之前添加：

```typescript
await this.audit.log({
  action: 'CREATE',
  entityType: 'TASK',
  entityId: task.id,
  userId: operatorId,
  teamId,
  newValue: { title: task.title, status: task.status, priority: task.priority }
});
```

**步骤3: 在 update 方法末尾添加审计**

在 `return this.format(task);` 之前添加：

```typescript
await this.audit.log({
  action: 'UPDATE',
  entityType: 'TASK',
  entityId: id,
  userId: operatorId,
  teamId: oldTask.teamId,
  oldValue: { title: oldTask.title, status: oldTask.status, priority: oldTask.priority, assigneeId: oldTask.assigneeId },
  newValue: { title: task.title, status: task.status, priority: task.priority, assigneeId: task.assigneeId }
});
```

**步骤4: 在 remove 方法中添加审计**

修改 `remove` 方法：

```typescript
async remove(id: string, operatorId?: string) {
  const task = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true, title: true } });
  await this.prisma.task.delete({ where: { id } });
  if (operatorId && task) {
    await this.audit.log({
      action: 'DELETE',
      entityType: 'TASK',
      entityId: id,
      userId: operatorId,
      teamId: task.teamId,
      oldValue: { title: task.title }
    });
  }
  return { success: true };
}
```

**步骤5: 在 archive/restore 方法中添加审计**

```typescript
async archive(id: string, operatorId?: string) {
  const task = await this.prisma.task.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() }, include: { subtasks: true } });
  if (operatorId) {
    await this.audit.log({ action: 'ARCHIVE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: task.teamId });
  }
  return this.format(task);
}

async restore(id: string, operatorId?: string) {
  const task = await this.prisma.task.update({ where: { id }, data: { isArchived: false, archivedAt: null }, include: { subtasks: true } });
  if (operatorId) {
    await this.audit.log({ action: 'RESTORE', entityType: 'TASK', entityId: id, userId: operatorId, teamId: task.teamId });
  }
  return this.format(task);
}
```

**步骤6: 更新 TasksModule 导入 AuditModule**

```typescript
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  // ...
})
```

**步骤7: 更新 Controller 传递 operatorId**

在 `tasks.controller.ts` 中修改相关方法调用，传递 `req.user.sub`：

```typescript
@Patch(':id/archive')
async archive(@Param('id') id: string, @Request() req) {
  await this.verifyTaskAccess(id, req.user.sub);
  return this.tasks.archive(id, req.user.sub);
}

@Patch(':id/restore')
async restore(@Param('id') id: string, @Request() req) {
  await this.verifyTaskAccess(id, req.user.sub);
  return this.tasks.restore(id, req.user.sub);
}

@Delete(':id')
async remove(@Param('id') id: string, @Request() req) {
  await this.verifyTaskAccess(id, req.user.sub);
  return this.tasks.remove(id, req.user.sub);
}
```

**步骤8: 提交**

```bash
git add backend/src/tasks/tasks.service.ts backend/src/tasks/tasks.module.ts backend/src/tasks/tasks.controller.ts
git commit -m "feat(tasks): integrate audit logging for all CRUD operations"
```

---

### 任务 6: 批量操作事务化

**文件：**
- 修改: `backend/src/tasks/tasks.controller.ts`

**步骤1: 重构 batchMove 使用事务**

```typescript
@Post('batch/move')
async batchMove(@Body() body: { ids: string[]; status: string }, @Request() req) {
  const userId = req.user.sub;
  return this.prisma.$transaction(async (tx) => {
    const results = { success: 0, failed: 0, errors: [] as string[] };
    for (const id of body.ids) {
      try {
        const task = await tx.task.findUnique({ where: { id }, select: { teamId: true, dependsOn: true } });
        if (!task) { results.failed++; results.errors.push(`${id}: 任务不存在`); continue; }
        const member = await tx.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
        if (!member) { results.failed++; results.errors.push(`${id}: 无权限`); continue; }
        // 依赖检查
        if (['IN_PROGRESS', 'REVIEW', 'DONE'].includes(body.status) && task.dependsOn?.length) {
          const incomplete = await tx.task.count({ where: { id: { in: task.dependsOn }, status: { not: 'DONE' } } });
          if (incomplete > 0) { results.failed++; results.errors.push(`${id}: 前置任务未完成`); continue; }
        }
        await tx.task.update({ where: { id }, data: { status: body.status } });
        results.success++;
      } catch { results.failed++; }
    }
    return results;
  });
}
```

**步骤2: 重构 batchDelete 使用事务**

```typescript
@Post('batch/delete')
async batchDelete(@Body() body: { ids: string[] }, @Request() req) {
  const userId = req.user.sub;
  return this.prisma.$transaction(async (tx) => {
    const results = { success: 0, failed: 0 };
    for (const id of body.ids) {
      try {
        const task = await tx.task.findUnique({ where: { id }, select: { teamId: true } });
        if (!task) { results.failed++; continue; }
        const member = await tx.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
        if (!member) { results.failed++; continue; }
        await tx.task.delete({ where: { id } });
        results.success++;
      } catch { results.failed++; }
    }
    return results;
  });
}
```

**步骤3: 重构 batchArchive 和 batchAssign**

```typescript
@Post('batch/archive')
async batchArchive(@Body() body: { ids: string[] }, @Request() req) {
  const userId = req.user.sub;
  return this.prisma.$transaction(async (tx) => {
    const results = { success: 0, failed: 0 };
    for (const id of body.ids) {
      try {
        const task = await tx.task.findUnique({ where: { id }, select: { teamId: true } });
        if (!task) { results.failed++; continue; }
        const member = await tx.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
        if (!member) { results.failed++; continue; }
        await tx.task.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() } });
        results.success++;
      } catch { results.failed++; }
    }
    return results;
  });
}

@Post('batch/assign')
async batchAssign(@Body() body: { ids: string[]; assigneeId: string }, @Request() req) {
  const userId = req.user.sub;
  return this.prisma.$transaction(async (tx) => {
    const results = { success: 0, failed: 0 };
    for (const id of body.ids) {
      try {
        const task = await tx.task.findUnique({ where: { id }, select: { teamId: true } });
        if (!task) { results.failed++; continue; }
        const member = await tx.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
        if (!member) { results.failed++; continue; }
        await tx.task.update({ where: { id }, data: { assigneeId: body.assigneeId } });
        results.success++;
      } catch { results.failed++; }
    }
    return results;
  });
}
```

**步骤4: 提交**

```bash
git add backend/src/tasks/tasks.controller.ts
git commit -m "refactor(tasks): use transactions for batch operations"
```

---

### 任务 7: 删除时清理悬空引用

**文件：**
- 修改: `backend/src/tasks/tasks.service.ts`

**步骤1: 添加清理悬空依赖方法**

```typescript
private async cleanupDanglingDependencies(deletedTaskId: string, teamId: string): Promise<void> {
  const tasksWithDep = await this.prisma.task.findMany({
    where: { teamId, dependsOn: { has: deletedTaskId } },
    select: { id: true, dependsOn: true }
  });
  
  if (tasksWithDep.length > 0) {
    await Promise.all(tasksWithDep.map(task => 
      this.prisma.task.update({
        where: { id: task.id },
        data: { dependsOn: task.dependsOn.filter(id => id !== deletedTaskId) }
      })
    ));
  }
}
```

**步骤2: 在 remove 方法中调用清理**

```typescript
async remove(id: string, operatorId?: string) {
  const task = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true, title: true } });
  if (!task) throw new NotFoundException('任务不存在');
  
  await this.cleanupDanglingDependencies(id, task.teamId); // 先清理依赖
  await this.prisma.task.delete({ where: { id } });
  
  if (operatorId) {
    await this.audit.log({
      action: 'DELETE',
      entityType: 'TASK',
      entityId: id,
      userId: operatorId,
      teamId: task.teamId,
      oldValue: { title: task.title }
    });
  }
  return { success: true };
}
```

**步骤3: 在 archive 方法中也清理（归档的任务不应被依赖）**

```typescript
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
```

**步骤4: 提交**

```bash
git add backend/src/tasks/tasks.service.ts
git commit -m "fix(tasks): cleanup dangling dependencies on delete/archive"
```

---

### 任务 8: 任务列表分页支持

**文件：**
- 修改: `backend/src/tasks/tasks.service.ts`
- 修改: `backend/src/tasks/tasks.controller.ts`
- 修改: `frontend/src/stores/taskStore.ts`
- 修改: `frontend/src/services/api.ts`

**步骤1: 修改 Service findAll 方法**

```typescript
async findAll(teamId: string, options?: { includeArchived?: boolean; page?: number; limit?: number; projectId?: string }) {
  const { includeArchived = false, page = 1, limit = 100, projectId } = options || {};
  const where = { 
    teamId, 
    isArchived: includeArchived ? undefined : false,
    ...(projectId && { projectId })
  };
  
  const [tasks, total] = await Promise.all([
    this.prisma.task.findMany({ 
      where, 
      include: { subtasks: true, labels: { include: { label: true } } }, 
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    this.prisma.task.count({ where })
  ]);
  
  return {
    data: tasks.map(t => ({ ...this.format(t), labels: t.labels?.map(tl => tl.label) })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}
```

**步骤2: 修改 Controller findAll 方法**

```typescript
@Get()
async findAll(
  @Request() req, 
  @Query('teamId') teamId?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Query('projectId') projectId?: string
) { 
  return this.tasks.findAll(await this.getTeamId(req, teamId), {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 100,
    projectId
  }); 
}
```

**步骤3: 修改前端 API 接口**

在 `frontend/src/services/api.ts` 中：

```typescript
export const taskApi = {
  getAll: (params?: { page?: number; limit?: number; projectId?: string }) => 
    api.get<{ data: Task[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>('/tasks', { params }),
  // ... 其他方法保持不变
};
```

**步骤4: 修改前端 Store**

```typescript
interface TaskStore {
  tasks: Task[];
  pagination: { page: number; limit: number; total: number; totalPages: number } | null;
  // ...
}

fetchTasks: async (page = 1, limit = 100) => {
  set({ isLoading: true });
  try {
    const { data } = await taskApi.getAll({ page, limit });
    set({ tasks: data.data, pagination: data.pagination, isLoading: false });
  } catch {
    set({ isLoading: false });
  }
},
```

**步骤5: 提交**

```bash
git add backend/src/tasks/tasks.service.ts backend/src/tasks/tasks.controller.ts frontend/src/stores/taskStore.ts frontend/src/services/api.ts
git commit -m "feat(tasks): add pagination support for task list"
```

---

### 任务 9: 前端乐观更新回滚

**文件：**
- 修改: `frontend/src/stores/taskStore.ts`

**步骤1: 添加错误处理和回滚机制**

```typescript
updateTask: async (id, data) => {
  const previousTasks = get().tasks; // 保存旧状态
  const task = previousTasks.find(t => t.id === id);
  if (!task) return;
  
  // 乐观更新
  set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)) }));
  
  try {
    const { data: updated } = await taskApi.update(id, data);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    emitTaskUpdate(updated);
  } catch (error) {
    // 回滚到之前状态
    set({ tasks: previousTasks });
    throw error; // 重新抛出让调用方处理
  }
},

deleteTask: async (id) => {
  const previousTasks = get().tasks;
  
  // 乐观删除
  set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  
  try {
    await taskApi.delete(id);
    emitTaskDelete(id);
  } catch (error) {
    // 回滚
    set({ tasks: previousTasks });
    throw error;
  }
},

moveTask: async (id, status) => {
  const previousTasks = get().tasks;
  const task = previousTasks.find((t) => t.id === id);
  if (!task) return { success: false, error: '任务不存在' };
  
  // 前端依赖检查
  const restricted = [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];
  if (restricted.includes(status) && task.dependsOn?.length) {
    const incomplete = get().tasks.filter((t) => task.dependsOn.includes(t.id) && t.status !== TaskStatus.DONE);
    if (incomplete.length) return { success: false, error: `依赖的前置任务未完成：${incomplete.map((t) => t.title).join('、')}` };
  }
  
  // 乐观更新
  set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
  
  try {
    const { data: updated } = await taskApi.update(id, { status });
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    emitTaskUpdate(updated);
    return { success: true, error: '' };
  } catch (error: any) {
    // 回滚
    set({ tasks: previousTasks });
    return { success: false, error: error.response?.data?.message || '操作失败' };
  }
},

archiveTask: async (id) => {
  const previousTasks = get().tasks;
  const previousArchived = get().archivedTasks;
  const task = previousTasks.find(t => t.id === id);
  if (!task) return;
  
  // 乐观更新
  set((s) => ({ 
    tasks: s.tasks.filter((t) => t.id !== id), 
    archivedTasks: [{ ...task, isArchived: true, archivedAt: new Date().toISOString() }, ...s.archivedTasks] 
  }));
  
  try {
    const { data: archived } = await taskApi.archive(id);
    set((s) => ({ archivedTasks: s.archivedTasks.map(t => t.id === id ? archived : t) }));
  } catch (error) {
    // 回滚
    set({ tasks: previousTasks, archivedTasks: previousArchived });
    throw error;
  }
},

restoreTask: async (id) => {
  const previousTasks = get().tasks;
  const previousArchived = get().archivedTasks;
  const task = previousArchived.find(t => t.id === id);
  if (!task) return;
  
  // 乐观更新
  set((s) => ({ 
    archivedTasks: s.archivedTasks.filter((t) => t.id !== id), 
    tasks: [{ ...task, isArchived: false, archivedAt: null }, ...s.tasks] 
  }));
  
  try {
    const { data: restored } = await taskApi.restore(id);
    set((s) => ({ tasks: s.tasks.map(t => t.id === id ? restored : t) }));
  } catch (error) {
    // 回滚
    set({ tasks: previousTasks, archivedTasks: previousArchived });
    throw error;
  }
},
```

**步骤2: 提交**

```bash
git add frontend/src/stores/taskStore.ts
git commit -m "feat(store): add optimistic update with rollback mechanism"
```

---

## 验证清单

完成所有任务后，执行以下验证：

1. **构建检查**
   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```

2. **手动测试场景**
   - [ ] WebSocket: 非团队成员无法加入团队房间
   - [ ] DTO: 传入无效 status/priority 返回 400 错误
   - [ ] 依赖: 前置任务未完成时无法移动到 IN_PROGRESS
   - [ ] 循环依赖: A→B→A 的依赖被拒绝
   - [ ] 审计: 任务 CRUD 操作被记录到 AuditLog
   - [ ] 批量: 批量删除部分失败时正确回滚
   - [ ] 悬空引用: 删除任务后其他任务的 dependsOn 被清理
   - [ ] 分页: 任务列表返回 pagination 信息
   - [ ] 乐观更新: 更新失败后 UI 回滚到原状态

---

## 最终提交

```bash
git add -A
git commit -m "refactor(tasks): complete task system refactoring

- fix: WebSocket team membership verification
- fix: DTO enum validation for status/priority
- feat: backend dependency status validation
- feat: circular dependency detection
- feat: audit logging integration
- refactor: batch operations with transactions
- fix: cleanup dangling dependencies on delete/archive
- feat: pagination support
- feat: optimistic update with rollback"
```
