import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm'; // AES-256-GCM 加密算法
const IV_LENGTH = 12; // GCM 推荐 12 字节 IV

export class CryptoUtil {
  private static getKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) throw new Error('ENCRYPTION_KEY must be configured'); // 仅使用专用加密密钥，不回退 JWT_SECRET
    return crypto.createHash('sha256').update(secret, 'utf8').digest(); // sha256 派生 32 字节密钥
  }

  static encrypt(text: string): string { // 加密文本，返回 iv:authTag:ciphertext（hex）
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH); // 每次加密使用随机 IV
    const cipher = crypto.createCipheriv(ALGORITHM, this.getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedText: string): string { // 解密文本，失败抛异常（不静默回退）
    if (!encryptedText) return '';
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) throw new Error('Invalid encrypted text format');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.getKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static mask(text: string, visibleChars = 4): string { // 脱敏显示，只显示后N位
    if (!text || text.length <= visibleChars) return '****';
    return `****${text.slice(-visibleChars)}`;
  }
}
