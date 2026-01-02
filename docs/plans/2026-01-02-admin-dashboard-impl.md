# 管理后台完善 实施计划

**目标：** 实现完整企业级管理后台，新增团队/项目/任务/审计/设置管理功能

**架构：** 后端扩展AdminService新增11个API，前端扩展adminStore和AdminPage组件，使用现有UI组件库

**技术栈：** NestJS + Prisma + React + Zustand + TailwindCSS

---

## 批次1：数据库变更

### 任务1.1: 新增SystemSetting表

**文件：**
- 修改: `backend/prisma/schema.prisma`

**步骤1: 添加SystemSetting模型**

```prisma
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

**步骤2: 执行迁移**

```bash
cd backend && npx prisma migrate dev --name add_system_setting
```

**步骤3: 提交**

```bash
git add backend/prisma/
git commit -m "feat(db): add SystemSetting table"
```

---

## 批次2：后端API扩展

### 任务2.1: 扩展AdminService - 趋势统计

**文件：**
- 修改: `backend/src/admin/admin.service.ts`

**新增方法：**

```typescript
async getTrends(days = 7) {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  const [newUsers, completedTasks, activeUsers] = await Promise.all([
    this.prisma.user.groupBy({ by: ['createdAt'], _count: true, where: { createdAt: { gte: new Date(dates[0]) } } }),
    this.prisma.task.groupBy({ by: ['updatedAt'], _count: true, where: { status: 'DONE', updatedAt: { gte: new Date(dates[0]) } } }),
    this.prisma.loginLog.groupBy({ by: ['createdAt'], _count: { userId: true }, where: { createdAt: { gte: new Date(dates[0]) }, success: true } }),
  ]);
  
  // 按日期聚合数据
  return { dates, newUsers: this.aggregateByDate(newUsers, dates), completedTasks: this.aggregateByDate(completedTasks, dates), activeUsers: this.aggregateByDate(activeUsers, dates) };
}

async getHealthIndicators() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const [overdueTasks, inactiveUsers, unassignedTasks, storageStats] = await Promise.all([
    this.prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { not: 'DONE' }, isArchived: false } }),
    this.prisma.user.count({ where: { isActive: true, lastLoginAt: { lt: sevenDaysAgo } } }),
    this.prisma.task.count({ where: { assigneeId: null, isArchived: false } }),
    this.prisma.attachment.aggregate({ _sum: { size: true }, _count: true }),
  ]);
  
  return { overdueTasks, inactiveUsers, unassignedTasks, storageSize: storageStats._sum.size || 0, fileCount: storageStats._count };
}
```

### 任务2.2: 扩展AdminService - 团队管理

**新增方法：**

```typescript
async getTeams(query: { page?: number; limit?: number; search?: string; sort?: string }) {
  const { page = 1, limit = 20, search, sort = 'createdAt' } = query;
  const where = search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search, mode: 'insensitive' } }] } : {};
  
  const [teams, total] = await Promise.all([
    this.prisma.team.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { [sort]: 'desc' },
      include: {
        owner: { select: { id: true, name: true, avatar: true, color: true } },
        _count: { select: { members: true, projects: true, tasks: true } }
      }
    }),
    this.prisma.team.count({ where }),
  ]);
  
  return { teams, total, page, limit };
}

async getTeamDetail(id: string) {
  const team = await this.prisma.team.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatar: true, color: true } },
      members: { include: { user: { select: { id: true, name: true, avatar: true, color: true, email: true } } } },
      projects: { select: { id: true, name: true, status: true, color: true } },
      _count: { select: { tasks: true } }
    }
  });
  if (!team) throw new NotFoundException('团队不存在');
  return team;
}

async transferTeamOwnership(teamId: string, newOwnerId: string, adminId: string) {
  const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: { members: true } });
  if (!team) throw new NotFoundException('团队不存在');
  
  const isMember = team.members.some(m => m.userId === newOwnerId);
  if (!isMember) throw new ForbiddenException('新所有者必须是团队成员');
  
  return this.prisma.team.update({ where: { id: teamId }, data: { ownerId: newOwnerId } });
}

async dissolveTeam(teamId: string, adminId: string) {
  const team = await this.prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundException('团队不存在');
  
  await this.prisma.team.delete({ where: { id: teamId } });
  return { success: true };
}
```

### 任务2.3: 扩展AdminService - 项目管理

**新增方法：**

```typescript
async getProjects(query: { page?: number; limit?: number; status?: string; teamId?: string; search?: string }) {
  const { page = 1, limit = 20, status, teamId, search } = query;
  const where: any = {};
  if (status === 'archived') where.isArchived = true;
  else if (status) { where.status = status; where.isArchived = false; }
  else where.isArchived = false;
  if (teamId) where.teamId = teamId;
  if (search) where.name = { contains: search, mode: 'insensitive' };
  
  const [projects, total] = await Promise.all([
    this.prisma.project.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        team: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, avatar: true, color: true } },
        _count: { select: { tasks: true, milestones: true } }
      }
    }),
    this.prisma.project.count({ where }),
  ]);
  
  return { projects, total, page, limit };
}

async getProjectDetail(id: string) {
  const project = await this.prisma.project.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, avatar: true, color: true } },
      milestones: { orderBy: { dueDate: 'asc' } },
      _count: { select: { tasks: true } }
    }
  });
  if (!project) throw new NotFoundException('项目不存在');
  
  const taskStats = await this.prisma.task.groupBy({ by: ['status'], where: { projectId: id }, _count: true });
  return { ...project, taskStats };
}

async archiveProject(id: string) {
  return this.prisma.project.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() } });
}

async restoreProject(id: string) {
  return this.prisma.project.update({ where: { id }, data: { isArchived: false, archivedAt: null } });
}
```

### 任务2.4: 扩展AdminService - 任务监控

**新增方法：**

```typescript
async getOverdueTasks(page = 1, limit = 20) {
  const where = { dueDate: { lt: new Date() }, status: { not: 'DONE' }, isArchived: false };
  
  const [tasks, total] = await Promise.all([
    this.prisma.task.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { dueDate: 'asc' },
      include: {
        team: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatar: true, color: true } }
      }
    }),
    this.prisma.task.count({ where }),
  ]);
  
  return { tasks, total, page, limit };
}

async getTaskStats() {
  const [statusDist, unassigned] = await Promise.all([
    this.prisma.task.groupBy({ by: ['status'], where: { isArchived: false }, _count: true }),
    this.prisma.task.count({ where: { assigneeId: null, isArchived: false } }),
  ]);
  
  return { statusDistribution: statusDist.map(s => ({ status: s.status, count: s._count })), unassignedCount: unassigned };
}

async batchArchiveTasks(taskIds: string[]) {
  const result = await this.prisma.task.updateMany({ where: { id: { in: taskIds } }, data: { isArchived: true, archivedAt: new Date() } });
  return { success: result.count, failed: taskIds.length - result.count };
}
```

### 任务2.5: 扩展AdminService - 审计日志

**新增方法：**

```typescript
async getAuditLogs(query: { page?: number; limit?: number; startDate?: string; endDate?: string; action?: string; entityType?: string; userId?: string }) {
  const { page = 1, limit = 50, startDate, endDate, action, entityType, userId } = query;
  const where: any = {};
  if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;
  
  const [logs, total] = await Promise.all([
    this.prisma.auditLog.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } }
    }),
    this.prisma.auditLog.count({ where }),
  ]);
  
  return { logs, total, page, limit };
}
```

### 任务2.6: 扩展AdminService - 系统设置

**新增方法：**

```typescript
async getSettings() {
  const settings = await this.prisma.systemSetting.findMany();
  return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
}

async updateSetting(key: string, value: string) {
  return this.prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

async getStorageStats() {
  const stats = await this.prisma.attachment.aggregate({ _sum: { size: true }, _count: true });
  return { totalSize: stats._sum.size || 0, fileCount: stats._count };
}
```

### 任务2.7: 扩展AdminController

**文件：**
- 修改: `backend/src/admin/admin.controller.ts`

**新增路由：**

```typescript
@Get('stats/trends')
getTrends(@Query('days') days?: string) { return this.adminService.getTrends(Number(days) || 7); }

@Get('stats/health')
getHealthIndicators() { return this.adminService.getHealthIndicators(); }

@Get('teams')
getTeams(@Query() query: { page?: string; limit?: string; search?: string; sort?: string }) {
  return this.adminService.getTeams({ page: Number(query.page) || 1, limit: Number(query.limit) || 20, search: query.search, sort: query.sort });
}

@Get('teams/:id')
getTeamDetail(@Param('id') id: string) { return this.adminService.getTeamDetail(id); }

@Post('teams/:id/transfer-ownership')
transferOwnership(@Param('id') id: string, @Body() body: { newOwnerId: string }, @Request() req: AuthenticatedRequest) {
  return this.adminService.transferTeamOwnership(id, body.newOwnerId, req.user.id);
}

@Delete('teams/:id')
dissolveTeam(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
  return this.adminService.dissolveTeam(id, req.user.id);
}

@Get('projects')
getProjects(@Query() query: { page?: string; limit?: string; status?: string; teamId?: string; search?: string }) {
  return this.adminService.getProjects({ page: Number(query.page) || 1, limit: Number(query.limit) || 20, status: query.status, teamId: query.teamId, search: query.search });
}

@Get('projects/:id')
getProjectDetail(@Param('id') id: string) { return this.adminService.getProjectDetail(id); }

@Post('projects/:id/archive')
archiveProject(@Param('id') id: string) { return this.adminService.archiveProject(id); }

@Post('projects/:id/restore')
restoreProject(@Param('id') id: string) { return this.adminService.restoreProject(id); }

@Get('tasks/overdue')
getOverdueTasks(@Query() query: { page?: string; limit?: string }) {
  return this.adminService.getOverdueTasks(Number(query.page) || 1, Number(query.limit) || 20);
}

@Get('tasks/stats')
getTaskStats() { return this.adminService.getTaskStats(); }

@Post('tasks/batch-archive')
batchArchiveTasks(@Body() body: { taskIds: string[] }) { return this.adminService.batchArchiveTasks(body.taskIds); }

@Get('audit-logs')
getAuditLogs(@Query() query: { page?: string; limit?: string; startDate?: string; endDate?: string; action?: string; entityType?: string; userId?: string }) {
  return this.adminService.getAuditLogs({ page: Number(query.page) || 1, limit: Number(query.limit) || 50, ...query });
}

@Get('settings')
getSettings() { return this.adminService.getSettings(); }

@Post('settings')
updateSetting(@Body() body: { key: string; value: string }) { return this.adminService.updateSetting(body.key, body.value); }

@Get('storage/stats')
getStorageStats() { return this.adminService.getStorageStats(); }
```

**提交：**
```bash
git add backend/src/admin/
git commit -m "feat(admin): add teams/projects/tasks/audit/settings APIs"
```

---

## 批次3：前端API和Store扩展

### 任务3.1: 扩展adminApi

**文件：**
- 修改: `frontend/src/services/api.ts`

**新增API方法：**

```typescript
// adminApi 扩展
getTrends: (days?: number) => api.get('/admin/stats/trends', { params: { days } }),
getHealthIndicators: () => api.get('/admin/stats/health'),
// 团队管理
getTeams: (query?: { page?: number; search?: string; sort?: string }) => api.get('/admin/teams', { params: query }),
getTeamDetail: (id: string) => api.get(`/admin/teams/${id}`),
transferOwnership: (id: string, newOwnerId: string) => api.post(`/admin/teams/${id}/transfer-ownership`, { newOwnerId }),
dissolveTeam: (id: string) => api.delete(`/admin/teams/${id}`),
// 项目管理
getProjects: (query?: { page?: number; status?: string; teamId?: string; search?: string }) => api.get('/admin/projects', { params: query }),
getProjectDetail: (id: string) => api.get(`/admin/projects/${id}`),
archiveProject: (id: string) => api.post(`/admin/projects/${id}/archive`),
restoreProject: (id: string) => api.post(`/admin/projects/${id}/restore`),
// 任务监控
getOverdueTasks: (page?: number) => api.get('/admin/tasks/overdue', { params: { page } }),
getTaskStats: () => api.get('/admin/tasks/stats'),
batchArchiveTasks: (taskIds: string[]) => api.post('/admin/tasks/batch-archive', { taskIds }),
// 审计日志
getAuditLogs: (query?: { page?: number; startDate?: string; endDate?: string; action?: string; entityType?: string; userId?: string }) => api.get('/admin/audit-logs', { params: query }),
// 系统设置
getSettings: () => api.get('/admin/settings'),
updateSetting: (key: string, value: string) => api.post('/admin/settings', { key, value }),
getStorageStats: () => api.get('/admin/storage/stats'),
```

### 任务3.2: 扩展adminStore

**文件：**
- 修改: `frontend/src/stores/adminStore.ts`

**新增状态和方法：**

```typescript
// 新增接口定义
interface TrendData { dates: string[]; newUsers: number[]; completedTasks: number[]; activeUsers: number[] }
interface HealthIndicators { overdueTasks: number; inactiveUsers: number; unassignedTasks: number; storageSize: number; fileCount: number }
interface AdminTeam { id: string; name: string; code: string; createdAt: string; owner: { id: string; name: string; avatar: string; color: string }; _count: { members: number; projects: number; tasks: number } }
interface AdminProject { id: string; name: string; color: string; status: string; isArchived: boolean; createdAt: string; team: { id: string; name: string }; owner: { id: string; name: string; avatar: string; color: string }; _count: { tasks: number; milestones: number } }
interface OverdueTask { id: string; title: string; priority: string; status: string; dueDate: string; team: { id: string; name: string }; assignee: { id: string; name: string; avatar: string; color: string } | null }
interface TaskStats { statusDistribution: { status: string; count: number }[]; unassignedCount: number }
interface AdminAuditLog { id: string; action: string; entityType: string; entityId: string; oldValue: any; newValue: any; createdAt: string; user: { id: string; name: string; avatar: string; color: string } }

// 新增状态
trends: TrendData | null;
health: HealthIndicators | null;
teams: AdminTeam[];
teamsTotal: number;
projects: AdminProject[];
projectsTotal: number;
overdueTasks: OverdueTask[];
overdueTotal: number;
taskStats: TaskStats | null;
auditLogs: AdminAuditLog[];
auditTotal: number;
settings: Record<string, string>;
storageStats: { totalSize: number; fileCount: number } | null;

// 新增方法
fetchTrends: (days?: number) => Promise<void>;
fetchHealth: () => Promise<void>;
fetchTeams: (query?: { page?: number; search?: string; sort?: string }) => Promise<void>;
transferOwnership: (teamId: string, newOwnerId: string) => Promise<void>;
dissolveTeam: (teamId: string) => Promise<void>;
fetchProjects: (query?: { page?: number; status?: string; teamId?: string; search?: string }) => Promise<void>;
archiveProject: (id: string) => Promise<void>;
restoreProject: (id: string) => Promise<void>;
fetchOverdueTasks: (page?: number) => Promise<void>;
fetchTaskStats: () => Promise<void>;
batchArchiveTasks: (taskIds: string[]) => Promise<void>;
fetchAuditLogs: (query?: { page?: number; startDate?: string; endDate?: string; action?: string; entityType?: string; userId?: string }) => Promise<void>;
fetchSettings: () => Promise<void>;
updateSetting: (key: string, value: string) => Promise<void>;
fetchStorageStats: () => Promise<void>;
```

**提交：**
```bash
git add frontend/src/services/api.ts frontend/src/stores/adminStore.ts
git commit -m "feat(frontend): extend adminApi and adminStore"
```

---

## 批次4：前端组件 - 概览增强

### 任务4.1: 创建TrendChart组件

**文件：**
- 创建: `frontend/src/components/admin/TrendChart.tsx`

使用简单的SVG折线图，无需额外图表库。

### 任务4.2: 创建HealthIndicators组件

**文件：**
- 创建: `frontend/src/components/admin/HealthIndicators.tsx`

显示4个健康指标卡片。

---

## 批次5：前端组件 - 团队和项目管理

### 任务5.1: 创建AdminTeamList组件

**文件：**
- 创建: `frontend/src/components/admin/AdminTeamList.tsx`

团队列表表格，含搜索、详情弹窗、转让/解散操作。

### 任务5.2: 创建AdminProjectList组件

**文件：**
- 创建: `frontend/src/components/admin/AdminProjectList.tsx`

项目列表表格，含状态筛选、团队筛选、归档/恢复操作。

---

## 批次6：前端组件 - 任务、审计、设置

### 任务6.1: 创建AdminTaskMonitor组件

**文件：**
- 创建: `frontend/src/components/admin/AdminTaskMonitor.tsx`

逾期任务列表 + 任务统计饼图 + 批量归档。

### 任务6.2: 创建AdminAuditLog组件

**文件：**
- 创建: `frontend/src/components/admin/AdminAuditLog.tsx`

审计日志列表，含时间/类型/用户筛选，详情展开。

### 任务6.3: 创建AdminSettings组件

**文件：**
- 创建: `frontend/src/components/admin/AdminSettings.tsx`

系统设置面板：AI配置、存储配置、安全配置。

---

## 批次7：集成与测试

### 任务7.1: 重构AdminPage

**文件：**
- 修改: `frontend/src/pages/AdminPage.tsx`

集成所有新组件，8个Tab切换。

### 任务7.2: 构建验证

```bash
cd backend && npm run build
cd frontend && npm run build
```

### 任务7.3: 最终提交

```bash
git add .
git commit -m "feat(admin): complete admin dashboard enhancement"
```

---

## 执行检查清单

- [ ] 数据库迁移成功
- [ ] 后端11个新API可用
- [ ] 前端8个Tab正常切换
- [ ] 趋势图表正确渲染
- [ ] 团队管理CRUD正常
- [ ] 项目管理筛选/归档正常
- [ ] 逾期任务列表显示正确
- [ ] 审计日志筛选/详情正常
- [ ] 系统设置读写正常
- [ ] 前后端构建无错误
