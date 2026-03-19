import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { RateLimitMiddleware } from './common/rate-limit.middleware';

async function bootstrap() {
  const logger = new Logger('Orbit');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'], // 只显示错误和警告
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(new RateLimitMiddleware().use.bind(new RateLimitMiddleware())); // 全局限流中间件
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const origins = frontendUrl.split(',').map(url => url.trim());
  app.enableCors({ origin: origins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] });
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Backend running on http://localhost:${port}`);
}
bootstrap();

