import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoUtil } from '../common/crypto.util';
import { AIResponse, WorkloadEstimate, TeamMemberInfo, TaskInfo, AssigneeRecommendation, RiskDetection, OpenAICompatibleResponse, ParsedAITaskResponse, ParsedAISubdivideResponse } from './ai.types';

export { AIResponse };

// 单次 AI 调用使用的配置：系统级走 Anthropic 格式，用户级走 OpenAI 兼容格式
interface AiCallConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  format: 'anthropic' | 'openai';
  prompt?: string | null;
}

// 各厂商 OpenAI 兼容接口的默认接入点与模型
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  moonshot: { baseUrl: 'https://api.moonshot.cn', model: 'moonshot-v1-8k' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  custom: { baseUrl: '', model: '' },
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private proxyAgent: HttpsProxyAgent<string> | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = config.get('AI_API_KEY') || '';
    this.baseUrl = config.get('AI_BASE_URL') || 'https://api.kimi.com/coding/';
    this.model = config.get('AI_MODEL') || 'kimi-k2.5';
    const proxy = config.get('HTTPS_PROXY');
    if (proxy) this.proxyAgent = new HttpsProxyAgent(proxy);
    this.logger.log('AI Service Initialized');
  }

  // 解析本次调用使用的配置：用户已配置（有 aiApiKey 或 aiBaseUrl）则优先用户配置，否则回退系统环境变量
  private async resolveConfig(userId?: string): Promise<AiCallConfig> {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { aiProvider: true, aiApiKey: true, aiBaseUrl: true, aiModelName: true, aiPrompt: true },
      });
      if (user && (user.aiApiKey || user.aiBaseUrl)) {
        let apiKey = '';
        if (user.aiApiKey) {
          try {
            apiKey = CryptoUtil.decrypt(user.aiApiKey);
          } catch {
            this.logger.warn(`用户 ${userId} 的 AI Key 解密失败，回退系统配置`); // 不输出密文内容
            return this.systemConfig();
          }
        }
        const defaults = PROVIDER_DEFAULTS[user.aiProvider || 'custom'] || PROVIDER_DEFAULTS.custom;
        const baseUrl = user.aiBaseUrl || defaults.baseUrl;
        if (apiKey && baseUrl) {
          return { apiKey, baseUrl, model: user.aiModelName || defaults.model || this.model, format: 'openai', prompt: user.aiPrompt };
        }
      }
    }
    return this.systemConfig();
  }

  private systemConfig(): AiCallConfig {
    return { apiKey: this.apiKey, baseUrl: this.baseUrl, model: this.model, format: 'anthropic' };
  }

  async generateTaskDetails(title: string, customPrompt?: string, userId?: string): Promise<AIResponse> {
    const config = await this.resolveConfig(userId);
    const prompt = this.buildTaskPrompt(title, customPrompt || config.prompt || undefined);
    return this.executeWithFallback<AIResponse>(
      prompt,
      (json) => this.parseTaskResponse(json as ParsedAITaskResponse),
      this.localFallbackTaskDetails(title),
      config
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

  async subdivideSubtask(subtaskTitle: string, parentContext?: string, userId?: string): Promise<string[]> {
    const config = await this.resolveConfig(userId);
    const prompt = this.buildSubtaskPrompt(subtaskTitle, parentContext);
    return this.executeWithFallback<string[]>(
      prompt,
      (json) => (json as ParsedAISubdivideResponse).steps || ['AI正在休息，请手动添加步骤'],
      ['调研现状', '制定方案', '执行实施', '验收确认'],
      config
    );
  }

  private buildSubtaskPrompt(subtaskTitle: string, parentContext?: string): string {
    const ctx = parentContext ? `\n父任务背景：${parentContext}` : '';
    return `你是一个专业的项目经理。请将以下子任务细分为3-5个更具体的可执行步骤：\n\n子任务："${subtaskTitle}"${ctx}\n\n要求：每个步骤要具体可执行，有逻辑顺序。必须使用简体中文回复，返回JSON格式：{"steps":["步骤1","步骤2","步骤3"]}`;
  }

  async estimateWorkload(taskTitle: string, description: string, subtasks: string[], userId?: string): Promise<WorkloadEstimate> {
    const config = await this.resolveConfig(userId);
    const prompt = `你是项目管理专家。请评估以下任务的工作量：\n任务：${taskTitle}\n描述：${description}\n子任务：${subtasks.join('、')}\n\n返回JSON：{"hours":数字,"confidence":"high/medium/low","factors":["因素1","因素2"]}`;
    return this.executeWithFallback(
      prompt,
      (json) => json as WorkloadEstimate,
      { hours: 4, confidence: 'low', factors: ['基于历史数据默认估算', 'AI服务暂时不可用'] },
      config
    );
  }

  async recommendAssignee(taskTitle: string, description: string, teamMembers: TeamMemberInfo[], taskHistory: TaskInfo[], userId?: string): Promise<AssigneeRecommendation> {
    if (!teamMembers.length) return { recommendedId: '', reason: '无成员', alternatives: [] };
    const config = await this.resolveConfig(userId);
    const memberInfo = teamMembers.map(m => `${m.name}(ID:${m.id},技能:${m.skills?.join('、') || '未设置'})`).join('；');
    const prompt = `你是团队管理专家。任务："${taskTitle}"\n团队成员：${memberInfo}\n推荐最佳负责人，返回JSON：{"recommendedId":"ID","reason":"理由","alternatives":[]}`;

    return this.executeWithFallback(
      prompt,
      (json) => json as AssigneeRecommendation,
      { recommendedId: teamMembers[0]?.id, reason: '轮询分配（AI服务暂不可用）', alternatives: [] },
      config
    );
  }

  async detectRisks(tasks: TaskInfo[], userId?: string): Promise<RiskDetection[]> {
    if (!tasks.length) return [];
    const config = await this.resolveConfig(userId);
    const taskInfo = tasks.map(t => `ID:${t.id},标题:${t.title},状态:${t.status}`).join('；');
    const prompt = `你是风险管理专家。分析任务风险：\n${taskInfo}\n返回JSON数组：[{"taskId":"ID","riskLevel":"high/medium","reasons":[],"suggestions":[]}]`;

    return this.executeWithFallback(
      prompt,
      (json) => Array.isArray(json) ? json as RiskDetection[] : [],
      [],
      config
    );
  }


  private async executeWithFallback<T>(
    prompt: string,
    parser: (json: unknown) => T,
    localFallback: T,
    config: AiCallConfig
  ): Promise<T> {
    try {
      const res = await this.callAI(prompt, config);
      if (res) return parser(res);
    } catch (e) {
      this.logger.warn(`AI call failed: ${e instanceof Error ? e.message : 'unknown error'}`); // message 已脱敏截断
    }

    this.logger.log('Using Local Fallback rules.');
    return localFallback;
  }

  private async callAI(prompt: string, config: AiCallConfig): Promise<unknown> {
    return config.format === 'openai' ? this.callOpenAICompatible(prompt, config) : this.callAnthropic(prompt, config);
  }

  private async callAnthropic(prompt: string, config: AiCallConfig): Promise<unknown> {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/v1/messages`;
    this.logger.debug(`AI Request URL: ${url}, Model: ${config.model}`); // 不记录请求头与 Key
    const headers = {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    };
    const body = {
      model: config.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    };
    const response = await this.postJSON(url, body, 20000, headers);
    const data = await response.json() as Record<string, unknown>;
    // Anthropic 响应格式: content[0].text
    const content = data?.content as Array<{type: string; text: string}> | undefined;
    return this.extractJSON(content?.[0]?.text || '');
  }

  private async callOpenAICompatible(prompt: string, config: AiCallConfig): Promise<unknown> {
    let base = config.baseUrl.replace(/\/+$/, '');
    if (!/\/v\d+$/.test(base)) base = `${base}/v1`; // 未带版本路径时补 /v1
    const url = `${base}/chat/completions`;
    this.logger.debug(`AI Request URL: ${url}, Model: ${config.model}`); // 不记录请求头与 Key
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };
    const body = {
      model: config.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    };
    const response = await this.postJSON(url, body, 20000, headers);
    const data = await response.json() as OpenAICompatibleResponse;
    return this.extractJSON(data.choices?.[0]?.message?.content || '');
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
      // 上游响应体截断到 200 字符，避免把敏感内容写入日志
      const errBody = (await response.text().catch(() => '')).slice(0, 200);
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
