import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private service: TemplatesService) {}

  @Post()
  create(@Body() dto: any, @Req() req) {
    return this.service.create(dto, req.user.currentTeamId, req.user.id);
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user.currentTeamId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.service.findOne(id, req.user.currentTeamId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req) {
    return this.service.update(id, dto, req.user.currentTeamId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, req.user.currentTeamId);
  }
}
