import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, JoinTeamDto, UpdateMemberRoleDto } from './dto/team.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teams: TeamsService) {}

  @Post()
  create(@Body() dto: CreateTeamDto, @Request() req) { return this.teams.create(dto, req.user.sub); }

  @Post('join/code')
  joinByCode(@Body() dto: JoinTeamDto, @Request() req) { return this.teams.joinByCode(dto, req.user.sub); }

  @Post('join/link/:inviteLink')
  joinByLink(@Param('inviteLink') inviteLink: string, @Request() req) { return this.teams.joinByLink(inviteLink, req.user.sub); }

  @Get('my')
  getMyTeams(@Request() req) { return this.teams.getUserTeams(req.user.sub); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.teams.findOne(id); }

  @Post(':id/switch')
  switchTeam(@Param('id') id: string, @Request() req) { return this.teams.switchTeam(id, req.user.sub); }

  @Patch(':id/members/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateMemberRoleDto, @Request() req) { return this.teams.updateMemberRole(id, dto, req.user.sub); }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) { return this.teams.removeMember(id, memberId, req.user.sub); }

  @Post(':id/regenerate-code')
  regenerateCode(@Param('id') id: string, @Request() req) { return this.teams.regenerateCode(id, req.user.sub); }
}
