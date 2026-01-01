import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CommentsService, CommentDto } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private comments: CommentsService) {}

  @Get()
  findAll(@Param('taskId') taskId: string) {
    return this.comments.findByTask(taskId);
  }

  @Post()
  create(@Param('taskId') taskId: string, @Request() req: { user: { sub: string } }, @Body() dto: CommentDto) {
    return this.comments.create(taskId, req.user.sub, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req: { user: { sub: string } }, @Body() dto: CommentDto) {
    return this.comments.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.comments.delete(id, req.user.sub);
  }
}
