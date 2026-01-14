import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';
import { Request } from 'express';
import { RequestUser } from '../common/types';

@Controller('recurring')
@UseGuards(JwtAuthGuard)
export class RecurringController {
  constructor(private service: RecurringService) {}

  @Post()
  create(@Body() dto: CreateRecurringDto, @Req() req: Request & { user: RequestUser }) {
    return this.service.create(dto, req.user.currentTeamId!, req.user.id);
  }

  @Get()
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.service.findAll(req.user.currentTeamId!);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecurringDto, @Req() req: Request & { user: RequestUser }) {
    return this.service.update(id, dto, req.user.currentTeamId!);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request & { user: RequestUser }) {
    return this.service.delete(id, req.user.currentTeamId!);
  }
}
