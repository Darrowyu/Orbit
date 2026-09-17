import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('SMTP_FROM') || config.get<string>('SMTP_USER') || 'noreply@orbit.local';
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(config.get<string>('SMTP_PORT') || '465', 10),
        secure: config.get<string>('SMTP_SECURE') !== 'false', // 默认 SSL（465），SMTP_SECURE=false 用 STARTTLS
        auth: config.get<string>('SMTP_USER') ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASS') } : undefined,
      });
    }
  }

  /** 发送邮件。SMTP 未配置时降级为日志输出（开发环境可用），返回是否真实发送。 */
  async sendMail(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`SMTP 未配置，邮件降级为日志。收件人: ${to} | 主题: ${subject} | 内容: ${text}`);
      return false;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, text });
    return true;
  }
}
