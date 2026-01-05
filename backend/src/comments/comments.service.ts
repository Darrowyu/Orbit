import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface CommentDto { content: string; }

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async findByTask(taskId: string, userId?: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { teamId: true } });
    if (!task) throw new NotFoundException('任务不存在');
    if (userId) { // 验证用户是否为团队成员
      const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
      if (!member) throw new ForbiddenException('无权查看此任务的评论');
    }
    return this.prisma.comment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(taskId: string, userId: string, dto: CommentDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
    if (!member) throw new ForbiddenException('您不是该任务所属团队的成员');
    const comment = await this.prisma.comment.create({
      data: { content: dto.content, taskId, userId },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
    });
    if (task.assigneeId && task.assigneeId !== userId) {
      const commenter = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.notifications.notifyNewComment(task.title, task.assigneeId, commenter?.name || '某人');
    }
    this.logger.log(`User ${userId} commented on task ${taskId}`);
    return comment;
  }

  async update(id: string, userId: string, dto: CommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    if (comment.userId !== userId) throw new ForbiddenException('无权修改此评论');
    return this.prisma.comment.update({
      where: { id },
      data: { content: dto.content },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
    });
  }

  async delete(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    if (comment.userId !== userId) throw new ForbiddenException('无权删除此评论');
    await this.prisma.comment.delete({ where: { id } });
    return { success: true };
  }
}
