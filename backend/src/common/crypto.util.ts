import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm'; // AES-256-GCM 加密算法
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class CryptoUtil {
  private static getKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me';
    return crypto.scryptSync(secret, 'salt', 32); // 派生32字节密钥
  }

  static encrypt(text: string): string { // 加密文本，返回 base64 格式
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`; // iv:authTag:encrypted
  }

  static decrypt(encryptedText: string): string { // 解密文本
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText; // 兼容未加密数据
    try {
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, this.getKey(), iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return encryptedText; // 解密失败返回原文（兼容旧数据）
    }
  }

  static mask(text: string, visibleChars = 4): string { // 脱敏显示，只显示后N位
    if (!text || text.length <= visibleChars) return '****';
    return `****${text.slice(-visibleChars)}`;
  }
}
