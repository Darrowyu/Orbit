import { Controller, Get, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}

  private getTeamId(req): string { // teamId 为空说明用户尚未加入团队
    if (!req.user.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return req.user.currentTeamId;
  }

  @Get('burndown')
  getBurndown(@Req() req, @Query('projectId') projectId: string, @Query('start') start: string, @Query('end') end: string) {
    return this.service.getBurndownData(projectId, this.getTeamId(req), new Date(start), new Date(end));
  }

  @Get('cumulative-flow')
  getCumulativeFlow(@Req() req, @Query('projectId') projectId: string, @Query('start') start: string, @Query('end') end: string) {
    return this.service.getCumulativeFlowData(projectId, this.getTeamId(req), new Date(start), new Date(end));
  }

  @Get('team-workload')
  getTeamWorkload(@Req() req) {
    return this.service.getTeamWorkload(this.getTeamId(req));
  }

  @Get('project-stats')
  getProjectStats(@Req() req, @Query('projectId') projectId: string) {
    return this.service.getProjectStats(projectId, this.getTeamId(req));
  }

  @Get('time')
  getTimeReport(@Req() req, @Query('start') start?: string, @Query('end') end?: string) {
    return this.service.getTimeReport(this.getTeamId(req), start ? new Date(start) : undefined, end ? new Date(end) : undefined);
  }
}
