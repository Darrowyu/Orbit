import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMilestoneDto, teamId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, teamId } });
    if (!project) throw new NotFoundException('项目不存在');
    return this.prisma.milestone.create({
      data: { name: dto.name, description: dto.description || '', dueDate: new Date(dto.dueDate), projectId: dto.projectId },
      include: { tasks: { select: { id: true, title: true, status: true } } },
    });
  }

  async findByProject(projectId: string, teamId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, teamId } });
    if (!project) throw new NotFoundException('项目不存在');
    return this.prisma.milestone.findMany({
      where: { projectId },
      include: { tasks: { select: { id: true, title: true, status: true } }, _count: { select: { tasks: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string, teamId: string) {
    const ms = await this.prisma.milestone.findUnique({ where: { id }, include: { project: true, tasks: { select: { id: true, title: true, status: true, priority: true } } } });
    if (!ms || ms.project.teamId !== teamId) throw new NotFoundException('里程碑不存在');
    return ms;
  }

  async update(id: string, dto: UpdateMilestoneDto, teamId: string) {
    const ms = await this.prisma.milestone.findUnique({ where: { id }, include: { project: true } });
    if (!ms || ms.project.teamId !== teamId) throw new NotFoundException('里程碑不存在');
    return this.prisma.milestone.update({
      where: { id },
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined },
      include: { tasks: { select: { id: true, title: true, status: true } } },
    });
  }

  async delete(id: string, teamId: string) {
    const ms = await this.prisma.milestone.findUnique({ where: { id }, include: { project: true, _count: { select: { tasks: true } } } });
    if (!ms || ms.project.teamId !== teamId) throw new NotFoundException('里程碑不存在');
    if (ms._count.tasks > 0) { // 删除前清理关联任务的 milestoneId
      await this.prisma.task.updateMany({ where: { milestoneId: id }, data: { milestoneId: null } });
    }
    return this.prisma.milestone.delete({ where: { id } });
  }

  async addTask(milestoneId: string, taskId: string, teamId: string) {
    const [ms, task] = await Promise.all([
      this.prisma.milestone.findUnique({ where: { id: milestoneId }, include: { project: true } }),
      this.prisma.task.findFirst({ where: { id: taskId, teamId } }),
    ]);
    if (!ms || ms.project.teamId !== teamId) throw new NotFoundException('里程碑不存在');
    if (!task) throw new NotFoundException('任务不存在');
    if (task.projectId && task.projectId !== ms.projectId) throw new BadRequestException('任务所属项目与里程碑不一致');
    return this.prisma.task.update({ where: { id: taskId }, data: { milestoneId, projectId: ms.projectId } }); // 自动关联项目
  }

  async removeTask(taskId: string, teamId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, teamId } });
    if (!task) throw new NotFoundException('任务不存在');
    return this.prisma.task.update({ where: { id: taskId }, data: { milestoneId: null } });
  }

  async getProgress(id: string, teamId: string) {
    const ms = await this.findOne(id, teamId);
    const total = ms.tasks.length;
    const done = ms.tasks.filter(t => t.status === 'DONE').length;
    return { total, done, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
  }
}
