import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import { AIResponse, WorkloadEstimate, TeamMemberInfo, TaskInfo, AssigneeRecommendation, RiskDetection, OpenAICompatibleResponse, ParsedAITaskResponse, ParsedAISubdivideResponse } from './ai.types';

export { AIResponse };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private proxyAgent: HttpsProxyAgent<string> | null = null;

  constructor(
    private config: ConfigService,
  ) {
    this.apiKey = config.get('AI_API_KEY') || '';
    this.baseUrl = config.get('AI_BASE_URL') || 'https://api.kimi.com/coding/';
    this.model = config.get('AI_MODEL') || 'kimi-k2.5';
    const proxy = config.get('HTTPS_PROXY');
    if (proxy) this.proxyAgent = new HttpsProxyAgent(proxy);
    this.logger.log('AI Service Initialized');
  }

  async generateTaskDetails(title: string, customPrompt?: string): Promise<AIResponse> {
    const prompt = this.buildTaskPrompt(title, customPrompt);
    return this.executeWithFallback<AIResponse>(
      prompt,
      (json) => this.parseTaskResponse(json as ParsedAITaskResponse),
      this.localFallbackTaskDetails(title)
    );
  }

  private buildTaskPrompt(title: string, customPrompt?: string): string {
    const defaultPrompt = `你是一个专业的项目经理。我有一个任务标题："${title}"。请提供：1. 简洁专业的任务描述 2. 3-5个可执行的子任务 3. 推荐优先级(LOW/MEDIUM/HIGH)。必须使用简体中文回复，返回JSON格式：{"description":"...","subtasks":["..."],"priority":"..."}`;

    if (!customPrompt?.trim()) return defaultPrompt;

    return customPrompt.replace(/\{title\}/g, title) + '\n\n必须返回JSON格式：{"description":"...","subtasks":["..."],"priority":"LOW/MEDIUM/HIGH"}';
  }

  private parseTaskResponse(json: ParsedAITaskResponse): AIResponse {
    return {
      description: json.description,
      subtasks: json.subtasks,
      priority: json.priority as 'LOW' | 'MEDIUM' | 'HIGH'
    };
  }

  async subdivideSubtask(subtaskTitle: string, parentContext?: string): Promise<string[]> {
    const prompt = this.buildSubtaskPrompt(subtaskTitle, parentContext);
    return this.executeWithFallback<string[]>(
      prompt,
      (json) => (json as ParsedAISubdivideResponse).steps || ['AI正在休息，请手动添加步骤'],
      ['调研现状', '制定方案', '执行实施', '验收确认']
    );
  }

  private buildSubtaskPrompt(subtaskTitle: string, parentContext?: string): string {
    const ctx = parentContext ? `\n父任务背景：${parentContext}` : '';
    return `你是一个专业的项目经理。请将以下子任务细分为3-5个更具体的可执行步骤：\n\n子任务："${subtaskTitle}"${ctx}\n\n要求：每个步骤要具体可执行，有逻辑顺序。必须使用简体中文回复，返回JSON格式：{"steps":["步骤1","步骤2","步骤3"]}`;
  }

  async estimateWorkload(taskTitle: string, description: string, subtasks: string[]): Promise<WorkloadEstimate> {
    const prompt = `你是项目管理专家。请评估以下任务的工作量：\n任务：${taskTitle}\n描述：${description}\n子任务：${subtasks.join('、')}\n\n返回JSON：{"hours":数字,"confidence":"high/medium/low","factors":["因素1","因素2"]}`;
    return this.executeWithFallback(
      prompt,
      (json) => json as WorkloadEstimate,
      { hours: 4, confidence: 'low', factors: ['基于历史数据默认估算', 'AI服务暂时不可用'] }
    );
  }

  async recommendAssignee(taskTitle: string, description: string, teamMembers: TeamMemberInfo[], taskHistory: TaskInfo[]): Promise<AssigneeRecommendation> {
    if (!teamMembers.length) return { recommendedId: '', reason: '无成员', alternatives: [] };
    const memberInfo = teamMembers.map(m => `${m.name}(ID:${m.id},技能:${m.skills?.join('、') || '未设置'})`).join('；');
    const prompt = `你是团队管理专家。任务："${taskTitle}"\n团队成员：${memberInfo}\n推荐最佳负责人，返回JSON：{"recommendedId":"ID","reason":"理由","alternatives":[]}`;

    return this.executeWithFallback(
      prompt,
      (json) => json as AssigneeRecommendation,
      { recommendedId: teamMembers[0]?.id, reason: '轮询分配（AI服务暂不可用）', alternatives: [] }
    );
  }

  async detectRisks(tasks: TaskInfo[]): Promise<RiskDetection[]> {
    if (!tasks.length) return [];
    const taskInfo = tasks.map(t => `ID:${t.id},标题:${t.title},状态:${t.status}`).join('；');
    const prompt = `你是风险管理专家。分析任务风险：\n${taskInfo}\n返回JSON数组：[{"taskId":"ID","riskLevel":"high/medium","reasons":[],"suggestions":[]}]`;

    return this.executeWithFallback(
      prompt,
      (json) => Array.isArray(json) ? json as RiskDetection[] : [],
      []
    );
  }


  private async executeWithFallback<T>(
    prompt: string,
    parser: (json: unknown) => T,
    localFallback: T
  ): Promise<T> {
    try {
      const res = await this.callAI(prompt);
      if (res) return parser(res);
    } catch (e) {
      this.logger.warn(`AI call failed: ${e.message}`);
    }

    this.logger.log('Using Local Fallback rules.');
    return localFallback;
  }

  private async callAI(prompt: string): Promise<unknown> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/v1/messages`;
    this.logger.debug(`AI Request URL: ${url}, Model: ${this.model}`);
    const headers = {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    };
    const body = {
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    };
    const response = await this.postJSON(url, body, 20000, headers);
    const data = await response.json() as Record<string, unknown>;
    // Anthropic 响应格式: content[0].text
    const content = data?.content as Array<{type: string; text: string}> | undefined;
    return this.extractJSON(content?.[0]?.text || '');
  }

  private async postJSON(url: string, body: object, timeout: number, extraHeaders?: Record<string, string>): Promise<Response> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify(body),
      agent: this.proxyAgent,
      timeout
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`API Error: ${response.statusText} - ${errBody}`);
    }
    return response;
  }

  private readonly fallbackSubtasksMap: Record<string, string[]> = {
    '设计': ['收集参考素材', '绘制草图/原型', '视觉设计', '切图导出'],
    '开发': ['技术方案设计', '代码编写', '单元测试', '代码审查'],
    '实现': ['技术方案设计', '代码编写', '单元测试', '代码审查'],
    '测试': ['编写测试用例', '执行测试', '记录Bug', '回归测试'],
    '会议': ['准备议程', '发送邀请', '主持会议', '整理纪要'],
  };

  private localFallbackTaskDetails(title: string): AIResponse {
    const subtasks = this.findMatchingSubtasks(title);
    return {
      description: `[离线模式] 该任务 "${title}" 需要进行详细的规划和执行。请团队成员根据实际情况补充细节。`,
      subtasks,
      priority: 'MEDIUM'
    };
  }

  private findMatchingSubtasks(title: string): string[] {
    for (const [keyword, tasks] of Object.entries(this.fallbackSubtasksMap)) {
      if (title.includes(keyword)) return tasks;
    }
    return ['准备工作', '核心执行', '检查验收'];
  }

  private extractJSON(text: string): unknown {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    try {
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      throw new Error('Failed to parse JSON from AI response');
    }
  }
}
