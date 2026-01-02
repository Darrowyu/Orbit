import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getBurndownData(projectId: string, teamId: string, startDate: Date, endDate: Date) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, teamId, isArchived: false, createdAt: { lte: endDate } },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    });

    const days: { date: string; remaining: number; completed: number }[] = [];
    const d = new Date(startDate);
    while (d <= endDate) {
      const dateStr = d.toISOString().split('T')[0];
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      
      const created = tasks.filter(t => new Date(t.createdAt) <= dayEnd).length;
      const done = tasks.filter(t => t.status === 'DONE' && new Date(t.updatedAt) <= dayEnd).length;
      
      days.push({ date: dateStr, remaining: created - done, completed: done });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  async getCumulativeFlowData(projectId: string, teamId: string, startDate: Date, endDate: Date) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, teamId, isArchived: false },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    });

    const days: { date: string; TODO: number; IN_PROGRESS: number; REVIEW: number; DONE: number }[] = [];
    const d = new Date(startDate);
    while (d <= endDate) {
      const dateStr = d.toISOString().split('T')[0];
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const activeTasks = tasks.filter(t => new Date(t.createdAt) <= dayEnd);
      const counts = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
      activeTasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
      
      days.push({ date: dateStr, ...counts });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  async getTeamWorkload(teamId: string) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, avatar: true, color: true } } },
    });

    const tasks = await this.prisma.task.findMany({
      where: { teamId, isArchived: false },
      select: { assigneeId: true, status: true, priority: true },
    });

    return members.map(m => {
      const userTasks = tasks.filter(t => t.assigneeId === m.userId);
      return {
        user: m.user,
        total: userTasks.length,
        byStatus: {
          TODO: userTasks.filter(t => t.status === 'TODO').length,
          IN_PROGRESS: userTasks.filter(t => t.status === 'IN_PROGRESS').length,
          REVIEW: userTasks.filter(t => t.status === 'REVIEW').length,
          DONE: userTasks.filter(t => t.status === 'DONE').length,
        },
        byPriority: {
          HIGH: userTasks.filter(t => t.priority === 'HIGH').length,
          MEDIUM: userTasks.filter(t => t.priority === 'MEDIUM').length,
          LOW: userTasks.filter(t => t.priority === 'LOW').length,
        },
      };
    });
  }

  async getProjectStats(projectId: string, teamId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, teamId, isArchived: false },
      select: { status: true, priority: true, dueDate: true, createdAt: true, updatedAt: true },
    });

    const now = new Date();
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE').length;
    const completedThisWeek = tasks.filter(t => {
      if (t.status !== 'DONE') return false;
      const updated = new Date(t.updatedAt);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return updated >= weekAgo;
    }).length;

    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    
    const completedTasks = tasks.filter(t => t.status === 'DONE');
    const avgCycleTime = completedTasks.length > 0 
      ? completedTasks.reduce((sum, t) => sum + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0) / completedTasks.length / (1000 * 60 * 60 * 24)
      : 0;

    return {
      total,
      completed: done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      overdue,
      completedThisWeek,
      avgCycleTimeDays: Math.round(avgCycleTime * 10) / 10,
      byStatus: {
        TODO: tasks.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        REVIEW: tasks.filter(t => t.status === 'REVIEW').length,
        DONE: done,
      },
      byPriority: {
        HIGH: tasks.filter(t => t.priority === 'HIGH').length,
        MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
        LOW: tasks.filter(t => t.priority === 'LOW').length,
      },
    };
  }

  async getTimeReport(teamId: string, startDate?: Date, endDate?: Date) {
    const where: any = { task: { teamId } };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: { user: { select: { id: true, name: true } }, task: { select: { id: true, title: true, projectId: true } } },
    });

    const byUser: Record<string, { name: string; totalMinutes: number }> = {};
    const byTask: Record<string, { title: string; totalMinutes: number }> = {};
    const byProject: Record<string, { totalMinutes: number }> = {};

    entries.forEach(e => {
      const mins = e.duration || 0;
      if (!byUser[e.userId]) byUser[e.userId] = { name: e.user.name, totalMinutes: 0 };
      byUser[e.userId].totalMinutes += mins;
      
      if (!byTask[e.taskId]) byTask[e.taskId] = { title: e.task.title, totalMinutes: 0 };
      byTask[e.taskId].totalMinutes += mins;

      if (e.task.projectId) {
        if (!byProject[e.task.projectId]) byProject[e.task.projectId] = { totalMinutes: 0 };
        byProject[e.task.projectId].totalMinutes += mins;
      }
    });

    return { byUser: Object.entries(byUser).map(([id, data]) => ({ userId: id, ...data })), byTask: Object.entries(byTask).map(([id, data]) => ({ taskId: id, ...data })), byProject: Object.entries(byProject).map(([id, data]) => ({ projectId: id, ...data })), totalMinutes: entries.reduce((sum, e) => sum + (e.duration || 0), 0) };
  }
}
