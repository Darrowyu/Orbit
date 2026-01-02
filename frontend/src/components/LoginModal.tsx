import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from './ui';

type ViewMode = 'login' | 'register' | 'forgot-email' | 'forgot-code' | 'forgot-password' | 'forgot-success';
const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const strength = useMemo(() => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-3">
      <div className="flex gap-1.5 h-1">
        {[1, 2, 3, 4].map(level => (
          <div key={`strength-${level}`} className={`flex-1 rounded-full transition-all duration-500 ease-out ${level <= strength ? strength <= 1 ? 'bg-red-500' : strength === 2 ? 'bg-amber-500' : strength === 3 ? 'bg-blue-500' : 'bg-emerald-500' : 'bg-slate-100'}`} />
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">
        {strength === 0 && '太短'}{strength === 1 && '较弱'}{strength === 2 && '一般'}{strength === 3 && '很好'}{strength >= 4 && '完美'}
      </p>
    </div>
  );
};

const StepIndicator: React.FC<{ current: ViewMode }> = ({ current }) => {
  const steps = [{ key: 'forgot-email', label: '验证邮箱' }, { key: 'forgot-code', label: '输入验证码' }, { key: 'forgot-password', label: '设置密码' }];
  const currentIndex = steps.findIndex(s => s.key === current);
  if (currentIndex === -1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${idx < currentIndex ? 'bg-emerald-500 text-white' : idx === currentIndex ? 'bg-[#001C3D] text-white ring-4 ring-[#001C3D]/20' : 'bg-slate-100 text-slate-400'}`}>
              {idx < currentIndex ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg> : idx + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${idx <= currentIndex ? 'text-slate-700' : 'text-slate-400'}`}>{step.label}</span>
          </div>
          {idx < steps.length - 1 && <div className={`w-8 h-0.5 transition-all duration-300 ${idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

export const LoginModal: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, isLoading } = useAuthStore();

  // 忘记密码相关状态
  const [resetEmail, setResetEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isForgotMode = mode.startsWith('forgot');

  useEffect(() => { // 重发倒计时
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !email.includes('@')) { setError('请输入有效的邮箱地址'); return; }
    if (mode === 'register' && password.length < 8) { setError('密码安全性不足'); return; }
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      if (msg.includes('401') || msg.includes('Unauthorized')) setError('账号或密码不正确');
      else if (msg.includes('409')) setError('该邮箱已被使用');
      else setError(msg);
    }
  };

  const handleSendCode = useCallback(async () => {
    if (!resetEmail.includes('@')) { setError('请输入有效的邮箱地址'); return; }
    setResetLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '发送失败');
      setMode('forgot-code');
      setResendCooldown(RESEND_COOLDOWN);
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setResetLoading(false);
    }
  }, [resetEmail]);

  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0) return;
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail }) });
      if (!res.ok) throw new Error('重发失败');
      setResendCooldown(RESEND_COOLDOWN);
      setError('');
    } catch { setError('重发验证码失败，请稍后重试'); }
    finally { setResetLoading(false); }
  }, [resetEmail, resendCooldown]);

  const handleCodeChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < CODE_LENGTH - 1) codeInputRefs.current[index + 1]?.focus();
  }, [code]);

  const handleCodeKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) codeInputRefs.current[index - 1]?.focus();
  }, [code]);

  const handleCodePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) { setCode(pasted.split('')); codeInputRefs.current[CODE_LENGTH - 1]?.focus(); }
  }, []);

  const handleVerifyCode = useCallback(async () => {
    const codeStr = code.join('');
    if (codeStr.length !== CODE_LENGTH) { setError('请输入完整的验证码'); return; }
    setResetLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-reset-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail, code: codeStr }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '验证失败');
      setMode('forgot-password');
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码错误或已过期');
    } finally {
      setResetLoading(false);
    }
  }, [resetEmail, code]);

  const handleResetPassword = useCallback(async () => {
    if (newPassword.length < 6) { setError('密码至少需要6个字符'); return; }
    if (newPassword !== confirmPassword) { setError('两次输入的密码不一致'); return; }
    setResetLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail, code: code.join(''), password: newPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '重置失败');
      setMode('forgot-success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置密码失败');
    } finally {
      setResetLoading(false);
    }
  }, [resetEmail, code, newPassword, confirmPassword]);

  const resetForgotState = useCallback(() => {
    setResetEmail('');
    setCode(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setResendCooldown(0);
  }, []);

  const backToLogin = useCallback(() => { resetForgotState(); setMode('login'); }, [resetForgotState]);

  // 渲染忘记密码流程
  const renderForgotPassword = () => (
    <div className="w-full max-w-[400px] animate-fade-in">
      {mode !== 'forgot-success' && <StepIndicator current={mode} />}

      {/* Step 1: 输入邮箱 */}
      {mode === 'forgot-email' && (
        <div className="animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#001C3D]/5 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-[#001C3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-[#001C3D]">找回密码</h2>
            <p className="text-sm text-slate-500 mt-1">输入您的注册邮箱，我们将发送验证码</p>
          </div>
          <div className="space-y-4">
            <Input type="email" value={resetEmail} onChange={e => { setResetEmail(e.target.value); setError(''); }} placeholder="请输入邮箱地址" autoFocus size="lg" onKeyDown={e => e.key === 'Enter' && handleSendCode()} error={!!error} errorText={error} />
            <Button onClick={handleSendCode} disabled={!resetEmail} isLoading={resetLoading} isFullWidth size="lg">发送验证码</Button>
            <Button variant="ghost" onClick={backToLogin} isFullWidth size="md">← 返回登录</Button>
          </div>
        </div>
      )}

      {/* Step 2: 输入验证码 */}
      {mode === 'forgot-code' && (
        <div className="animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-[#001C3D]">验证您的邮箱</h2>
            <p className="text-sm text-slate-500 mt-1">验证码已发送至 <span className="font-medium text-slate-700">{resetEmail}</span></p>
          </div>
          <div className="space-y-4">
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {code.map((digit, idx) => (
                <input key={`code-input-${idx}`} ref={el => { codeInputRefs.current[idx] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleCodeChange(idx, e.target.value)} onKeyDown={e => handleCodeKeyDown(idx, e)} className="w-11 h-14 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] transition-all" />
              ))}
            </div>
            {error && <p className="text-sm text-red-500 text-center flex items-center justify-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</p>}
            <Button onClick={handleVerifyCode} disabled={code.join('').length !== CODE_LENGTH} isLoading={resetLoading} isFullWidth size="lg">验证</Button>
            <div className="text-center">
              <button onClick={handleResendCode} disabled={resendCooldown > 0 || resetLoading} className="text-sm text-slate-500 hover:text-[#001C3D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {resendCooldown > 0 ? `${resendCooldown}秒后可重新发送` : '没收到？重新发送'}
              </button>
            </div>
            <Button variant="ghost" onClick={() => { setMode('forgot-email'); setCode(['', '', '', '', '', '']); setError(''); }} isFullWidth size="md">← 返回修改邮箱</Button>
          </div>
        </div>
      )}

      {/* Step 3: 设置新密码 */}
      {mode === 'forgot-password' && (
        <div className="animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-[#001C3D]">设置新密码</h2>
            <p className="text-sm text-slate-500 mt-1">请输入您的新密码</p>
          </div>
          <div className="space-y-4">
            <Input 
              type={showPassword ? 'text' : 'password'} 
              value={newPassword} 
              onChange={e => { setNewPassword(e.target.value); setError(''); }} 
              placeholder="新密码（至少6位）" 
              size="lg"
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600">
                  {showPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                </button>
              }
            />
            <Input 
              type={showPassword ? 'text' : 'password'} 
              value={confirmPassword} 
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }} 
              placeholder="确认新密码" 
              size="lg"
              onKeyDown={e => e.key === 'Enter' && handleResetPassword()} 
              error={!!error} 
              errorText={error} 
            />
            <Button onClick={handleResetPassword} disabled={!newPassword || !confirmPassword} isLoading={resetLoading} isFullWidth size="lg">重置密码</Button>
          </div>
        </div>
      )}

      {/* Step 4: 成功 */}
      {mode === 'forgot-success' && (
        <div className="animate-fade-in text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-[#001C3D] mb-2">密码重置成功！</h2>
          <p className="text-sm text-slate-500 mb-6">您现在可以使用新密码登录了</p>
          <Button onClick={backToLogin} isFullWidth size="lg">返回登录</Button>
        </div>
      )}
    </div>
  );

  // 渲染登录/注册表单
  const renderAuthForm = () => (
    <div className="w-full max-w-[400px] animate-fade-in">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-3xl font-bold text-[#001C3D] mb-3">{mode === 'login' ? '欢迎回来' : '开始免费试用'}</h2>
        <p className="text-slate-500">{mode === 'login' ? '请输入您的凭证以访问工作台' : '只需 30 秒，开启全新协作方式'}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === 'register' && (
          <Input label="全名" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="例如：Elon Musk" size="lg" required />
        )}
        <Input 
          label={mode === 'login' ? '用户名或邮箱' : '工作邮箱'} 
          type={mode === 'login' ? 'text' : 'email'} 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder={mode === 'login' ? '用户名或邮箱' : 'name@company.com'} 
          size="lg" 
          required 
        />
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-slate-700">密码</label>
            {mode === 'login' && <button type="button" onClick={() => { resetForgotState(); setMode('forgot-email'); }} className="text-xs font-semibold text-[#001C3D] hover:underline">忘记密码？</button>}
          </div>
          <Input 
            type={showPassword ? 'text' : 'password'} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••" 
            size="lg" 
            required
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 transition-colors">
                {showPassword ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
              </button>
            }
          />
          {mode === 'register' && <PasswordStrength password={password} />}
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600 animate-shake">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}
        <Button type="submit" isLoading={isLoading} isFullWidth size="lg">
          {mode === 'login' ? '立即登录' : '创建账户'}
        </Button>
      </form>
      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          {mode === 'login' ? '还没有账户？' : '已经有账户了？'}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="ml-1 font-bold text-[#001C3D] hover:underline">{mode === 'login' ? '免费注册' : '直接登录'}</button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      {/* 左侧：品牌与愿景 */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[#001C3D] overflow-hidden flex-col justify-between p-16 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
        <div className="relative z-10 animate-fade-in-down">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-lg shadow-black/10"><img src="/Orbit_Logo.png" alt="Makrite Orbit" className="w-10 h-10 object-contain" /></div>
            <span className="text-2xl font-bold tracking-tight">Makrite Orbit</span>
          </div>
        </div>
        <div className="relative z-10 max-w-md animate-fade-in-up delay-100">
          <h1 className="text-5xl font-bold leading-[1.1] mb-8 tracking-tight">让协作<br /><span className="text-blue-400">回归简单</span></h1>
          <p className="text-lg text-slate-300 leading-relaxed font-light">Orbit 将任务管理、团队沟通与 AI 智能辅助完美融合。摒弃繁杂，专注高效，为您的团队打造心流般的工作体验。</p>
        </div>
        <div className="relative z-10 text-sm text-slate-400 animate-fade-in-up delay-200">
          <p>© {new Date().getFullYear()} Makrite Industries Inc. Internal System.</p>
        </div>
      </div>

      {/* 右侧：表单区域 */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-24 bg-white relative">
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <img src="/Orbit_Logo.png" alt="Orbit" className="w-8 h-8 rounded-lg shadow-sm" />
          <span className="text-xl font-bold text-[#001C3D]">Orbit</span>
        </div>
        {isForgotMode ? renderForgotPassword() : renderAuthForm()}
      </div>
    </div>
  );
};
