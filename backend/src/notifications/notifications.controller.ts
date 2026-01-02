import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export interface UpdatePreferenceDto {
  taskAssigned?: boolean;
  taskStatusChanged?: boolean;
  taskDueSoon?: boolean;
  taskOverdue?: boolean;
  newComment?: boolean;
  projectMemberAdded?: boolean;
  teamJoined?: boolean;
  browserPush?: boolean;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  getAll(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) { 
    return this.notifications.getUserNotifications(req.user.sub, Number(page) || 1, Number(limit) || 20); 
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) { return this.notifications.getUnreadCount(req.user.sub); }

  @Get('preferences')
  getPreferences(@Request() req) { return this.notifications.getPreferences(req.user.sub); }

  @Put('preferences')
  updatePreferences(@Request() req, @Body() dto: UpdatePreferenceDto) { return this.notifications.updatePreferences(req.user.sub, dto); }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) { return this.notifications.markAsRead(id, req.user.sub); }

  @Post('read-all')
  markAllAsRead(@Request() req) { return this.notifications.markAllAsRead(req.user.sub); }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) { return this.notifications.delete(id, req.user.sub); }

  @Delete()
  deleteAll(@Request() req) { return this.notifications.deleteAll(req.user.sub); }
}
