import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AiService, AIResponse } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private ai: AiService) { }

  @Post('generate')
  generate(@Request() req, @Body() body: { title: string; customPrompt?: string }): Promise<AIResponse> {
    return this.ai.generateTaskDetails(body.title, body.customPrompt, req.user.sub);
  }

  @Post('subdivide')
  async subdivide(@Request() req, @Body() body: { subtaskTitle: string; parentContext?: string }): Promise<{ steps: string[] }> {
    const steps = await this.ai.subdivideSubtask(body.subtaskTitle, body.parentContext, req.user.sub);
    return { steps };
  }

  @Post('estimate-workload')
  estimateWorkload(@Request() req, @Body() body: { taskTitle: string; description: string; subtasks: string[] }) {
    return this.ai.estimateWorkload(body.taskTitle, body.description, body.subtasks, req.user.sub);
  }

  @Post('recommend-assignee')
  recommendAssignee(@Request() req, @Body() body: { taskTitle: string; description: string; teamMembers: any[]; taskHistory: any[] }) {
    return this.ai.recommendAssignee(body.taskTitle, body.description, body.teamMembers, body.taskHistory, req.user.sub);
  }

  @Post('detect-risks')
  detectRisks(@Request() req, @Body() body: { tasks: any[] }) {
    return this.ai.detectRisks(body.tasks, req.user.sub);
  }
}

