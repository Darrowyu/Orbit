import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// Prisma 已知错误全局映射为脱敏的 HTTP 响应，避免原始 message 泄露表结构
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    switch (exception.code) {
      case 'P2002': // 唯一约束冲突（如重复加入团队、标签重名竞态）
        status = HttpStatus.CONFLICT;
        message = '已存在相同记录';
        break;
      case 'P2025': // 记录不存在
        status = HttpStatus.NOT_FOUND;
        message = '记录不存在';
        break;
      case 'P2003': // 外键约束失败
        status = HttpStatus.CONFLICT;
        message = '存在关联数据，无法操作';
        break;
      default:
        this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);
    }
    res.status(status).json({ statusCode: status, message });
  }
}
