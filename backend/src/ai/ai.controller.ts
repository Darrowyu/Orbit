import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService, AIResponse } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private ai: AiService) {}

  @Post('generate')
  generate(@Body('title') title: string): Promise<AIResponse> { return this.ai.generateTaskDetails(title); }

  @Post('subdivide')
  async subdivide(@Body() body: { subtaskTitle: string; parentContext?: string }): Promise<{ steps: string[] }> {
    const steps = await this.ai.subdivideSubtask(body.subtaskTitle, body.parentContext);
    return { steps };
  }
}
