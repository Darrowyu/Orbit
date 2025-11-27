import React, { useState } from 'react';
import { Button } from './Button';
import { useAuthStore } from '../stores/authStore';

export const LoginModal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { login, register, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) await login(email, password);
      else await register(email, password, name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="3" strokeWidth="2.5" /><ellipse cx="12" cy="12" rx="8" ry="3" transform="rotate(-45 12 12)" strokeWidth="1.5" className="opacity-80" /></svg>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-800">Orbit</h1>
        </div>
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isLogin ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>登录</button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isLogin ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>注册</button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <div><label className="block text-sm font-medium text-gray-700 mb-1">姓名</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3" placeholder="您的姓名" /></div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3" placeholder="your@email.com" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">密码</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-3" placeholder="••••••••" /></div>
          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>{isLogin ? '登录' : '注册'}</Button>
        </form>
      </div>
    </div>
  );
};
