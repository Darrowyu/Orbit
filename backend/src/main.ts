import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, extname } from 'path';
import helmet from 'helmet';
import { RateLimitMiddleware } from './common/rate-limit.middleware';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const logger = new Logger('Orbit');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'], // 定时任务等关键执行日志需要 log 级别
  });
  app.setGlobalPrefix('api');
  app.use(helmet({ contentSecurityPolicy: false })); // 安全响应头（nosniff/frame 等）；CSP 由上传防护与前端自行处理
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter()); // Prisma 异常全局脱敏映射
  const rateLimiter = new RateLimitMiddleware(); // 单例：避免多实例各自持有 setInterval 与独立计数
  app.use(rateLimiter.use.bind(rateLimiter)); // 全局限流中间件
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:1234';
  const origins = frontendUrl.split(',').map(url => url.trim());
  app.enableCors({ origin: origins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] });
  // 静态服务防护：nosniff 防止 MIME 嗅探；非图片扩展名强制下载，防止历史 html/svg 被内联渲染
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const ext = extname(filePath).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Backend running on http://localhost:${port}`);
}
bootstrap();

