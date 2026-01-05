import { Controller, Get, Query, Param, UseGuards, Request } from '@nestjs/common';
import { AuditService, EntityType } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private audit: AuditService, private prisma: PrismaService) {}

  @Get('team')
  async getTeamLogs(@Request() req: { user: { sub: string } }, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user?.currentTeamId) return [];
    return this.audit.getByTeam(user.currentTeamId, limit ? parseInt(limit) : 50, offset ? parseInt(offset) : 0);
  }

  @Get('entity/:type/:id')
  async getEntityLogs(@Param('type') type: string, @Param('id') id: string, @Request() req: { user: { sub: string } }) {
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user?.currentTeamId) return [];
    return this.audit.getByEntity(type.toUpperCase() as EntityType, id, user.currentTeamId);
  }
}
