import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

// 纯单元测试：mock ArgumentsHost/Response，验证 Prisma 已知错误 → 脱敏 HTTP 响应的映射
describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let res: { status: jest.Mock; json: jest.Mock };
  let host: ArgumentsHost;

  const prismaError = (code: string, message = 'raw prisma message with table structure') =>
    new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: '5.8.0' });

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  });

  it('P2002 唯一约束冲突 → 409 "已存在相同记录"', () => {
    filter.catch(prismaError('P2002'), host);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 409, message: '已存在相同记录' });
  });

  it('P2025 记录不存在 → 404 "记录不存在"', () => {
    filter.catch(prismaError('P2025'), host);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 404, message: '记录不存在' });
  });

  it('P2003 外键约束失败 → 409 "存在关联数据，无法操作"', () => {
    filter.catch(prismaError('P2003'), host);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 409, message: '存在关联数据，无法操作' });
  });

  it('未知错误码 → 500 脱敏，不泄露原始 message', () => {
    filter.catch(prismaError('P2999', 'sensitive: column "password" of relation "User"'), host);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ statusCode: 500, message: '服务器内部错误' });
    expect(JSON.stringify(body)).not.toContain('password');
    expect(JSON.stringify(body)).not.toContain('User');
  });

  it('所有映射响应均不包含 Prisma 原始错误文本（脱敏）', () => {
    for (const code of ['P2002', 'P2025', 'P2003', 'P2014']) {
      res.json.mockClear();
      filter.catch(prismaError(code), host);
      expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('raw prisma message');
    }
  });
});
