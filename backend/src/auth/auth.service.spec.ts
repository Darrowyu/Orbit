import { ForbiddenException, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';

// 纯单元测试：UsersService / JwtService / PrismaService / MailService 全部 mock，不连真实数据库
describe('AuthService', () => {
  let service: AuthService;
  let users: { findByEmail: jest.Mock; findByEmailOrName: jest.Mock; create: jest.Mock };
  let jwt: { sign: jest.Mock };
  let prisma: {
    loginLog: { count: jest.Mock; create: jest.Mock };
    user: { update: jest.Mock };
    passwordResetCode: { findFirst: jest.Mock; create: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let mail: { sendMail: jest.Mock };

  const activeUser = {
    id: 'u1', email: 'a@b.com', name: 'Alice', password: 'stored-hash',
    avatar: '😊', color: 'bg-blue-100 text-blue-700', isActive: true,
  };

  beforeEach(() => {
    users = { findByEmail: jest.fn(), findByEmailOrName: jest.fn(), create: jest.fn() };
    jwt = { sign: jest.fn().mockReturnValue('signed-token') };
    prisma = {
      loginLog: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
      user: { update: jest.fn().mockResolvedValue({}) },
      passwordResetCode: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((promises: Promise<unknown>[]) => Promise.all(promises)),
    };
    mail = { sendMail: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(users as never, jwt as never, prisma as never, mail as never);
  });

  afterEach(() => { jest.restoreAllMocks(); });

  describe('login 锁定', () => {
    it('同邮箱近 15 分钟内失败满 5 次 → 第 6 次直接 403，不再校验密码', async () => {
      prisma.loginLog.count.mockResolvedValue(5); // 达到 LOGIN_ATTEMPT_LIMIT
      await expect(service.login({ email: 'a@b.com', password: 'CorrectPass1' }))
        .rejects.toBeInstanceOf(ForbiddenException);
      // 真实行为是 403 Forbidden（非 423/429）
      await service.login({ email: 'a@b.com', password: 'CorrectPass1' }).catch((e) => {
        expect(e.getStatus()).toBe(403);
        expect(e.message).toContain('15 分钟');
      });
      expect(users.findByEmailOrName).not.toHaveBeenCalled(); // 锁定短路在查库之前
    });

    it('失败计数窗口外的记录不影响登录（count < 5 放行）', async () => {
      prisma.loginLog.count.mockResolvedValue(4);
      users.findByEmailOrName.mockResolvedValue(activeUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const result = await service.login({ email: 'a@b.com', password: 'CorrectPass1' });
      expect(result.token).toBe('signed-token');
    });

    it('同 IP 20 次失败（跨邮箱撞库）→ 403 锁定', async () => {
      prisma.loginLog.count
        .mockResolvedValueOnce(0) // 邮箱维度未满
        .mockResolvedValueOnce(20); // IP 维度达到 IP_ATTEMPT_LIMIT
      await expect(service.login({ email: 'new@b.com', password: 'x' }, '1.2.3.4'))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(users.findByEmailOrName).not.toHaveBeenCalled();
    });
  });

  describe('login 时序安全与 LoginLog', () => {
    it('用户不存在时也执行 bcrypt.compare（使用 DUMMY_HASH 消除时序差），并落失败日志 userId=null', async () => {
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      users.findByEmailOrName.mockResolvedValue(null);
      await expect(service.login({ email: 'ghost@b.com', password: 'AnyPass1' }, '1.2.3.4', 'UA'))
        .rejects.toBeInstanceOf(UnauthorizedException);
      expect(compareSpy).toHaveBeenCalledTimes(1);
      const [, hashUsed] = compareSpy.mock.calls[0];
      expect(hashUsed).toMatch(/^\$2[aby]\$/); // 对 DUMMY_HASH 做比较，而非跳过
      expect(prisma.loginLog.create).toHaveBeenCalledWith({
        data: { userId: null, ip: '1.2.3.4', userAgent: 'UA', success: false },
      });
    });

    it('密码错误 → 401，落失败日志 userId 为用户 id', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      users.findByEmailOrName.mockResolvedValue(activeUser);
      await expect(service.login({ email: 'a@b.com', password: 'WrongPass1' }))
        .rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.loginLog.create).toHaveBeenCalledWith({
        data: { userId: 'u1', ip: undefined, userAgent: undefined, success: false },
      });
    });

    it('登录成功 → 落成功日志、更新 lastLoginAt、返回脱敏用户与 token', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      users.findByEmailOrName.mockResolvedValue(activeUser);
      const result = await service.login({ email: 'a@b.com', password: 'CorrectPass1' }, '1.2.3.4');
      expect(prisma.loginLog.create).toHaveBeenCalledWith({
        data: { userId: 'u1', ip: '1.2.3.4', userAgent: undefined, success: true },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' }, data: { lastLoginAt: expect.any(Date) },
      });
      expect(result.token).toBe('signed-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('账号被禁用 → 403', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      users.findByEmailOrName.mockResolvedValue({ ...activeUser, isActive: false });
      await expect(service.login({ email: 'a@b.com', password: 'CorrectPass1' }))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('register', () => {
    it('邮箱已注册 → ConflictException', async () => {
      users.findByEmail.mockResolvedValue(activeUser);
      await expect(service.register({ email: 'a@b.com', password: 'Passw0rd1', name: 'A' }))
        .rejects.toBeInstanceOf(ConflictException);
    });

    it.each([
      ['short1', '密码长度至少8位'],
      ['abcdefgh', '密码必须包含数字'],
      ['12345678', '密码必须包含字母'],
    ])('弱密码 %s → BadRequestException: %s', async (password, message) => {
      users.findByEmail.mockResolvedValue(null);
      await expect(service.register({ email: 'new@b.com', password, name: 'A' }))
        .rejects.toThrow(new BadRequestException(message).message);
    });

    it('注册成功 → 哈希存储并返回脱敏用户与 token', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation((data) => Promise.resolve({ id: 'u2', ...data }));
      const result = await service.register({ email: 'new@b.com', password: 'Passw0rd1', name: 'B' });
      const created = users.create.mock.calls[0][0];
      expect(created.password).not.toBe('Passw0rd1'); // 存哈希不存明文
      expect(created.password).toMatch(/^\$2[aby]\$/);
      expect(result.token).toBe('signed-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('并发注册竞态：users.create 抛 P2002 时 service 层原样向上传播', async () => {
      users.findByEmail.mockResolvedValue(null);
      const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      users.create.mockRejectedValue(p2002);
      // 有意设计：service 不捕获，由全局 PrismaExceptionFilter 在 HTTP 层映射为 409（见 prisma-exception.filter.spec.ts）
      await expect(service.register({ email: 'new@b.com', password: 'Passw0rd1', name: 'B' }))
        .rejects.toMatchObject({ code: 'P2002' });
    });
  });

  describe('forgotPassword', () => {
    it('未注册邮箱也返回 success（防账号枚举），且不发码不发信', async () => {
      users.findByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword({ email: 'ghost@b.com' });
      expect(result).toEqual({ success: true });
      expect(prisma.passwordResetCode.create).not.toHaveBeenCalled();
      expect(mail.sendMail).not.toHaveBeenCalled();
    });

    it('60 秒内重复发码 → 429', async () => {
      users.findByEmail.mockResolvedValue(activeUser);
      prisma.passwordResetCode.findFirst.mockResolvedValue({ id: 'rc1' }); // 60 秒内已有记录
      const err = await service.forgotPassword({ email: 'a@b.com' }).catch((e) => e);
      expect(err.getStatus()).toBe(429);
      expect(prisma.passwordResetCode.create).not.toHaveBeenCalled();
    });

    it('正常发码 → 存 SHA-256 哈希、10 分钟有效、发送 6 位数字验证码', async () => {
      users.findByEmail.mockResolvedValue(activeUser);
      const result = await service.forgotPassword({ email: 'A@B.com' });
      expect(result).toEqual({ success: true });
      expect(users.findByEmail).toHaveBeenCalledWith('a@b.com'); // 邮箱统一小写
      const created = prisma.passwordResetCode.create.mock.calls[0][0].data;
      expect(created.codeHash).toMatch(/^[0-9a-f]{64}$/); // 存哈希不存明文
      expect(created.expiresAt.getTime()).toBeGreaterThan(Date.now());
      const [, subject, body] = mail.sendMail.mock.calls[0];
      expect(subject).toContain('密码重置');
      expect(body).toMatch(/\d{6}/);
    });
  });

  describe('verifyResetCode / 防爆破', () => {
    const hashOf = (code: string) => createHash('sha256').update(code).digest('hex');

    it('无有效验证码 → BadRequest', async () => {
      prisma.passwordResetCode.findFirst.mockResolvedValue(null);
      await expect(service.verifyResetCode({ email: 'a@b.com', code: '123456' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('占位失败（次数已满或已消费，updateMany count=0）→ 验证码作废', async () => {
      prisma.passwordResetCode.findFirst.mockResolvedValue({ id: 'rc1', attempts: 5, codeHash: hashOf('123456') });
      prisma.passwordResetCode.updateMany.mockResolvedValue({ count: 0 }); // 原子占位失败
      await expect(service.verifyResetCode({ email: 'a@b.com', code: '123456' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('验证码错误 → 原子占位 attempts +1 并拒绝', async () => {
      prisma.passwordResetCode.findFirst.mockResolvedValue({ id: 'rc1', attempts: 2, codeHash: hashOf('123456') });
      await expect(service.verifyResetCode({ email: 'a@b.com', code: '999999' }))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.passwordResetCode.updateMany).toHaveBeenCalledWith({
        where: { id: 'rc1', attempts: { lt: 5 }, consumedAt: null },
        data: { attempts: { increment: 1 } },
      });
    });

    it('验证码正确 → success', async () => {
      prisma.passwordResetCode.findFirst.mockResolvedValue({ id: 'rc1', attempts: 0, codeHash: hashOf('123456') });
      await expect(service.verifyResetCode({ email: 'a@b.com', code: '123456' }))
        .resolves.toEqual({ success: true });
    });
  });

  describe('resetPassword', () => {
    const hashOf = (code: string) => createHash('sha256').update(code).digest('hex');

    beforeEach(() => {
      prisma.passwordResetCode.findFirst.mockResolvedValue({ id: 'rc1', attempts: 0, codeHash: hashOf('123456') });
      users.findByEmail.mockResolvedValue(activeUser);
    });

    it('成功后旧验证码全部 consumed，密码哈希更新（同一事务）', async () => {
      const result = await service.resetPassword({ email: 'A@B.com', code: '123456', password: 'NewPassw0rd1' });
      expect(result).toEqual({ success: true });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' }, data: { password: expect.stringMatching(/^\$2[aby]\$/) },
      });
      expect(prisma.passwordResetCode.updateMany).toHaveBeenCalledWith({
        where: { email: 'a@b.com', consumedAt: null },
        data: { consumedAt: expect.any(Date) },
      });
    });

    it('新密码不符合强度 → BadRequest，不更新', async () => {
      await expect(service.resetPassword({ email: 'a@b.com', code: '123456', password: 'weak' }))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('验证码有效但用户不存在 → BadRequest（防枚举一致性）', async () => {
      users.findByEmail.mockResolvedValue(null);
      await expect(service.resetPassword({ email: 'a@b.com', code: '123456', password: 'NewPassw0rd1' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
