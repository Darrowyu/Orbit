import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord { count: number; resetTime: number }

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windowMs: number; // 时间窗口（毫秒）
  private readonly maxRequests: number; // 最大请求数
  private readonly store = new Map<string, RateLimitRecord>();

  constructor() {
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 默认1分钟
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10); // 默认100次/分钟
    setInterval(() => this.cleanup(), this.windowMs); // 定期清理过期记录
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const key = this.getKey(req);
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      this.setHeaders(res, this.maxRequests - 1, now + this.windowMs);
      return next();
    }

    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      throw new HttpException({ statusCode: HttpStatus.TOO_MANY_REQUESTS, message: `请求过于频繁，请 ${retryAfter} 秒后重试`, error: 'Too Many Requests' }, HttpStatus.TOO_MANY_REQUESTS);
    }

    record.count++;
    this.setHeaders(res, this.maxRequests - record.count, record.resetTime);
    next();
  }

  private getKey(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    return userId ? `user:${userId}` : `ip:${ip}`; // 优先按用户ID限流，否则按IP
  }

  private setHeaders(res: Response, remaining: number, resetTime: number): void {
    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) this.store.delete(key);
    }
  }
}
