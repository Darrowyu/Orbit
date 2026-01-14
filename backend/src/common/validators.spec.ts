import { validatePassword } from './validators';

describe('validatePassword', () => {
  it('should pass for valid password', () => {
    expect(() => validatePassword('Password123')).not.toThrow();
    expect(() => validatePassword('Abc12345')).not.toThrow();
  });

  it('should throw for password less than 8 characters', () => {
    expect(() => validatePassword('Abc123')).toThrow('密码长度至少8位');
    expect(() => validatePassword('')).toThrow('密码长度至少8位');
  });

  it('should throw for password without letters', () => {
    expect(() => validatePassword('12345678')).toThrow('密码必须包含字母');
  });

  it('should throw for password without numbers', () => {
    expect(() => validatePassword('abcdefgh')).toThrow('密码必须包含数字');
  });
});
