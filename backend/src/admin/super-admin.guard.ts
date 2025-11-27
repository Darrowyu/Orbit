import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) throw new ForbiddenException('未授权');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
    if (!user?.isSuperAdmin) throw new ForbiddenException('需要超级管理员权限');
    return true;
  }
}
