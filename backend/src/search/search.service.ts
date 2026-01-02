import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  tasks: Array<{ id: string; title: string; description: string; status: string; projectId: string | null; priority: string }>;
  projects: Array<{ id: string; name: string; description: string; color: string }>;
  comments: Array<{ id: string; content: string; taskId: string; taskTitle: string }>;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(teamId: string, query: string, limit = 10): Promise<SearchResult> {
    const [tasks, projects, comments] = await Promise.all([
      this.prisma.task.findMany({
        where: { teamId, isArchived: false, OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] },
        select: { id: true, title: true, description: true, status: true, projectId: true, priority: true },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.project.findMany({
        where: { teamId, isArchived: false, OR: [{ name: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] },
        select: { id: true, name: true, description: true, color: true },
        take: limit,
      }),
      this.prisma.comment.findMany({
        where: { task: { teamId }, content: { contains: query, mode: 'insensitive' } },
        select: { id: true, content: true, taskId: true, task: { select: { title: true } } },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      tasks,
      projects,
      comments: comments.map((c) => ({ id: c.id, content: c.content, taskId: c.taskId, taskTitle: c.task.title })),
    };
  }
}
