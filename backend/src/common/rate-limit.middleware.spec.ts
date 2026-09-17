import { HttpException } from '@nestjs/common';
import { RateLimitMiddleware } from './rate-limit.middleware';

// 纯单元测试：req/res/next 全部 mock；fake timers 控制 Date.now 与内部 setInterval
describe('RateLimitMiddleware', () => {
  const savedWindow = process.env.LOGIN_RATE_LIMIT_WINDOW_MS;
  const savedMax = process.env.LOGIN_RATE_LIMIT_MAX;

  let res: { setHeader: jest.Mock };
  let next: jest.Mock;
  const req = (over: Record<string, unknown> = {}) =>
    ({ method: 'GET', ip: '1.2.3.4', ...over }) as never;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '1000'; // 1 秒窗口
    process.env.LOGIN_RATE_LIMIT_MAX = '2'; // 每窗口 2 次
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (savedWindow === undefined) delete process.env.LOGIN_RATE_LIMIT_WINDOW_MS; else process.env.LOGIN_RATE_LIMIT_WINDOW_MS = savedWindow;
    if (savedMax === undefined) delete process.env.LOGIN_RATE_LIMIT_MAX; else process.env.LOGIN_RATE_LIMIT_MAX = savedMax;
  });

  it('窗口内放行并设置限流响应头', () => {
    const mw = new RateLimitMiddleware();
    mw.use(req(), res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 2);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));

    mw.use(req(), res as never, next); // 第 2 次仍放行
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
  });

  it('超过窗口上限 → 429 并带 Retry-After', () => {
    const mw = new RateLimitMiddleware();
    mw.use(req(), res as never, next);
    mw.use(req(), res as never, next);

    const err = (() => { try { mw.use(req(), res as never, next); return null; } catch (e) { return e; } })();
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    expect(next).toHaveBeenCalledTimes(2); // 第 3 次未放行
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('窗口过期后重置计数重新放行', () => {
    const mw = new RateLimitMiddleware();
    mw.use(req(), res as never, next);
    mw.use(req(), res as never, next);
    expect(() => mw.use(req(), res as never, next)).toThrow(HttpException);

    jest.advanceTimersByTime(1001); // 越过窗口
    mw.use(req(), res as never, next);
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('OPTIONS 预检请求直接放行，不计数', () => {
    const mw = new RateLimitMiddleware();
    mw.use(req({ method: 'OPTIONS' }), res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('登录用户按 user:id、匿名按 ip 分桶，互不影响', () => {
    const mw = new RateLimitMiddleware();
    const authed = req({ user: { id: 'u1' } });
    mw.use(authed, res as never, next);
    mw.use(authed, res as never, next); // user:u1 桶用满
    expect(() => mw.use(authed, res as never, next)).toThrow(HttpException);

    mw.use(req(), res as never, next); // ip 桶独立，仍放行
    expect(next).toHaveBeenCalledTimes(3);
  });
});
