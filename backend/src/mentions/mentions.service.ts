import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MentionsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  extractMentions(text: string): string[] {
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) mentions.push(match[2]);
    return [...new Set(mentions)];
  }

  async processMentions(text: string, sourceType: string, sourceId: string, senderId: string, teamId: string) {
    const userIds = this.extractMentions(text);
    if (userIds.length === 0) return [];

    const validUsers = await this.prisma.teamMember.findMany({ where: { teamId, userId: { in: userIds } }, select: { userId: true } });
    const validIds = validUsers.map(u => u.userId).filter(id => id !== senderId);

    await this.prisma.mention.deleteMany({ where: { sourceType, sourceId } });

    if (validIds.length > 0) {
      await this.prisma.mention.createMany({ data: validIds.map(userId => ({ userId, sourceType, sourceId })) });
      
      const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });
      const typeLabels: Record<string, string> = { TASK: '任务', COMMENT: '评论' };
      
      for (const uid of validIds) {
        await this.notifications.create(
          uid,
          'MENTION',
          '有人提及了你',
          `${sender?.name || '某人'} 在${typeLabels[sourceType] || '内容'}中提及了你`,
          { sourceType, sourceId }
        );
      }
    }

    return validIds;
  }

  async getMentionsForUser(userId: string, limit = 20) {
    return this.prisma.mention.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
