import { ConfigService } from '@nestjs/config';

const INSECURE_DEFAULTS = new Set([
  'your-super-secret-jwt-key-change-in-production',
  'secret',
  'changeme',
]);

/**
 * 读取并校验 JWT 密钥。缺失、为公开默认值或过短时直接抛错，拒绝启动。
 * 所有 JwtModule 注册与 JwtStrategy 必须统一走这里，避免各处自行 fallback。
 */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret || INSECURE_DEFAULTS.has(secret) || secret.length < 32) {
    throw new Error(
      'JWT_SECRET 未配置或强度不足：请在 backend/.env 中设置至少 32 字符的高熵随机密钥（禁止默认值）',
    );
  }
  return secret;
}
