import { CryptoUtil } from './crypto.util';

describe('CryptoUtil', () => {
  const originalEnv = process.env;
  beforeAll(() => { process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key-for-unit-tests' }; });
  afterAll(() => { process.env = originalEnv; });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plainText = 'my-secret-api-key';
      const encrypted = CryptoUtil.encrypt(plainText);
      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toContain(':'); // iv:authTag:encrypted
      const decrypted = CryptoUtil.decrypt(encrypted);
      expect(decrypted).toBe(plainText);
    });

    it('should return empty string for empty input', () => {
      expect(CryptoUtil.encrypt('')).toBe('');
      expect(CryptoUtil.decrypt('')).toBe('');
    });

    it('should return original text if not encrypted format', () => {
      const plainText = 'not-encrypted';
      expect(CryptoUtil.decrypt(plainText)).toBe(plainText);
    });
  });

  describe('mask', () => {
    it('should mask text showing only last N characters', () => {
      expect(CryptoUtil.mask('sk-1234567890abcdef', 4)).toBe('****cdef');
      expect(CryptoUtil.mask('short', 4)).toBe('****t');
    });

    it('should return **** for short text', () => {
      expect(CryptoUtil.mask('abc', 4)).toBe('****');
      expect(CryptoUtil.mask('', 4)).toBe('****');
    });
  });
});
