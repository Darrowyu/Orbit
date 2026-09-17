import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';
import { Request } from 'express';
import { RequestUser } from '../common/types';

@Controller('recurring')
@UseGuards(JwtAuthGuard)
export class RecurringController {
  constructor(private service: RecurringService) {}

  private getTeamId(req: Request & { user: RequestUser }): string { // teamId 为空说明用户尚未加入团队
    if (!req.user.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return req.user.currentTeamId;
  }

  @Post()
  create(@Body() dto: CreateRecurringDto, @Req() req: Request & { user: RequestUser }) {
    return this.service.create(dto, this.getTeamId(req), req.user.id);
  }

  @Get()
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.service.findAll(this.getTeamId(req));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecurringDto, @Req() req: Request & { user: RequestUser }) {
    return this.service.update(id, dto, this.getTeamId(req));
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.service.delete(id, this.getTeamId(req));
  }
}
