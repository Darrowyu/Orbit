import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CommentDto { content: string; }

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private prisma: PrismaService) {}

  async findByTask(taskId: string) {
    return this.prisma.comment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(taskId: string, userId: string, dto: CommentDto) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    const comment = await this.prisma.comment.create({
      data: { content: dto.content, taskId, userId },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
    });
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
