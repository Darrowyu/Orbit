import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  getAll(@Request() req) { return this.notifications.getUserNotifications(req.user.sub); }

  @Get('unread-count')
  getUnreadCount(@Request() req) { return this.notifications.getUnreadCount(req.user.sub); }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) { return this.notifications.markAsRead(id, req.user.sub); }

  @Post('read-all')
  markAllAsRead(@Request() req) { return this.notifications.markAllAsRead(req.user.sub); }
}
