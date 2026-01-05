import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimeEntriesService } from './time-entries.service';

@Controller('time-entries')
@UseGuards(JwtAuthGuard)
export class TimeEntriesController {
  constructor(private service: TimeEntriesService) {}

  @Post('start/:taskId')
  start(@Param('taskId') taskId: string, @Body() body: { description?: string }, @Req() req) {
    return this.service.start(taskId, req.user.id, req.user.currentTeamId, body.description);
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
    return this.service.getByTask(taskId, req.user.currentTeamId);
  }

  @Get('task/:taskId/total')
  getTotalByTask(@Param('taskId') taskId: string, @Req() req) {
    return this.service.getTotalByTask(taskId, req.user.currentTeamId);
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
