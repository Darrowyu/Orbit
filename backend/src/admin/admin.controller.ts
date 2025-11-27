import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';

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
  toggleStatus(@Param('id') id: string, @Request() req: any) { return this.adminService.toggleUserStatus(id, req.user.id); }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) { return this.adminService.resetPassword(id, body.password); }

  @Post('users/:id/set-admin')
  setAdmin(@Param('id') id: string, @Query('value') value: string, @Request() req: any) { return this.adminService.setSuperAdmin(id, value === 'true', req.user.id); }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Request() req: any) { return this.adminService.deleteUser(id, req.user.id); }

  @Get('login-logs')
  getLoginLogs(@Query() query: { userId?: string; page?: string; limit?: string }) {
    return this.adminService.getLoginLogs(query.userId, Number(query.page) || 1, Number(query.limit) || 50);
  }
}
