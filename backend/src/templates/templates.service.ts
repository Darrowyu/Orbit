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

// 兼容历史 stringify 写入的数据：string 则 parse，数组直接用
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
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
        subtasks: dto.subtasks || [],
        labelIds: dto.labelIds || [],
        teamId,
        createdBy: userId,
      },
    });
  }

  async findAll(teamId: string) {
    const templates = await this.prisma.taskTemplate.findMany({ where: { teamId }, orderBy: { createdAt: 'desc' } });
    return templates.map(t => ({ ...t, subtasks: parseJsonArray(t.subtasks), labelIds: parseJsonArray(t.labelIds) }));
  }

  async findOne(id: string, teamId: string) {
    const t = await this.prisma.taskTemplate.findFirst({ where: { id, teamId } });
    if (!t) throw new NotFoundException('模板不存在');
    return { ...t, subtasks: parseJsonArray(t.subtasks), labelIds: parseJsonArray(t.labelIds) };
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
      data: { ...dto },
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
