import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { AiService, AIResponse } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamMemberInfo, TaskInfo } from './ai.types';

interface RateLimitRecord { count: number; resetTime: number }

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly windowMs = 60000; // 1 分钟窗口
  private readonly maxRequests = 10; // 每用户每分钟 10 次
  private readonly rateLimitStore = new Map<string, RateLimitRecord>();

  constructor(private ai: AiService) {
    setInterval(() => this.cleanupRateLimit(), this.windowMs); // 定期清理过期记录
  }

  // 按用户 ID 限流，超限抛 429
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const record = this.rateLimitStore.get(userId);
    if (!record || now > record.resetTime) {
      this.rateLimitStore.set(userId, { count: 1, resetTime: now + this.windowMs });
      return;
    }
    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: `AI 请求过于频繁，请 ${retryAfter} 秒后重试`, error: 'Too Many Requests' },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    record.count++;
  }

  private cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now > record.resetTime) this.rateLimitStore.delete(key);
    }
  }

  @Post('generate')
  generate(@Request() req, @Body() body: { title: string; customPrompt?: string }): Promise<AIResponse> {
    this.checkRateLimit(req.user.id);
    return this.ai.generateTaskDetails(body.title, body.customPrompt, req.user.id);
  }

  @Post('subdivide')
  async subdivide(@Request() req, @Body() body: { subtaskTitle: string; parentContext?: string }): Promise<{ steps: string[] }> {
    this.checkRateLimit(req.user.id);
    const steps = await this.ai.subdivideSubtask(body.subtaskTitle, body.parentContext, req.user.id);
    return { steps };
  }

  @Post('estimate-workload')
  estimateWorkload(@Request() req, @Body() body: { taskTitle: string; description: string; subtasks: string[] }) {
    this.checkRateLimit(req.user.id);
    return this.ai.estimateWorkload(body.taskTitle, body.description, body.subtasks, req.user.id);
  }

  @Post('recommend-assignee')
  recommendAssignee(@Request() req, @Body() body: { taskTitle: string; description: string; teamMembers: TeamMemberInfo[]; taskHistory: TaskInfo[] }) {
    this.checkRateLimit(req.user.id);
    return this.ai.recommendAssignee(body.taskTitle, body.description, body.teamMembers, body.taskHistory, req.user.id);
  }

  @Post('detect-risks')
  detectRisks(@Request() req, @Body() body: { tasks: TaskInfo[] }) {
    this.checkRateLimit(req.user.id);
    return this.ai.detectRisks(body.tasks, req.user.id);
  }
}
