import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';

@Controller('milestones')
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private service: MilestonesService) {}

  private getTeamId(req): string { // teamId 为空说明用户尚未加入团队
    if (!req.user.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return req.user.currentTeamId;
  }

  @Post()
  create(@Body() dto: CreateMilestoneDto, @Req() req) {
    return this.service.create(dto, this.getTeamId(req));
  }

  @Get()
  findByProject(@Query('projectId') projectId: string, @Req() req) {
    return this.service.findByProject(projectId, this.getTeamId(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.service.findOne(id, this.getTeamId(req));
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string, @Req() req) {
    return this.service.getProgress(id, this.getTeamId(req));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto, @Req() req) {
    return this.service.update(id, dto, this.getTeamId(req));
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, this.getTeamId(req));
  }

  @Post(':id/tasks/:taskId')
  addTask(@Param('id') id: string, @Param('taskId') taskId: string, @Req() req) {
    return this.service.addTask(id, taskId, this.getTeamId(req));
  }

  @Delete(':id/tasks/:taskId')
  removeTask(@Param('taskId') taskId: string, @Req() req) {
    return this.service.removeTask(taskId, this.getTeamId(req));
  }
}
