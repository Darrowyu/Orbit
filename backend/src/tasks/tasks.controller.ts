import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, BatchMoveDto, BatchIdsDto, BatchAssignDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from '../common/types';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasks: TasksService, private prisma: PrismaService) { }

  private async getTeamId(req: AuthenticatedRequest, teamId?: string) {
    if (teamId) { // 显式指定团队需验证成员身份
      const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId: req.user.sub, teamId } } });
      if (!member) throw new ForbiddenException('您不是该团队成员');
      return teamId;
    }
    if (!req.user.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return req.user.currentTeamId;
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
    return this.tasks.findAll(await this.getTeamId(req, teamId), { page: page ? parseInt(page, 10) : 1, limit: limit ? Math.min(parseInt(limit, 10), 100) : 100, projectId });
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

  // 批量操作（逻辑下沉 service：统一团队校验 + 单事务 + 审计 + WS 广播）
  @Post('batch/move')
  async batchMove(@Body() dto: BatchMoveDto, @Request() req) {
    return this.tasks.batchMove(dto.ids, dto.status, await this.getTeamId(req), req.user.sub);
  }

  @Post('batch/delete')
  async batchDelete(@Body() dto: BatchIdsDto, @Request() req) {
    return this.tasks.batchDelete(dto.ids, await this.getTeamId(req), req.user.sub);
  }

  @Post('batch/archive')
  async batchArchive(@Body() dto: BatchIdsDto, @Request() req) {
    return this.tasks.batchArchive(dto.ids, await this.getTeamId(req), req.user.sub);
  }

  @Post('batch/assign')
  async batchAssign(@Body() dto: BatchAssignDto, @Request() req) {
    return this.tasks.batchAssign(dto.ids, dto.assigneeId, await this.getTeamId(req), req.user.sub);
  }
}

