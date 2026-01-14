import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { Request } from 'express';
import { RequestUser } from '../common/types';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private service: TemplatesService) {}

  @Post()
  create(@Body() dto: CreateTemplateDto, @Req() req: Request & { user: RequestUser }) {
    return this.service.create(dto, req.user.currentTeamId!, req.user.id);
  }

  @Get()
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.service.findAll(req.user.currentTeamId!);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.service.findOne(id, req.user.currentTeamId!);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto, @Req() req: Request & { user: RequestUser }) {
    return this.service.update(id, dto, req.user.currentTeamId!, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.service.delete(id, req.user.currentTeamId!, req.user.id);
  }
}
