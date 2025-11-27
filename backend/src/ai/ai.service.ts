import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface AIResponse { description: string; subtasks: string[]; priority: string; }

@Injectable()
export class AiService {
  private apiKey: string;
  private proxyAgent: HttpsProxyAgent<string> | null = null;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get('GEMINI_API_KEY') || '';
    const proxy = this.config.get('HTTPS_PROXY');
    if (proxy) this.proxyAgent = new HttpsProxyAgent(proxy);
  }

  async generateTaskDetails(title: string): Promise<AIResponse> {
    if (!this.apiKey) return { description: 'API Key 未配置，请手动填写描述。', subtasks: ['手动添加子任务'], priority: 'MEDIUM' };
    try {
      const prompt = `你是一个专业的项目经理。我有一个任务标题："${title}"。请提供：1. 简洁专业的任务描述 2. 3-5个可执行的子任务 3. 推荐优先级(LOW/MEDIUM/HIGH)。必须使用简体中文回复，返回JSON格式：{"description":"...","subtasks":["..."],"priority":"..."}`;
      return await this.callGemini(prompt);
    } catch (e) {
      console.error('AI Error:', e);
      return { description: '无法自动生成描述，请稍后重试。', subtasks: ['手动添加子任务'], priority: 'MEDIUM' };
    }
  }

  async subdivideSubtask(subtaskTitle: string, parentContext?: string): Promise<string[]> {
    if (!this.apiKey) return ['手动添加细分任务'];
    try {
      const ctx = parentContext ? `\n父任务背景：${parentContext}` : '';
      const prompt = `你是一个专业的项目经理。请将以下子任务细分为3-5个更具体的可执行步骤：\n\n子任务："${subtaskTitle}"${ctx}\n\n要求：每个步骤要具体可执行，有逻辑顺序。必须使用简体中文回复，返回JSON格式：{"steps":["步骤1","步骤2","步骤3"]}`;
      const result = await this.callGemini(prompt);
      return (result as any).steps || ['手动添加细分任务'];
    } catch (e) {
      console.error('AI Subdivide Error:', e);
      return ['手动添加细分任务'];
    }
  }

  private async callGemini(prompt: string): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const nodeFetch = (await import('node-fetch')).default;
    const response = await nodeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      agent: this.proxyAgent,
    });
    const data = await response.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return json ? JSON.parse(json) : { description: '无法解析AI响应', subtasks: ['手动添加子任务'], priority: 'MEDIUM' };
  }
}
