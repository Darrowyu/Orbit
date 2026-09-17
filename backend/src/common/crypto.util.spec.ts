import { CryptoUtil } from './crypto.util';

describe('CryptoUtil', () => {
  const originalEnv = process.env;
  beforeAll(() => { process.env = { ...originalEnv, ENCRYPTION_KEY: 'test-encryption-key-for-unit-tests' }; });
  afterAll(() => { process.env = originalEnv; });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plainText = 'my-secret-api-key';
      const encrypted = CryptoUtil.encrypt(plainText);
      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toContain(':'); // iv:authTag:ciphertext
      const decrypted = CryptoUtil.decrypt(encrypted);
      expect(decrypted).toBe(plainText);
    });

    it('should produce different ciphertext for the same input (random IV)', () => {
      const a = CryptoUtil.encrypt('same-text');
      const b = CryptoUtil.encrypt('same-text');
      expect(a).not.toBe(b);
      expect(CryptoUtil.decrypt(a)).toBe('same-text');
      expect(CryptoUtil.decrypt(b)).toBe('same-text');
    });

    it('should use 12-byte IV in iv:authTag:ciphertext hex format', () => {
      const [ivHex, authTagHex] = CryptoUtil.encrypt('x').split(':');
      expect(ivHex).toHaveLength(24); // 12 字节 = 24 hex 字符
      expect(authTagHex).toHaveLength(32); // 16 字节 authTag
    });

    it('should return empty string for empty input', () => {
      expect(CryptoUtil.encrypt('')).toBe('');
      expect(CryptoUtil.decrypt('')).toBe('');
    });

    it('should throw for non-encrypted format', () => {
      expect(() => CryptoUtil.decrypt('not-encrypted')).toThrow('Invalid encrypted text format');
    });

    it('should throw when ciphertext is tampered', () => {
      const encrypted = CryptoUtil.encrypt('secret');
      const [iv, tag, body] = encrypted.split(':');
      const tampered = `${iv}:${tag}:${body.slice(0, -2)}00`;
      expect(() => CryptoUtil.decrypt(tampered)).toThrow();
    });

    it('should throw when ENCRYPTION_KEY is missing', () => {
      const saved = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      expect(() => CryptoUtil.encrypt('x')).toThrow('ENCRYPTION_KEY must be configured');
      process.env.ENCRYPTION_KEY = saved;
    });
  });

  describe('mask', () => {
    it('should mask text showing only last N characters', () => {
      expect(CryptoUtil.mask('sk-1234567890abcdef', 4)).toBe('****cdef');
      expect(CryptoUtil.mask('short', 4)).toBe('****hort'); // 长度 5 > 4，显示后 4 位
    });

    it('should return **** for short text', () => {
      expect(CryptoUtil.mask('abc', 4)).toBe('****');
      expect(CryptoUtil.mask('', 4)).toBe('****');
    });
  });
});
