import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';

// 纯单元测试：PrismaService / NotificationsService / AuditService / TasksGateway 全部 mock
describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    task: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock; create: jest.Mock };
    teamMember: { findUnique: jest.Mock; count: jest.Mock };
    label: { count: jest.Mock };
    project: { findUnique: jest.Mock };
    projectMember: { findUnique: jest.Mock };
    milestone: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    task: { update: jest.Mock };
    subtask: { deleteMany: jest.Mock; createMany: jest.Mock; update: jest.Mock };
    taskLabel: { deleteMany: jest.Mock; createMany: jest.Mock };
  };
  let notifications: { notifyTaskAssigned: jest.Mock; notifyTaskStatusChanged: jest.Mock; notifySubtaskCompleted: jest.Mock };
  let audit: { log: jest.Mock };
  let gateway: { emitTaskCreated: jest.Mock; emitTaskUpdated: jest.Mock; emitTaskDeleted: jest.Mock };

  const baseTask = {
    id: 't1', title: '任务一', status: 'TODO', priority: 'MEDIUM',
    assigneeId: 'op', teamId: 'team1', projectId: null,
    subtasks: [], dependsOn: [] as string[], labels: [],
    createdAt: new Date('2025-01-01T00:00:00Z'), dueDate: null, archivedAt: null, completedAt: null,
  };

  const updatedTask = (over: Record<string, unknown>) => ({
    ...baseTask, ...over, labels: [], subtasks: [],
  });

  beforeEach(() => {
    tx = {
      task: { update: jest.fn().mockImplementation(({ data }) => Promise.resolve(updatedTask(data))) },
      subtask: { deleteMany: jest.fn(), createMany: jest.fn(), update: jest.fn() },
      taskLabel: { deleteMany: jest.fn(), createMany: jest.fn() },
    };
    prisma = {
      task: {
        findUnique: jest.fn().mockResolvedValue(baseTask),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(updatedTask({ id: 'new-task' })),
      },
      teamMember: { findUnique: jest.fn().mockResolvedValue({ role: 'owner' }), count: jest.fn().mockResolvedValue(0) },
      label: { count: jest.fn().mockResolvedValue(0) },
      project: { findUnique: jest.fn() },
      projectMember: { findUnique: jest.fn() },
      milestone: { findUnique: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'op', name: '操作者' }) },
      $transaction: jest.fn(async (cb: (txArg: typeof tx) => Promise<unknown>) => cb(tx)),
    };
    notifications = { notifyTaskAssigned: jest.fn(), notifyTaskStatusChanged: jest.fn(), notifySubtaskCompleted: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    gateway = { emitTaskCreated: jest.fn(), emitTaskUpdated: jest.fn(), emitTaskDeleted: jest.fn() };
    service = new TasksService(prisma as never, notifications as never, audit as never, gateway as never);
  });

  describe('validateAssigneePermission（经 create/update 路径）', () => {
    it('操作者非团队成员 → 403，不允许把任务指派给他人', async () => {
      prisma.teamMember.findUnique.mockResolvedValue(null);
      await expect(service.create({ title: 'x', assigneeId: 'other-user' }, 'team1', 'op'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('普通成员指派他人 → 403', async () => {
      prisma.teamMember.findUnique.mockResolvedValue({ role: 'member' });
      await expect(service.create({ title: 'x', assigneeId: 'other-user' }, 'team1', 'op'))
        .rejects.toThrow(ForbiddenException);
    });

    it('普通成员指派自己 / owner 指派他人 → 放行', async () => {
      prisma.teamMember.findUnique.mockResolvedValue({ role: 'member' });
      await expect(service.create({ title: 'x', assigneeId: 'op' }, 'team1', 'op')).resolves.toBeDefined();

      prisma.teamMember.findUnique.mockResolvedValue({ role: 'owner' });
      await expect(service.create({ title: 'x', assigneeId: 'other-user' }, 'team1', 'op')).resolves.toBeDefined();
    });
  });

  describe('validateDependencies（update 状态流转时）', () => {
    const taskWithDep = { ...baseTask, dependsOn: ['dep1'] };
    beforeEach(() => { prisma.task.findUnique.mockResolvedValue(taskWithDep); });

    it('前置任务未完成 → 400 且消息包含未完成任务标题', async () => {
      prisma.task.findMany.mockResolvedValue([{ id: 'dep1', title: '写设计文档' }]);
      await expect(service.update('t1', { status: 'IN_PROGRESS' }, 'op'))
        .rejects.toThrow(BadRequestException);
      await service.update('t1', { status: 'DONE' }, 'op').catch((e) => {
        expect(e.message).toContain('写设计文档');
      });
      expect(prisma.$transaction).not.toHaveBeenCalled(); // 事务未开启即被拒绝
    });

    it('前置任务全部 DONE → 放行', async () => {
      prisma.task.findMany.mockResolvedValue([]); // 没有未完成的依赖
      const result = await service.update('t1', { status: 'IN_PROGRESS' }, 'op');
      expect(result.status).toBe('IN_PROGRESS');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('无依赖任务状态流转 → 不查依赖直接放行', async () => {
      prisma.task.findUnique.mockResolvedValue(baseTask); // dependsOn: []
      await service.update('t1', { status: 'DONE' }, 'op');
      // findMany 仅被其他校验使用时调用；依赖校验应提前 return
      expect(prisma.task.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: { not: 'DONE' } }) }),
      );
    });
  });

  describe('环检测 detectCircularDependency', () => {
    it('A→B→C 链上给 C 加依赖 A → 400 循环依赖', async () => {
      const taskC = { ...baseTask, id: 'C', title: '任务C', dependsOn: [] };
      prisma.task.findUnique.mockResolvedValue(taskC);
      prisma.task.count.mockResolvedValue(1); // validateDependsOn：A 属于本团队
      prisma.task.findMany.mockResolvedValue([
        { id: 'A', dependsOn: ['B'], title: '任务A' },
        { id: 'B', dependsOn: ['C'], title: '任务B' },
        { id: 'C', dependsOn: [], title: '任务C' },
      ]);
      await expect(service.update('C', { dependsOn: ['A'] }, 'op'))
        .rejects.toThrow(/检测到循环依赖/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('无环依赖 → 放行', async () => {
      const taskC = { ...baseTask, id: 'C', title: '任务C', dependsOn: [] };
      prisma.task.findUnique.mockResolvedValue(taskC);
      prisma.task.count.mockResolvedValue(1);
      prisma.task.findMany.mockResolvedValue([
        { id: 'A', dependsOn: [], title: '任务A' },
        { id: 'C', dependsOn: [], title: '任务C' },
      ]);
      await expect(service.update('C', { dependsOn: ['A'] }, 'op')).resolves.toBeDefined();
    });
  });

  describe('update 事务内 completedAt 维护', () => {
    it('status → DONE 时事务内 update data 含 completedAt（Date）', async () => {
      await service.update('t1', { status: 'DONE' }, 'op');
      const updateArgs = tx.task.update.mock.calls[0][0];
      expect(updateArgs.data.status).toBe('DONE');
      expect(updateArgs.data.completedAt).toBeInstanceOf(Date);
    });

    it('从 DONE 移出 → data 含 completedAt: null', async () => {
      prisma.task.findUnique.mockResolvedValue({ ...baseTask, status: 'DONE', completedAt: new Date() });
      await service.update('t1', { status: 'TODO' }, 'op');
      const updateArgs = tx.task.update.mock.calls[0][0];
      expect(updateArgs.data.completedAt).toBeNull();
    });

    it('状态未变化 → 不写 completedAt', async () => {
      prisma.task.findUnique.mockResolvedValue({ ...baseTask, status: 'TODO' });
      await service.update('t1', { title: '改名' }, 'op');
      const updateArgs = tx.task.update.mock.calls[0][0];
      expect(updateArgs.data).not.toHaveProperty('completedAt');
    });

    it('通知/审计/广播在事务提交后执行', async () => {
      await service.update('t1', { status: 'DONE' }, 'op');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE', entityId: 't1', teamId: 'team1' }));
      expect(gateway.emitTaskUpdated).toHaveBeenCalledWith('team1', expect.objectContaining({ id: 't1' }));
    });
  });

  describe('跨团队校验（P5b：validateLabelIds / validateDependsOn）', () => {
    it('create：labelIds 含其他团队标签 → 400', async () => {
      prisma.label.count.mockResolvedValue(1); // 传了 2 个标签，只有 1 个属于本团队
      await expect(service.create({ title: 'x', labelIds: ['l1', 'l2'] }, 'team1', 'op'))
        .rejects.toThrow('包含不存在或不属于本团队的标签');
      expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it('update：labelIds 含其他团队标签 → 400', async () => {
      prisma.label.count.mockResolvedValue(0);
      await expect(service.update('t1', { labelIds: ['foreign-label'] }, 'op'))
        .rejects.toThrow('包含不存在或不属于本团队的标签');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('update：dependsOn 含其他团队任务 → 400', async () => {
      prisma.task.count.mockResolvedValue(0); // 依赖任务不属于本团队
      await expect(service.update('t1', { dependsOn: ['foreign-task'] }, 'op'))
        .rejects.toThrow('包含不存在或不属于本团队的依赖任务');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('labelIds/dependsOn 全部属于本团队 → 放行', async () => {
      prisma.label.count.mockResolvedValue(1);
      prisma.task.count.mockResolvedValue(1);
      prisma.task.findMany.mockResolvedValue([
        { id: 't1', dependsOn: [], title: '任务一' },
        { id: 'dep-ok', dependsOn: [], title: '依赖任务' },
      ]);
      await expect(service.update('t1', { labelIds: ['l1'], dependsOn: ['dep-ok'] }, 'op')).resolves.toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('任务不存在 → NotFoundException', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
