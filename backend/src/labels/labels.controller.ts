import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LabelsService } from './labels.service';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private service: LabelsService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateLabelDto) {
    return this.service.create(req.user.currentTeamId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user.currentTeamId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateLabelDto) {
    return this.service.update(id, req.user.currentTeamId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, req.user.currentTeamId);
  }

  @Post('task/:taskId/:labelId')
  addToTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string, @Req() req) {
    return this.service.addToTask(taskId, labelId, req.user.currentTeamId);
  }

  @Delete('task/:taskId/:labelId')
  removeFromTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string, @Req() req) {
    return this.service.removeFromTask(taskId, labelId, req.user.currentTeamId);
  }

  @Get('task/:taskId')
  getTaskLabels(@Param('taskId') taskId: string, @Req() req) {
    return this.service.getTaskLabels(taskId, req.user.currentTeamId);
  }

  @Put('task/:taskId')
  setTaskLabels(@Param('taskId') taskId: string, @Body() body: { labelIds: string[] }, @Req() req) {
    return this.service.setTaskLabels(taskId, body.labelIds || [], req.user.currentTeamId);
  }
}
