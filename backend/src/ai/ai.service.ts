import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoUtil } from '../common/crypto.util';
import { AIResponse, UserAiConfig, WorkloadEstimate, TeamMemberInfo, TaskInfo, AssigneeRecommendation, RiskDetection, GeminiResponse, OpenAICompatibleResponse, ParsedAITaskResponse, ParsedAISubdivideResponse } from './ai.types';

export { AIResponse, UserAiConfig };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // 系统级默认配置
  private sysGeminiKey: string;
  private sysBackupKey: string;
  private sysBackupBaseUrl: string;
  private proxyAgent: HttpsProxyAgent<string> | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService // 注入Prisma以读取用户配置
  ) {
    // 系统级Gemini配置
    this.sysGeminiKey = this.config.get('GEMINI_API_KEY') || '';
    const proxy = this.config.get('HTTPS_PROXY');
    if (proxy) this.proxyAgent = new HttpsProxyAgent(proxy);

    // 系统级备用配置
    this.sysBackupKey = this.config.get('AI_API_KEY_BACKUP') || '';
    this.sysBackupBaseUrl = this.config.get('AI_BASE_URL_BACKUP') || 'https://api.deepseek.com/v1';

    this.logger.log('AI Service Initialized.');
  }

  // 获取用户的AI配置（如果有）- 自动解密 API Key
  async getUserAiConfig(userId: string): Promise<UserAiConfig | null> {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.aiApiKey) return null;
    return {
      aiProvider: user.aiProvider,
      aiApiKey: CryptoUtil.decrypt(user.aiApiKey), // 解密
      aiBaseUrl: user.aiBaseUrl,
      aiModelName: user.aiModelName,
    };
  }


  // =========================================================================================
  // 公共入口方法 - 包含自动降级逻辑
  // =========================================================================================

  async generateTaskDetails(title: string, customPrompt?: string, userId?: string): Promise<AIResponse> {
    const userConfig = userId ? await this.getUserAiConfig(userId) : null;

    const defaultPrompt = `你是一个专业的项目经理。我有一个任务标题："${title}"。请提供：1. 简洁专业的任务描述 2. 3-5个可执行的子任务 3. 推荐优先级(LOW/MEDIUM/HIGH)。必须使用简体中文回复，返回JSON格式：{"description":"...","subtasks":["..."],"priority":"..."}`;
    const prompt = customPrompt && customPrompt.trim()
      ? customPrompt.replace(/\{title\}/g, title) + '\n\n必须返回JSON格式：{"description":"...","subtasks":["..."],"priority":"LOW/MEDIUM/HIGH"}'
      : defaultPrompt;

    return this.executeWithFallback<AIResponse>(
      prompt,
      (json) => { const j = json as ParsedAITaskResponse; return { description: j.description, subtasks: j.subtasks, priority: j.priority as 'LOW' | 'MEDIUM' | 'HIGH' }; },
      this.localFallbackTaskDetails(title),
      userConfig
    );
  }

  async subdivideSubtask(subtaskTitle: string, parentContext?: string, userId?: string): Promise<string[]> {
    const userConfig = userId ? await this.getUserAiConfig(userId) : null;

    const ctx = parentContext ? `\n父任务背景：${parentContext}` : '';
    const prompt = `你是一个专业的项目经理。请将以下子任务细分为3-5个更具体的可执行步骤：\n\n子任务："${subtaskTitle}"${ctx}\n\n要求：每个步骤要具体可执行，有逻辑顺序。必须使用简体中文回复，返回JSON格式：{"steps":["步骤1","步骤2","步骤3"]}`;

    return this.executeWithFallback<string[]>(
      prompt,
      (json) => (json as ParsedAISubdivideResponse).steps || ['AI正在休息，请手动添加步骤'],
      ['调研现状', '制定方案', '执行实施', '验收确认'],
      userConfig
    );
  }

  async estimateWorkload(taskTitle: string, description: string, subtasks: string[], userId?: string): Promise<WorkloadEstimate> {
    const userConfig = userId ? await this.getUserAiConfig(userId) : null;

    const prompt = `你是项目管理专家。请评估以下任务的工作量：\n任务：${taskTitle}\n描述：${description}\n子任务：${subtasks.join('、')}\n\n返回JSON：{"hours":数字,"confidence":"high/medium/low","factors":["因素1","因素2"]}`;
    return this.executeWithFallback(
      prompt,
      (json) => json as WorkloadEstimate,
      { hours: 4, confidence: 'low', factors: ['基于历史数据默认估算', 'AI服务暂时不可用'] },
      userConfig
    );
  }

  async recommendAssignee(taskTitle: string, description: string, teamMembers: TeamMemberInfo[], taskHistory: TaskInfo[], userId?: string): Promise<AssigneeRecommendation> {
    if (!teamMembers.length) return { recommendedId: '', reason: '无成员', alternatives: [] };
    const userConfig = userId ? await this.getUserAiConfig(userId) : null;

    const memberInfo = teamMembers.map(m => `${m.name}(ID:${m.id},技能:${m.skills?.join('、') || '未设置'})`).join('；');
    const prompt = `你是团队管理专家。任务："${taskTitle}"\n团队成员：${memberInfo}\n推荐最佳负责人，返回JSON：{"recommendedId":"ID","reason":"理由","alternatives":[]}`;

    return this.executeWithFallback(
      prompt,
      (json) => json as AssigneeRecommendation,
      { recommendedId: teamMembers[0]?.id, reason: '轮询分配（AI服务暂不可用）', alternatives: [] },
      userConfig
    );
  }

  async detectRisks(tasks: TaskInfo[], userId?: string): Promise<RiskDetection[]> {
    if (!tasks.length) return [];
    const userConfig = userId ? await this.getUserAiConfig(userId) : null;

    const taskInfo = tasks.map(t => `ID:${t.id},标题:${t.title},状态:${t.status}`).join('；');
    const prompt = `你是风险管理专家。分析任务风险：\n${taskInfo}\n返回JSON数组：[{"taskId":"ID","riskLevel":"high/medium","reasons":[],"suggestions":[]}]`;

    return this.executeWithFallback(
      prompt,
      (json) => Array.isArray(json) ? json as RiskDetection[] : [],
      [],
      userConfig
    );
  }


  // =========================================================================================
  // 核心引擎：多级重试与降级 (支持用户配置)
  // =========================================================================================

  private async executeWithFallback<T>(
    prompt: string,
    parser: (json: unknown) => T,
    localFallback: T,
    userConfig?: UserAiConfig | null // 用户自定义配置
  ): Promise<T> {

    // 优先使用用户自定义配置
    if (userConfig && userConfig.aiApiKey) {
      try {
        const res = await this.callWithUserConfig(prompt, userConfig);
        return parser(res);
      } catch (e) {
        this.logger.warn(`User AI Config failed: ${e.message}. Falling back to system default...`);
      }
    }

    // 系统默认 Level 1: Gemini
    if (this.sysGeminiKey) {
      try {
        const res = await this.callGemini(prompt, this.sysGeminiKey);
        return parser(res);
      } catch (e) {
        this.logger.warn(`System Gemini failed: ${e.message}. Trying backup...`);
      }
    }

    // 系统默认 Level 2: Backup Provider
    if (this.sysBackupKey) {
      try {
        const res = await this.callOpenAICompatible(prompt, this.sysBackupBaseUrl, this.sysBackupKey, 'deepseek-chat');
        return parser(res);
      } catch (e) {
        this.logger.error(`System Backup failed: ${e.message}. Using local fallback.`);
      }
    }

    // Level 3: Local Rule-Based (Offline)
    this.logger.log('Using Local Fallback rules.');
    return localFallback;
  }

  // 根据用户配置调用对应的AI
  private async callWithUserConfig(prompt: string, config: UserAiConfig): Promise<unknown> {
    if (config.aiProvider === 'gemini') {
      return this.callGemini(prompt, config.aiApiKey!);
    } else {
      // 所有其他的都当作 OpenAI 兼容格式
      const baseUrl = config.aiBaseUrl || this.getDefaultBaseUrl(config.aiProvider);
      const modelName = config.aiModelName || this.getDefaultModel(config.aiProvider);
      return this.callOpenAICompatible(prompt, baseUrl, config.aiApiKey!, modelName);
    }
  }

  // 获取各服务商的默认 Base URL
  private getDefaultBaseUrl(provider: string | null): string {
    switch (provider) {
      case 'openai': return 'https://api.openai.com/v1';
      case 'deepseek': return 'https://api.deepseek.com/v1';
      case 'moonshot': return 'https://api.moonshot.cn/v1';
      case 'zhipu': return 'https://open.bigmodel.cn/api/paas/v4';
      default: return 'https://api.openai.com/v1';
    }
  }

  // 获取各服务商的默认模型名
  private getDefaultModel(provider: string | null): string {
    switch (provider) {
      case 'openai': return 'gpt-4o-mini';
      case 'deepseek': return 'deepseek-chat';
      case 'moonshot': return 'moonshot-v1-8k';
      case 'zhipu': return 'glm-4-flash';
      default: return 'gpt-3.5-turbo';
    }
  }


  // =========================================================================================
  // Providers 实现
  // =========================================================================================

  // 1. Gemini Provider
  private async callGemini(prompt: string, apiKey: string): Promise<unknown> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      agent: this.proxyAgent,
      timeout: 15000
    });

    if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);

    const data = await response.json() as GeminiResponse;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return this.extractJSON(text);
  }

  // 2. OpenAI Compatible Provider (DeepSeek, Kimi, OpenAI, etc.)
  private async callOpenAICompatible(prompt: string, baseUrl: string, apiKey: string, modelName: string): Promise<unknown> {
    const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      }),
      timeout: 20000
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const data = await response.json() as OpenAICompatibleResponse;
    const text = data?.choices?.[0]?.message?.content || '';
    return this.extractJSON(text);
  }

  // 3. Local Fallback Generator
  private localFallbackTaskDetails(title: string): AIResponse {
    let subtasks = ['准备工作', '核心执行', '检查验收'];
    if (title.includes('设计')) subtasks = ['收集参考素材', '绘制草图/原型', '视觉设计', '切图导出'];
    else if (title.includes('开发') || title.includes('实现')) subtasks = ['技术方案设计', '代码编写', '单元测试', '代码审查'];
    else if (title.includes('测试')) subtasks = ['编写测试用例', '执行测试', '记录Bug', '回归测试'];
    else if (title.includes('会议')) subtasks = ['准备议程', '发送邀请', '主持会议', '整理纪要'];

    return {
      description: `[离线模式] 该任务 "${title}" 需要进行详细的规划和执行。请团队成员根据实际情况补充细节。`,
      subtasks: subtasks,
      priority: 'MEDIUM'
    };
  }

  // Helper: JSON Extractor
  private extractJSON(text: string): unknown {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Failed to parse JSON from AI response');
    }
  }
}
