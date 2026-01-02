import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('burndown')
  getBurndown(@Req() req, @Query('projectId') projectId: string, @Query('start') start: string, @Query('end') end: string) {
    return this.service.getBurndownData(projectId, req.user.currentTeamId, new Date(start), new Date(end));
  }

  @Get('cumulative-flow')
  getCumulativeFlow(@Req() req, @Query('projectId') projectId: string, @Query('start') start: string, @Query('end') end: string) {
    return this.service.getCumulativeFlowData(projectId, req.user.currentTeamId, new Date(start), new Date(end));
  }

  @Get('team-workload')
  getTeamWorkload(@Req() req) {
    return this.service.getTeamWorkload(req.user.currentTeamId);
  }

  @Get('project-stats')
  getProjectStats(@Req() req, @Query('projectId') projectId: string) {
    return this.service.getProjectStats(projectId, req.user.currentTeamId);
  }

  @Get('time')
  getTimeReport(@Req() req, @Query('start') start?: string, @Query('end') end?: string) {
    return this.service.getTimeReport(req.user.currentTeamId, start ? new Date(start) : undefined, end ? new Date(end) : undefined);
  }
}
