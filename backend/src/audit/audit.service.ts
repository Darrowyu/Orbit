import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'MOVE' | 'ASSIGN';
export type EntityType = 'TASK' | 'SUBTASK' | 'TEAM' | 'USER' | 'COMMENT';

export interface AuditLogDto {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  teamId?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          userId: data.userId,
          teamId: data.teamId,
          oldValue: data.oldValue,
          newValue: data.newValue,
        }
      });
      this.logger.debug(`Audit: ${data.action} ${data.entityType} ${data.entityId} by ${data.userId}`);
    } catch (e) {
      this.logger.error(`Failed to create audit log: ${e}`);
    }
  }

  async getByTeam(teamId: string, limit = 50, offset = 0) {
    return this.prisma.auditLog.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getByEntity(entityType: EntityType, entityId: string, teamId?: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId, ...(teamId && { teamId }) },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
