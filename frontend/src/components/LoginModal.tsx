import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';

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
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-500 ease-out ${i <= strength
              ? strength <= 1 ? 'bg-red-500'
                : strength === 2 ? 'bg-amber-500'
                  : strength === 3 ? 'bg-blue-500'
                    : 'bg-emerald-500'
              : 'bg-slate-100'
              }`}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">
        {strength === 0 && '太短'}
        {strength === 1 && '较弱'}
        {strength === 2 && '一般'}
        {strength === 3 && '很好'}
        {strength >= 4 && '完美'}
      </p>
    </div>
  );
};

export const LoginModal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 基础验证
    if (!email.includes('@')) { setError('请输入有效的邮箱地址'); return; }
    if (!isLogin && password.length < 8) { setError('密码安全性不足'); return; }

    try {
      if (isLogin) await login(email, password);
      else await register(email, password, name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      // 优化错误提示文案
      if (msg.includes('401') || msg.includes('Unauthorized')) setError('账号或密码不正确');
      else if (msg.includes('409')) setError('该邮箱已被使用');
      else setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-900">
      {/* 左侧：品牌与愿景 (45% 宽度) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[#001C3D] overflow-hidden flex-col justify-between p-16 text-white">
        {/* 背景纹理与光效 */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>

        {/* 顶部 Logo */}
        <div className="relative z-10 animate-fade-in-down">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-lg shadow-black/10">
              <img src="/Orbit_Logo.png" alt="Makrite Orbit" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Makrite Orbit</span>
          </div>
        </div>

        {/* 中间 核心文案 */}
        <div className="relative z-10 max-w-md animate-fade-in-up delay-100">
          <h1 className="text-5xl font-bold leading-[1.1] mb-8 tracking-tight">
            让协作<br />
            <span className="text-blue-400">回归简单</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed font-light">
            Orbit 将任务管理、团队沟通与 AI 智能辅助完美融合。摒弃繁杂，专注高效，为您的团队打造心流般的工作体验。
          </p>
        </div>

        {/* 底部 版权 */}
        <div className="relative z-10 text-sm text-slate-400 animate-fade-in-up delay-200">
          <p>© {new Date().getFullYear()} Makrite Industries Inc. Internal System.</p>
        </div>
      </div>

      {/* 右侧：登录/注册表单 (55% 宽度) */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-24 bg-white relative">
        {/* 移动端 Logo */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <img src="/Orbit_Logo.png" alt="Orbit" className="w-8 h-8 rounded-lg shadow-sm" />
          <span className="text-xl font-bold text-[#001C3D]">Orbit</span>
        </div>

        <div className="w-full max-w-[400px] animate-fade-in">
          {/* 标题区 */}
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-[#001C3D] mb-3">{isLogin ? '欢迎回来' : '开始免费试用'}</h2>
            <p className="text-slate-500">
              {isLogin ? '请输入您的凭证以访问工作台' : '只需 30 秒，开启全新协作方式'}
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">全名</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] transition-all hover:bg-slate-100/50"
                  placeholder="例如：Elon Musk"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">工作邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] transition-all hover:bg-slate-100/50"
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-700">密码</label>
                {isLogin && <button type="button" className="text-xs font-semibold text-[#001C3D] hover:underline">忘记密码？</button>}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] transition-all hover:bg-slate-100/50 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {!isLogin && <PasswordStrength password={password} />}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600 animate-shake">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#001C3D] text-white text-sm font-bold rounded-lg hover:bg-[#002855] focus:ring-4 focus:ring-[#001C3D]/20 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-[#001C3D]/10 flex justify-center items-center gap-2"
            >
              {isLoading && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
              {isLogin ? '立即登录' : '创建账户'}
            </button>
          </form>

          {/* 切换模式 */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              {isLogin ? '还没有账户？' : '已经有账户了？'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 font-bold text-[#001C3D] hover:underline"
              >
                {isLogin ? '免费注册' : '直接登录'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
