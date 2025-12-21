import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTeamStore } from '../stores/teamStore';
import { Button } from '../components/Button';
import { LoginModal } from '../components/LoginModal';

export const JoinPage: React.FC = () => {
  const { inviteLink } = useParams<{ inviteLink: string }>();
  const navigate = useNavigate();
  const { user, isInitialized, checkAuth } = useAuthStore();
  const { joinByLink } = useTeamStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login'>('loading');
  const [error, setError] = useState('');
  const [teamName, setTeamName] = useState('');
  const joinedRef = useRef(false);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) { setStatus('login'); return; }
    if (!inviteLink || joinedRef.current) return;
    joinedRef.current = true;

    joinByLink(inviteLink)
      .then((team) => { setTeamName(team?.name || ''); setStatus('success'); setTimeout(() => navigate('/'), 2000); })
      .catch((e) => { setStatus('error'); setError(e.response?.data?.message || '邀请链接无效或已过期'); });
  }, [inviteLink, user, isInitialized, joinByLink, navigate]);

  if (status === 'login') return <LoginModal />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/Orbit_Logo.png" alt="Orbit" className="w-12 h-12 rounded-2xl shadow-lg shadow-indigo-200" />
          <h1 className="text-2xl font-bold gradient-text">Orbit</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          {status === 'loading' && (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">正在加入团队</h2>
              <p className="text-gray-500">请稍候...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 animate-scale-in">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎加入！</h2>
              {teamName && <p className="text-lg text-indigo-600 font-medium mb-2">{teamName}</p>}
              <p className="text-gray-500">正在跳转到工作区...</p>
              <div className="mt-6 flex justify-center gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-200">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">加入失败</h2>
              <p className="text-gray-500 mb-6">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate('/')} size="lg">返回首页</Button>
                <Button onClick={() => window.location.reload()} variant="secondary" size="lg">重试</Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          遇到问题？<a href="mailto:support@orbit.app" className="text-indigo-500 hover:text-indigo-600">联系支持</a>
        </p>
      </div>
    </div>
  );
};

