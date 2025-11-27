import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasks: TasksService, private prisma: PrismaService) {}

  private async getTeamId(req: any, teamId?: string) {
    if (teamId) return teamId;
    const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user?.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
    return user.currentTeamId;
  }

  @Get()
  async findAll(@Request() req, @Query('teamId') teamId?: string) { return this.tasks.findAll(await this.getTeamId(req, teamId)); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.tasks.findOne(id); }

  @Post()
  async create(@Body() dto: CreateTaskDto, @Request() req) { return this.tasks.create(dto, await this.getTeamId(req), req.user.sub); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req) { return this.tasks.update(id, dto, req.user.sub); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.tasks.remove(id); }
}
