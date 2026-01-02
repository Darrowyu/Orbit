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
  async findAll(@Request() req, @Query('teamId') teamId?: string) { return this.tasks.findAll(await this.getTeamId(req, teamId)); }

  @Get('archived')
  async findArchived(@Request() req) { return this.tasks.findArchived(await this.getTeamId(req)); }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @Request() req) {
    await this.verifyTaskAccess(id, req.user.sub); // 权限验证
    return this.tasks.archive(id);
  }

  @Patch(':id/restore')
  async restore(@Param('id') id: string, @Request() req) {
    await this.verifyTaskAccess(id, req.user.sub); // 权限验证
    return this.tasks.restore(id);
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
    return this.tasks.remove(id);
  }

  // 批量操作
  @Post('batch/move')
  async batchMove(@Body() body: { ids: string[]; status: string }, @Request() req) {
    const results = await Promise.all(body.ids.map(async (id) => {
      try {
        await this.verifyTaskAccess(id, req.user.sub);
        return this.tasks.update(id, { status: body.status }, req.user.sub);
      } catch { return null; }
    }));
    return { success: results.filter(r => r !== null).length, failed: results.filter(r => r === null).length };
  }

  @Post('batch/delete')
  async batchDelete(@Body() body: { ids: string[] }, @Request() req) {
    const results = await Promise.all(body.ids.map(async (id) => {
      try {
        await this.verifyTaskAccess(id, req.user.sub);
        await this.tasks.remove(id);
        return true;
      } catch { return false; }
    }));
    return { success: results.filter(r => r).length, failed: results.filter(r => !r).length };
  }

  @Post('batch/archive')
  async batchArchive(@Body() body: { ids: string[] }, @Request() req) {
    const results = await Promise.all(body.ids.map(async (id) => {
      try {
        await this.verifyTaskAccess(id, req.user.sub);
        return this.tasks.archive(id);
      } catch { return null; }
    }));
    return { success: results.filter(r => r !== null).length, failed: results.filter(r => r === null).length };
  }

  @Post('batch/assign')
  async batchAssign(@Body() body: { ids: string[]; assigneeId: string }, @Request() req) {
    const results = await Promise.all(body.ids.map(async (id) => {
      try {
        await this.verifyTaskAccess(id, req.user.sub);
        return this.tasks.update(id, { assigneeId: body.assigneeId }, req.user.sub);
      } catch { return null; }
    }));
    return { success: results.filter(r => r !== null).length, failed: results.filter(r => r === null).length };
  }
}

