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

  async generateTaskDetails(title: string, customPrompt?: string): Promise<AIResponse> {
    if (!this.apiKey) return { description: 'API Key 未配置，请手动填写描述。', subtasks: ['手动添加子任务'], priority: 'MEDIUM' };
    try {
      const defaultPrompt = `你是一个专业的项目经理。我有一个任务标题："${title}"。请提供：1. 简洁专业的任务描述 2. 3-5个可执行的子任务 3. 推荐优先级(LOW/MEDIUM/HIGH)。必须使用简体中文回复，返回JSON格式：{"description":"...","subtasks":["..."],"priority":"..."}`;
      let prompt = defaultPrompt;
      if (customPrompt && customPrompt.trim()) {
        prompt = customPrompt.replace(/\{title\}/g, title) + '\n\n必须返回JSON格式：{"description":"...","subtasks":["..."],"priority":"LOW/MEDIUM/HIGH"}';
      }
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

  async estimateWorkload(taskTitle: string, description: string, subtasks: string[]): Promise<{ hours: number; confidence: string; factors: string[] }> {
    if (!this.apiKey) return { hours: 8, confidence: 'low', factors: ['API未配置'] };
    try {
      const prompt = `你是项目管理专家。请评估以下任务的工作量：\n任务：${taskTitle}\n描述：${description}\n子任务：${subtasks.join('、')}\n\n返回JSON：{"hours":预估小时数(数字),"confidence":"high/medium/low","factors":["影响因素1","因素2"]}`;
      return await this.callGemini(prompt);
    } catch { return { hours: 8, confidence: 'low', factors: ['评估失败'] }; }
  }

  async recommendAssignee(taskTitle: string, description: string, teamMembers: any[], taskHistory: any[]): Promise<{ recommendedId: string; reason: string; alternatives: { id: string; reason: string }[] }> {
    if (!this.apiKey || !teamMembers.length) return { recommendedId: teamMembers[0]?.id || '', reason: '默认推荐', alternatives: [] };
    try {
      const memberInfo = teamMembers.map(m => `${m.name}(ID:${m.id},技能:${m.skills?.join('、') || '未设置'})`).join('；');
      const historyInfo = taskHistory.slice(0, 5).map(t => `${t.assignee?.name}完成了"${t.title}"`).join('；');
      const prompt = `你是团队管理专家。任务："${taskTitle}"，描述："${description}"。\n团队成员：${memberInfo}\n历史：${historyInfo}\n\n根据成员技能和历史表现推荐最佳负责人，返回JSON：{"recommendedId":"成员ID","reason":"推荐理由（需说明技能匹配度）","alternatives":[{"id":"备选ID","reason":"理由"}]}`;
      return await this.callGemini(prompt);
    } catch { return { recommendedId: teamMembers[0]?.id || '', reason: '推荐失败', alternatives: [] }; }
  }

  async detectRisks(tasks: any[]): Promise<{ taskId: string; riskLevel: string; reasons: string[]; suggestions: string[] }[]> {
    if (!this.apiKey || !tasks.length) return [];
    try {
      const taskInfo = tasks.map(t => `ID:${t.id},标题:${t.title},状态:${t.status},截止:${t.dueDate || '无'},依赖:${t.dependsOn?.length || 0}个`).join('；');
      const prompt = `你是风险管理专家。分析以下任务的风险：\n${taskInfo}\n\n返回JSON数组：[{"taskId":"任务ID","riskLevel":"high/medium/low","reasons":["风险原因"],"suggestions":["建议"]}]，只返回有风险的任务`;
      const result = await this.callGemini(prompt);
      return Array.isArray(result) ? result : [];
    } catch { return []; }
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
    const json = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0];
    return json ? JSON.parse(json) : { description: '无法解析AI响应', subtasks: ['手动添加子任务'], priority: 'MEDIUM' };
  }
}
