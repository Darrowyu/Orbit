import { ForbiddenException } from '@nestjs/common';
import { TasksController } from './tasks.controller';

// 团队隔离回归（轻量）：getTeamId 守卫三态。9 个 controller 使用同一模式，tasks 到位即代表模式已统一。
describe('TasksController getTeamId 守卫', () => {
  let controller: TasksController;
  let tasks: { findAll: jest.Mock };
  let prisma: { teamMember: { findUnique: jest.Mock } };

  const reqWith = (currentTeamId?: string | null) => ({
    user: { id: 'u1', sub: 'u1', email: 'a@b.com', currentTeamId },
  });

  beforeEach(() => {
    tasks = { findAll: jest.fn().mockResolvedValue({ data: [], pagination: {} }) };
    prisma = { teamMember: { findUnique: jest.fn() } };
    controller = new TasksController(tasks as never, prisma as never);
  });

  it('显式 teamId 但用户非成员 → 403', async () => {
    prisma.teamMember.findUnique.mockResolvedValue(null);
    await expect(controller.findAll(reqWith('team1') as never, 'teamX'))
      .rejects.toThrow(new ForbiddenException('您不是该团队成员').message);
    expect(tasks.findAll).not.toHaveBeenCalled();
  });

  it('显式 teamId 且用户是成员 → 透传显式 teamId', async () => {
    prisma.teamMember.findUnique.mockResolvedValue({ role: 'member' });
    await controller.findAll(reqWith('team1') as never, 'teamX');
    expect(prisma.teamMember.findUnique).toHaveBeenCalledWith({
      where: { userId_teamId: { userId: 'u1', teamId: 'teamX' } },
    });
    expect(tasks.findAll).toHaveBeenCalledWith('teamX', expect.anything());
  });

  it('无显式 teamId 且 req.user.currentTeamId 缺失 → 403', async () => {
    await expect(controller.findAll(reqWith(null) as never))
      .rejects.toThrow(new ForbiddenException('请先加入或创建团队').message);
    expect(tasks.findAll).not.toHaveBeenCalled();
  });

  it('无显式 teamId → 使用 req.user.currentTeamId（JwtStrategy 注入的团队边界事实来源）', async () => {
    await controller.findAll(reqWith('team1') as never);
    expect(prisma.teamMember.findUnique).not.toHaveBeenCalled(); // 成员身份已在 JwtStrategy.validate 校验
    expect(tasks.findAll).toHaveBeenCalledWith('team1', expect.anything());
  });
});
