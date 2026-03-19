import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService, AIResponse } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamMemberInfo, TaskInfo } from './ai.types';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private ai: AiService) { }

  @Post('generate')
  generate(@Body() body: { title: string; customPrompt?: string }): Promise<AIResponse> {
    return this.ai.generateTaskDetails(body.title, body.customPrompt);
  }

  @Post('subdivide')
  async subdivide(@Body() body: { subtaskTitle: string; parentContext?: string }): Promise<{ steps: string[] }> {
    const steps = await this.ai.subdivideSubtask(body.subtaskTitle, body.parentContext);
    return { steps };
  }

  @Post('estimate-workload')
  estimateWorkload(@Body() body: { taskTitle: string; description: string; subtasks: string[] }) {
    return this.ai.estimateWorkload(body.taskTitle, body.description, body.subtasks);
  }

  @Post('recommend-assignee')
  recommendAssignee(@Body() body: { taskTitle: string; description: string; teamMembers: TeamMemberInfo[]; taskHistory: TaskInfo[] }) {
    return this.ai.recommendAssignee(body.taskTitle, body.description, body.teamMembers, body.taskHistory);
  }

  @Post('detect-risks')
  detectRisks(@Body() body: { tasks: TaskInfo[] }) {
    return this.ai.detectRisks(body.tasks);
  }
}
