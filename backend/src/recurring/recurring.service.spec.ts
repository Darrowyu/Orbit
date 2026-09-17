import { RecurringService } from './recurring.service';

// 纯单元测试：PrismaService / AuditService / TasksGateway 全部 mock
describe('RecurringService', () => {
  let service: RecurringService;
  let prisma: {
    recurringTask: { findMany: jest.Mock };
    label: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    recurringTask: { updateMany: jest.Mock };
    task: { create: jest.Mock };
    taskLabel: { createMany: jest.Mock };
  };
  let audit: { log: jest.Mock };
  let gateway: { emitTaskCreated: jest.Mock };

  // calculateNextRun 是 private，通过最小 any 触达以覆盖纯函数逻辑
  const calc = (from: Date, frequency: string, interval: number, daysOfWeek?: number[], dayOfMonth?: number): Date =>
    (service as unknown as { calculateNextRun: (...args: unknown[]) => Date })
      .calculateNextRun(from, frequency, interval, daysOfWeek, dayOfMonth);

  const makeRecurring = (over: Record<string, unknown> = {}) => ({
    id: 'rt1', teamId: 'team1', createdBy: 'u1',
    frequency: 'DAILY', interval: 1, daysOfWeek: [], dayOfMonth: null,
    nextRun: new Date('2025-01-10T09:00:00Z'), isActive: true, endDate: null,
    template: {
      name: '模板', title: '周期任务', description: 'desc', priority: 'MEDIUM',
      subtasks: '["子任务A","子任务B"]', labelIds: '[]',
    },
    ...over,
  });

  beforeEach(() => {
    tx = {
      recurringTask: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      task: {
        create: jest.fn().mockResolvedValue({
          id: 'new-task', title: '周期任务', teamId: 'team1',
          subtasks: [{ title: '子任务A' }, { title: '子任务B' }],
          labels: [],
        }),
      },
      taskLabel: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    prisma = {
      recurringTask: { findMany: jest.fn().mockResolvedValue([]) },
      label: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (cb: (txArg: typeof tx) => Promise<unknown>) => cb(tx)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    gateway = { emitTaskCreated: jest.fn() };
    service = new RecurringService(prisma as never, audit as never, gateway as never);
  });

  describe('calculateNextRun（统一 UTC，时间为当天 9 点）', () => {
    const from = new Date('2025-01-10T15:30:45Z'); // 周五

    it('DAILY interval=1 → 次日 UTC 9:00', () => {
      expect(calc(from, 'DAILY', 1).toISOString()).toBe('2025-01-11T09:00:00.000Z');
    });

    it('DAILY interval=3 → 3 天后 UTC 9:00', () => {
      expect(calc(from, 'DAILY', 3).toISOString()).toBe('2025-01-13T09:00:00.000Z');
    });

    it('WEEKLY daysOfWeek=[1]（周一）→ 下一个周一 UTC 9:00', () => {
      expect(calc(from, 'WEEKLY', 1, [1]).toISOString()).toBe('2025-01-13T09:00:00.000Z');
    });

    it('WEEKLY 未指定 daysOfWeek → 7*interval 天后', () => {
      expect(calc(from, 'WEEKLY', 1).toISOString()).toBe('2025-01-17T09:00:00.000Z');
      expect(calc(from, 'WEEKLY', 2).toISOString()).toBe('2025-01-24T09:00:00.000Z');
    });

    it('MONTHLY dayOfMonth=15 → 下一月 15 日 UTC 9:00', () => {
      expect(calc(from, 'MONTHLY', 1, undefined, 15).toISOString()).toBe('2025-02-15T09:00:00.000Z');
    });

    it('MONTHLY dayOfMonth=31 遇到小月 → 钳制到当月最后一天', () => {
      expect(calc(from, 'MONTHLY', 1, undefined, 31).toISOString()).toBe('2025-02-28T09:00:00.000Z');
    });

    it('MONTHLY 锚点 1/31（无 dayOfMonth）→ 钳到 2/28，不跳到 3 月', () => {
      expect(calc(new Date('2025-01-31T15:00:00Z'), 'MONTHLY', 1).toISOString()).toBe('2025-02-28T09:00:00.000Z');
    });

    it('MONTHLY 闰年锚点 2/29 → 顺移 3/29；interval=12 跨到平年 → 钳到 2/28', () => {
      expect(calc(new Date('2024-02-29T15:00:00Z'), 'MONTHLY', 1).toISOString()).toBe('2024-03-29T09:00:00.000Z');
      expect(calc(new Date('2024-02-29T15:00:00Z'), 'MONTHLY', 12).toISOString()).toBe('2025-02-28T09:00:00.000Z');
    });

    it('endDate 过期 → 不再生成：由 processRecurringTasks 查询条件过滤（calculateNextRun 本身不感知 endDate）', async () => {
      await service.processRecurringTasks();
      const where = prisma.recurringTask.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({
        isActive: true,
        nextRun: { lte: expect.any(Date) },
        OR: [{ endDate: null }, { endDate: { gte: expect.any(Date) } }],
      });
    });
  });

  describe('processRecurringTasks 幂等（乐观锁）', () => {
    it('updateMany 返回 count=0（已被其他实例抢占）→ 不建任务、不广播、不审计', async () => {
      prisma.recurringTask.findMany.mockResolvedValue([makeRecurring()]);
      tx.recurringTask.updateMany.mockResolvedValue({ count: 0 });

      await service.processRecurringTasks();

      expect(tx.recurringTask.updateMany).toHaveBeenCalledWith({
        where: { id: 'rt1', nextRun: new Date('2025-01-10T09:00:00Z') },
        data: { lastCreated: expect.any(Date), nextRun: expect.any(Date) },
      });
      expect(tx.task.create).not.toHaveBeenCalled();
      expect(gateway.emitTaskCreated).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('count=1 → 建任务（含子任务）+ 推进 nextRun + 广播 + 审计', async () => {
      prisma.recurringTask.findMany.mockResolvedValue([makeRecurring()]);

      await service.processRecurringTasks();

      expect(tx.task.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          title: '周期任务', teamId: 'team1',
          subtasks: { create: [{ title: '子任务A' }, { title: '子任务B' }] },
        }),
      }));
      const pushed: Date = tx.recurringTask.updateMany.mock.calls[0][0].data.nextRun;
      expect(pushed.getTime()).toBeGreaterThan(Date.now() - 1000); // nextRun 推进到未来
      expect(gateway.emitTaskCreated).toHaveBeenCalledWith('team1', expect.objectContaining({ id: 'new-task', labels: [] }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE', entityType: 'TASK', entityId: 'new-task', userId: 'u1', teamId: 'team1',
      }));
    });

    it('模板标签过滤已删除/跨团队标签后再应用', async () => {
      prisma.recurringTask.findMany.mockResolvedValue([makeRecurring({ template: { ...makeRecurring().template, labelIds: '["l1","l2"]' } })]);
      prisma.label.findMany.mockResolvedValue([{ id: 'l1' }]); // l2 已删除或不属于本团队

      await service.processRecurringTasks();

      expect(prisma.label.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['l1', 'l2'] }, teamId: 'team1' }, select: { id: true },
      });
      expect(tx.taskLabel.createMany).toHaveBeenCalledWith({
        data: [{ taskId: 'new-task', labelId: 'l1' }], skipDuplicates: true,
      });
    });

    it('单条处理失败不影响其他周期任务（错误仅记录日志）', async () => {
      const failing = makeRecurring({ id: 'rt-fail' });
      const ok = makeRecurring({ id: 'rt-ok' });
      prisma.recurringTask.findMany.mockResolvedValue([failing, ok]);
      prisma.$transaction
        .mockImplementationOnce(() => Promise.reject(new Error('db down')))
        .mockImplementation(async (cb: (txArg: typeof tx) => Promise<unknown>) => cb(tx));

      await service.processRecurringTasks();

      expect(tx.task.create).toHaveBeenCalledTimes(1); // rt-ok 仍被处理
      expect(gateway.emitTaskCreated).toHaveBeenCalledTimes(1);
    });
  });
});
