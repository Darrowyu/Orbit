import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTemplateDto {
  name: string;
  title: string;
  description?: string;
  priority?: string;
  subtasks?: string[];
  labelIds?: string[];
}

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTemplateDto, teamId: string, userId: string) {
    return this.prisma.taskTemplate.create({
      data: {
        name: dto.name,
        title: dto.title,
        description: dto.description || '',
        priority: dto.priority || 'MEDIUM',
        subtasks: JSON.stringify(dto.subtasks || []),
        labelIds: JSON.stringify(dto.labelIds || []),
        teamId,
        createdBy: userId,
      },
    });
  }

  async findAll(teamId: string) {
    const templates = await this.prisma.taskTemplate.findMany({ where: { teamId }, orderBy: { createdAt: 'desc' } });
    return templates.map(t => ({ ...t, subtasks: JSON.parse(t.subtasks as string), labelIds: JSON.parse(t.labelIds as string) }));
  }

  async findOne(id: string, teamId: string) {
    const t = await this.prisma.taskTemplate.findFirst({ where: { id, teamId } });
    if (!t) throw new NotFoundException('模板不存在');
    return { ...t, subtasks: JSON.parse(t.subtasks as string), labelIds: JSON.parse(t.labelIds as string) };
  }

  async update(id: string, dto: Partial<CreateTemplateDto>, teamId: string, userId: string) {
    const t = await this.prisma.taskTemplate.findFirst({ where: { id, teamId } });
    if (!t) throw new NotFoundException('模板不存在');
    if (t.createdBy !== userId) {
      const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } });
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenException('只有创建者或管理员可修改模板');
    }
    return this.prisma.taskTemplate.update({
      where: { id },
      data: {
        ...dto,
        subtasks: dto.subtasks ? JSON.stringify(dto.subtasks) : undefined,
        labelIds: dto.labelIds ? JSON.stringify(dto.labelIds) : undefined,
      },
    });
  }

  async delete(id: string, teamId: string, userId: string) {
    const t = await this.prisma.taskTemplate.findFirst({ where: { id, teamId } });
    if (!t) throw new NotFoundException('模板不存在');
    if (t.createdBy !== userId) {
      const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } });
      if (!member || !['owner', 'admin'].includes(member.role)) throw new ForbiddenException('只有创建者或管理员可删除模板');
    }
    return this.prisma.taskTemplate.delete({ where: { id } });
  }
}
