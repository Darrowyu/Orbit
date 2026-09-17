import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeEntriesService } from './time-entries.service';

@Controller('time-entries')
@UseGuards(JwtAuthGuard)
export class TimeEntriesController {
  constructor(private service: TimeEntriesService) {}

  private getTeamId(req): string { // teamId 为空说明用户尚未加入团队
    if (!req.user.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return req.user.currentTeamId;
  }

  @Post('start/:taskId')
  start(@Param('taskId') taskId: string, @Body() body: { description?: string }, @Req() req) {
    return this.service.start(taskId, req.user.id, this.getTeamId(req), body.description);
  }

  @Post('stop/:id')
  stop(@Param('id') id: string, @Req() req) {
    return this.service.stop(id, req.user.id);
  }

  @Get('running')
  getRunning(@Req() req) {
    return this.service.getRunning(req.user.id);
  }

  @Get('task/:taskId')
  getByTask(@Param('taskId') taskId: string, @Req() req) {
    return this.service.getByTask(taskId, this.getTeamId(req));
  }

  @Get('task/:taskId/total')
  getTotalByTask(@Param('taskId') taskId: string, @Req() req) {
    return this.service.getTotalByTask(taskId, this.getTeamId(req));
  }

  @Get('my')
  getByUser(@Req() req, @Query('start') start?: string, @Query('end') end?: string) {
    return this.service.getByUser(req.user.id, start ? new Date(start) : undefined, end ? new Date(end) : undefined);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { description?: string; duration?: number }, @Req() req) {
    return this.service.update(id, req.user.id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, req.user.id);
  }
}
