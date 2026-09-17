import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LabelsService } from './labels.service';
import { CreateLabelDto, UpdateLabelDto } from './dto/label.dto';

@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private service: LabelsService) {}

  private getTeamId(req): string { // teamId 为空说明用户尚未加入团队
    if (!req.user.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return req.user.currentTeamId;
  }

  @Post()
  create(@Req() req, @Body() dto: CreateLabelDto) {
    return this.service.create(this.getTeamId(req), dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(this.getTeamId(req));
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateLabelDto) {
    return this.service.update(id, this.getTeamId(req), dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, this.getTeamId(req));
  }

  @Post('task/:taskId/:labelId')
  addToTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string, @Req() req) {
    return this.service.addToTask(taskId, labelId, this.getTeamId(req));
  }

  @Delete('task/:taskId/:labelId')
  removeFromTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string, @Req() req) {
    return this.service.removeFromTask(taskId, labelId, this.getTeamId(req));
  }

  @Get('task/:taskId')
  getTaskLabels(@Param('taskId') taskId: string, @Req() req) {
    return this.service.getTaskLabels(taskId, this.getTeamId(req));
  }

  @Put('task/:taskId')
  setTaskLabels(@Param('taskId') taskId: string, @Body() body: { labelIds: string[] }, @Req() req) {
    return this.service.setTaskLabels(taskId, body.labelIds || [], this.getTeamId(req));
  }
}
