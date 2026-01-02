import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';

@Controller('milestones')
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private service: MilestonesService) {}

  @Post()
  create(@Body() dto: CreateMilestoneDto, @Req() req) {
    return this.service.create(dto, req.user.currentTeamId);
  }

  @Get()
  findByProject(@Query('projectId') projectId: string, @Req() req) {
    return this.service.findByProject(projectId, req.user.currentTeamId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.service.findOne(id, req.user.currentTeamId);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string, @Req() req) {
    return this.service.getProgress(id, req.user.currentTeamId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto, @Req() req) {
    return this.service.update(id, dto, req.user.currentTeamId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, req.user.currentTeamId);
  }

  @Post(':id/tasks/:taskId')
  addTask(@Param('id') id: string, @Param('taskId') taskId: string, @Req() req) {
    return this.service.addTask(id, taskId, req.user.currentTeamId);
  }

  @Delete(':id/tasks/:taskId')
  removeTask(@Param('taskId') taskId: string, @Req() req) {
    return this.service.removeTask(taskId, req.user.currentTeamId);
  }
}
