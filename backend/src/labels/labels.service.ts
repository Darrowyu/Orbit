import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@Injectable()
export class LabelsService {
  constructor(private prisma: PrismaService) {}

  async create(teamId: string, dto: CreateLabelDto) {
    const exists = await this.prisma.label.findUnique({ where: { teamId_name: { teamId, name: dto.name } } });
    if (exists) throw new ConflictException('标签名已存在');
    return this.prisma.label.create({ data: { ...dto, teamId } });
  }

  async findAll(teamId: string) {
    return this.prisma.label.findMany({ where: { teamId }, orderBy: { createdAt: 'asc' } });
  }

  async update(id: string, teamId: string, dto: UpdateLabelDto) {
    const label = await this.prisma.label.findFirst({ where: { id, teamId } });
    if (!label) throw new NotFoundException('标签不存在');
    if (dto.name) {
      const exists = await this.prisma.label.findFirst({ where: { teamId, name: dto.name, NOT: { id } } });
      if (exists) throw new ConflictException('标签名已存在');
    }
    return this.prisma.label.update({ where: { id }, data: dto });
  }

  async delete(id: string, teamId: string) {
    const label = await this.prisma.label.findFirst({ where: { id, teamId } });
    if (!label) throw new NotFoundException('标签不存在');
    return this.prisma.label.delete({ where: { id } });
  }

  async addToTask(taskId: string, labelId: string, teamId: string) {
    const [task, label] = await Promise.all([
      this.prisma.task.findFirst({ where: { id: taskId, teamId } }),
      this.prisma.label.findFirst({ where: { id: labelId, teamId } }),
    ]);
    if (!task) throw new NotFoundException('任务不存在');
    if (!label) throw new NotFoundException('标签不存在');
    const exists = await this.prisma.taskLabel.findUnique({ where: { taskId_labelId: { taskId, labelId } } });
    if (exists) return exists;
    return this.prisma.taskLabel.create({ data: { taskId, labelId } });
  }

  async removeFromTask(taskId: string, labelId: string) {
    const tl = await this.prisma.taskLabel.findUnique({ where: { taskId_labelId: { taskId, labelId } } });
    if (!tl) throw new NotFoundException('任务标签关联不存在');
    return this.prisma.taskLabel.delete({ where: { taskId_labelId: { taskId, labelId } } });
  }

  async getTaskLabels(taskId: string) {
    const tls = await this.prisma.taskLabel.findMany({ where: { taskId }, include: { label: true } });
    return tls.map(tl => tl.label);
  }

  async setTaskLabels(taskId: string, labelIds: string[], teamId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, teamId } });
    if (!task) throw new NotFoundException('任务不存在');
    if (labelIds.length > 0) { // 验证所有 labelIds 都属于当前团队
      const validLabels = await this.prisma.label.findMany({ where: { id: { in: labelIds }, teamId } });
      if (validLabels.length !== labelIds.length) throw new NotFoundException('部分标签不存在或不属于当前团队');
    }
    await this.prisma.taskLabel.deleteMany({ where: { taskId } });
    if (labelIds.length > 0) {
      await this.prisma.taskLabel.createMany({ data: labelIds.map(labelId => ({ taskId, labelId })) });
    }
    return this.getTaskLabels(taskId);
  }
}
