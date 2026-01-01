import { Controller, Get, Post, Body, Query, UseGuards, Request, ForbiddenException, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoUtil } from '../common/crypto.util';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private users: UsersService, private prisma: PrismaService) { }

  @Get('team')
  async getTeam(@Request() req, @Query('teamId') teamId?: string) {
    const tid = teamId || (await this.prisma.user.findUnique({ where: { id: req.user.sub } }))?.currentTeamId;
    if (!tid) throw new ForbiddenException('请先加入或创建团队');
    return this.users.getTeamMembers(tid);
  }

  @Post('complete-onboarding')
  async completeOnboarding(@Request() req) {
    await this.users.markFirstLoginComplete(req.user.sub);
    return { success: true };
  }

  @Post('change-password')
  changePassword(@Request() req, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.users.changePassword(req.user.id, body.oldPassword, body.newPassword);
  }

  @Post('profile')
  updateProfile(@Request() req, @Body() body: { name?: string; avatar?: string; color?: string }) {
    return this.users.updateProfile(req.user.id, body);
  }

  @Get('my-teams')
  getMyTeams(@Request() req) {
    return this.users.getUserTeams(req.user.id);
  }

  // ==================== AI 配置管理 ====================

  @Get('ai-config')
  async getAiConfig(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { aiProvider: true, aiApiKey: true, aiBaseUrl: true, aiModelName: true, aiPrompt: true }
    });
    const decryptedKey = user?.aiApiKey ? CryptoUtil.decrypt(user.aiApiKey) : null; // 解密后脱敏显示
    return {
      aiProvider: user?.aiProvider || null,
      aiApiKey: decryptedKey ? CryptoUtil.mask(decryptedKey, 4) : null,
      aiBaseUrl: user?.aiBaseUrl || null,
      aiModelName: user?.aiModelName || null,
      aiPrompt: user?.aiPrompt || null,
      isConfigured: !!user?.aiApiKey
    };
  }

  @Post('ai-config')
  async saveAiConfig(@Request() req, @Body() body: {
    aiProvider?: string;
    aiApiKey?: string;
    aiBaseUrl?: string;
    aiModelName?: string;
    aiPrompt?: string;
    clearConfig?: boolean;
  }) {
    // 如果是清除配置
    if (body.clearConfig) {
      await this.prisma.user.update({
        where: { id: req.user.sub },
        data: { aiProvider: null, aiApiKey: null, aiBaseUrl: null, aiModelName: null, aiPrompt: null }
      });
      return { success: true, message: '已恢复使用系统默认 AI 模型' };
    }

    // 构建更新数据
    const updateData: any = {};

    // AI 模型配置
    if (body.aiProvider !== undefined) updateData.aiProvider = body.aiProvider || null;
    if (body.aiApiKey && !body.aiApiKey.startsWith('****')) {
      updateData.aiApiKey = CryptoUtil.encrypt(body.aiApiKey); // 加密存储
      this.logger.log(`User ${req.user.sub} updated AI API key`);
    }
    if (body.aiBaseUrl !== undefined) updateData.aiBaseUrl = body.aiBaseUrl || null;
    if (body.aiModelName !== undefined) updateData.aiModelName = body.aiModelName || null;

    // AI 提示词
    if (body.aiPrompt !== undefined) updateData.aiPrompt = body.aiPrompt || null;

    await this.prisma.user.update({
      where: { id: req.user.sub },
      data: updateData
    });

    return { success: true, message: 'AI 配置已保存' };
  }

  @Post('ai-config/test')
  async testAiConfig(@Request() req, @Body() body: {
    aiProvider: string;
    aiApiKey: string;
    aiBaseUrl?: string;
    aiModelName?: string;
  }) {
    // 简单的连接测试：尝试发送一个简短的请求
    try {
      const { AiService } = await import('../ai/ai.service');
      // 直接调用测试方法（我们稍后在 AiService 中添加）
      const response = await this.testConnection(body);
      return { success: true, message: '连接测试成功！', response };
    } catch (e) {
      return { success: false, message: `连接失败: ${e.message}` };
    }
  }

  // 简单的连接测试逻辑
  private async testConnection(config: { aiProvider: string; aiApiKey: string; aiBaseUrl?: string; aiModelName?: string }) {
    const testPrompt = '请用一句话介绍自己。';

    if (config.aiProvider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.aiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }] }),
      });
      if (!res.ok) throw new Error(`Gemini API 错误: ${res.statusText}`);
      const data = await res.json() as any;
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 100) || '响应成功';
    } else {
      // OpenAI 兼容格式 (DeepSeek, Kimi, OpenAI, etc.)
      const baseUrl = (config.aiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const url = `${baseUrl}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.aiApiKey}` },
        body: JSON.stringify({
          model: config.aiModelName || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 50
        }),
      });
      if (!res.ok) throw new Error(`API 错误: ${res.statusText}`);
      const data = await res.json() as any;
      return data?.choices?.[0]?.message?.content?.slice(0, 100) || '响应成功';
    }
  }
}
