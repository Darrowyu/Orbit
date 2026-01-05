import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from '../common/types';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasks: TasksService, private prisma: PrismaService) { }

  private async getTeamId(req: AuthenticatedRequest, teamId?: string) {
    if (teamId) return teamId;
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user?.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return user.currentTeamId;
  }

  private async verifyTaskAccess(taskId: string, userId: string) { // 验证用户是否有权访问该任务
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { teamId: true } });
    if (!task) throw new NotFoundException('任务不存在');
    const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
    if (!member) throw new ForbiddenException('您不是该任务所属团队的成员');
    return task.teamId;
  }

  @Get()
  async findAll(@Request() req, @Query('teamId') teamId?: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('projectId') projectId?: string) {
    return this.tasks.findAll(await this.getTeamId(req, teamId), { page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 100, projectId });
  }

  @Get('archived')
  async findArchived(@Request() req) { return this.tasks.findArchived(await this.getTeamId(req)); }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Request() req) {
    await this.verifyTaskAccess(id, req.user.sub);
    return this.tasks.archive(id, req.user.sub);
  }

  @Patch(':id/restore')
  async restore(@Param('id') id: string, @Request() req) {
    await this.verifyTaskAccess(id, req.user.sub);
    return this.tasks.restore(id, req.user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    await this.verifyTaskAccess(id, req.user.sub); // 权限验证
    return this.tasks.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTaskDto, @Request() req) { return this.tasks.create(dto, await this.getTeamId(req), req.user.sub); }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req) {
    await this.verifyTaskAccess(id, req.user.sub); // 权限验证
    return this.tasks.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.verifyTaskAccess(id, req.user.sub);
    return this.tasks.remove(id, req.user.sub);
  }

  // 批量操作（事务化）
  @Post('batch/move')
  async batchMove(@Body() body: { ids: string[]; status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' }, @Request() req) {
    const userId = req.user.sub;
    return this.prisma.$transaction(async (tx) => {
      const results = { success: 0, failed: 0, errors: [] as string[] };
      for (const id of body.ids) {
        try {
          const task = await tx.task.findUnique({ where: { id }, select: { teamId: true, dependsOn: true } });
          if (!task) { results.failed++; results.errors.push(`${id}: 任务不存在`); continue; }
          const member = await tx.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
          if (!member) { results.failed++; results.errors.push(`${id}: 无权限`); continue; }
          if (['IN_PROGRESS', 'REVIEW', 'DONE'].includes(body.status) && task.dependsOn?.length) {
            const incomplete = await tx.task.count({ where: { id: { in: task.dependsOn }, status: { not: 'DONE' } } });
            if (incomplete > 0) { results.failed++; results.errors.push(`${id}: 前置任务未完成`); continue; }
          }
          await tx.task.update({ where: { id }, data: { status: body.status } });
          results.success++;
        } catch { results.failed++; }
      }
      return results;
    });
  }

  @Post('batch/delete')
  async batchDelete(@Body() body: { ids: string[] }, @Request() req) {
    const userId = req.user.sub;
    return this.prisma.$transaction(async (tx) => {
      const results = { success: 0, failed: 0 };
      for (const id of body.ids) {
        try {
          const task = await tx.task.findUnique({ where: { id }, select: { teamId: true } });
          if (!task) { results.failed++; continue; }
          const member = await tx.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
          if (!member) { results.failed++; continue; }
          await tx.task.delete({ where: { id } });
          results.success++;
        } catch { results.failed++; }
      }
      return results;
    });
  }

  @Post('batch/archive')
  async batchArchive(@Body() body: { ids: string[] }, @Request() req) {
    const userId = req.user.sub;
    return this.prisma.$transaction(async (tx) => {
      const results = { success: 0, failed: 0 };
      for (const id of body.ids) {
        try {
          const task = await tx.task.findUnique({ where: { id }, select: { teamId: true } });
          if (!task) { results.failed++; continue; }
          const member = await tx.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
          if (!member) { results.failed++; continue; }
          await tx.task.update({ where: { id }, data: { isArchived: true, archivedAt: new Date() } });
          results.success++;
        } catch { results.failed++; }
      }
      return results;
    });
  }

  @Post('batch/assign')
  async batchAssign(@Body() body: { ids: string[]; assigneeId: string }, @Request() req) {
    const userId = req.user.sub;
    return this.prisma.$transaction(async (tx) => {
      const results = { success: 0, failed: 0, errors: [] as string[] };
      for (const id of body.ids) {
        try {
          const task = await tx.task.findUnique({ where: { id }, select: { teamId: true } });
          if (!task) { results.failed++; results.errors.push(`${id}: 任务不存在`); continue; }
          const member = await tx.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: task.teamId } } });
          if (!member) { results.failed++; results.errors.push(`${id}: 无权限`); continue; }
          if (body.assigneeId) { // 验证 assignee 是否为团队成员
            const assigneeMember = await tx.teamMember.findUnique({ where: { userId_teamId: { userId: body.assigneeId, teamId: task.teamId } } });
            if (!assigneeMember) { results.failed++; results.errors.push(`${id}: 负责人不是团队成员`); continue; }
          }
          await tx.task.update({ where: { id }, data: { assigneeId: body.assigneeId } });
          results.success++;
        } catch { results.failed++; }
      }
      return results;
    });
  }
}

