import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { Request } from 'express';
import { RequestUser } from '../common/types';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private service: TemplatesService) {}

  private getTeamId(req: Request & { user: RequestUser }): string { // teamId 为空说明用户尚未加入团队
    if (!req.user.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return req.user.currentTeamId;
  }

  @Post()
  create(@Body() dto: CreateTemplateDto, @Req() req: Request & { user: RequestUser }) {
    return this.service.create(dto, this.getTeamId(req), req.user.id);
  }

  @Get()
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.service.findAll(this.getTeamId(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.service.findOne(id, this.getTeamId(req));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Req() req: Request & { user: RequestUser }) {
    return this.service.update(id, dto, this.getTeamId(req), req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.service.delete(id, this.getTeamId(req), req.user.id);
  }
}
