import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';
import { AuthenticatedRequest } from '../common/types';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() { return this.adminService.getStats(); }

  @Get('users')
  getUsers(@Query() query: { page?: string; limit?: string; search?: string; status?: string }) {
    return this.adminService.getUsers({ page: Number(query.page) || 1, limit: Number(query.limit) || 20, search: query.search, status: query.status });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) { return this.adminService.getUser(id); }

  @Post('users/:id/toggle-status')
  toggleStatus(@Param('id') id: string, @Request() req: AuthenticatedRequest) { return this.adminService.toggleUserStatus(id, req.user.id); }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) { return this.adminService.resetPassword(id, body.password); }

  @Post('users/:id/set-admin')
  setAdmin(@Param('id') id: string, @Query('value') value: string, @Request() req: AuthenticatedRequest) { return this.adminService.setSuperAdmin(id, value === 'true', req.user.id); }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Request() req: AuthenticatedRequest) { return this.adminService.deleteUser(id, req.user.id); }

  @Get('login-logs')
  getLoginLogs(@Query() query: { userId?: string; page?: string; limit?: string }) {
    return this.adminService.getLoginLogs(query.userId, Number(query.page) || 1, Number(query.limit) || 50);
  }

  @Get('stats/trends')
  getTrends(@Query('days') days?: string) { return this.adminService.getTrends(Number(days) || 7); }

  @Get('stats/health')
  getHealthIndicators() { return this.adminService.getHealthIndicators(); }

  @Get('teams')
  getTeams(@Query() query: { page?: string; limit?: string; search?: string; sort?: string }) {
    return this.adminService.getTeams({ page: Number(query.page) || 1, limit: Number(query.limit) || 20, search: query.search, sort: query.sort });
  }

  @Get('teams/:id')
  getTeamDetail(@Param('id') id: string) { return this.adminService.getTeamDetail(id); }

  @Post('teams/:id/transfer-ownership')
  transferOwnership(@Param('id') id: string, @Body() body: { newOwnerId: string }) { return this.adminService.transferTeamOwnership(id, body.newOwnerId); }

  @Delete('teams/:id')
  dissolveTeam(@Param('id') id: string) { return this.adminService.dissolveTeam(id); }

  @Get('projects')
  getProjects(@Query() query: { page?: string; limit?: string; status?: string; teamId?: string; search?: string }) {
    return this.adminService.getProjects({ page: Number(query.page) || 1, limit: Number(query.limit) || 20, status: query.status, teamId: query.teamId, search: query.search });
  }

  @Get('projects/:id')
  getProjectDetail(@Param('id') id: string) { return this.adminService.getProjectDetail(id); }

  @Post('projects/:id/archive')
  archiveProject(@Param('id') id: string) { return this.adminService.archiveProject(id); }

  @Post('projects/:id/restore')
  restoreProject(@Param('id') id: string) { return this.adminService.restoreProject(id); }

  @Delete('projects/:id')
  deleteProject(@Param('id') id: string) { return this.adminService.deleteProject(id); }

  @Get('tasks/overdue')
  getOverdueTasks(@Query() query: { page?: string; limit?: string }) {
    return this.adminService.getOverdueTasks(Number(query.page) || 1, Number(query.limit) || 20);
  }

  @Get('tasks/stats')
  getTaskStats() { return this.adminService.getTaskStats(); }

  @Post('tasks/batch-archive')
  batchArchiveTasks(@Body() body: { taskIds: string[] }) { return this.adminService.batchArchiveTasks(body.taskIds); }

  @Get('audit-logs')
  getAuditLogs(@Query() query: { page?: string; limit?: string; startDate?: string; endDate?: string; action?: string; entityType?: string; userId?: string }) {
    return this.adminService.getAuditLogs({ page: Number(query.page) || 1, limit: Number(query.limit) || 50, startDate: query.startDate, endDate: query.endDate, action: query.action, entityType: query.entityType, userId: query.userId });
  }

  @Get('settings')
  getSettings() { return this.adminService.getSettings(); }

  @Post('settings')
  updateSetting(@Body() body: { key: string; value: string }) { return this.adminService.updateSetting(body.key, body.value); }

  @Get('storage/stats')
  getStorageStats() { return this.adminService.getStorageStats(); }
}
