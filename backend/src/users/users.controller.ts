import { Controller, Get, Post, Body, Query, UseGuards, Request, ForbiddenException, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private users: UsersService, private prisma: PrismaService) { }

  @Get('team')
  async getTeam(@Request() req, @Query('teamId') teamId?: string) {
    const tid = teamId || (await this.prisma.user.findUnique({ where: { id: req.user.sub } }))?.currentTeamId;
    if (!tid) throw new ForbiddenException('请先加入或创建团队');
    if (teamId) { // 验证用户是否属于指定团队
      const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId: req.user.id, teamId } } });
      if (!member) throw new ForbiddenException('您不是该团队成员');
    }
    return this.users.getTeamMembers(tid);
  }

  @Post('complete-onboarding')
  async completeOnboarding(@Request() req) {
    await this.users.markFirstLoginComplete(req.user.sub);
    return { success: true };
  }

  @Post('change-password')
  changePassword(@Request() req, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.users.changePassword(req.user.id, body.oldPassword, body.newPassword);
  }

  @Post('profile')
  updateProfile(@Request() req, @Body() body: { name?: string; avatar?: string; color?: string }) {
    return this.users.updateProfile(req.user.id, body);
  }

  @Get('my-teams')
  getMyTeams(@Request() req) {
    return this.users.getUserTeams(req.user.id);
  }
}
