import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useTeamStore } from '../stores/teamStore';
import { Button } from '../components/ui';
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
      .then(async (team) => { 
        setTeamName(team?.name || ''); 
        setStatus('success'); 
        await checkAuth();
        setTimeout(() => navigate('/'), 1500); 
      })
      .catch((e) => { setStatus('error'); setError(e.response?.data?.message || '邀请链接无效或已过期'); });
  }, [inviteLink, user, isInitialized, joinByLink, navigate, checkAuth]);

  if (status === 'login') return <LoginModal />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50/50 p-6">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/Orbit_Logo.png" alt="Orbit" className="w-10 h-10 rounded-xl" />
          <span className="text-xl font-semibold text-neutral-900">Orbit</span>
        </div>

        <div className="minimal-card p-8 text-center">
          {/* 加载中 */}
          {status === 'loading' && (
            <div className="py-6">
              <div className="w-10 h-10 mx-auto mb-5 relative">
                <div className="absolute inset-0 border-2 border-neutral-100 rounded-full" />
                <div className="absolute inset-0 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="font-semibold text-neutral-900 mb-1">正在加入团队</h2>
              <p className="text-sm text-neutral-400">请稍候...</p>
            </div>
          )}

          {/* 成功 */}
          {status === 'success' && (
            <div className="py-6 animate-fade-in">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="font-semibold text-neutral-900 mb-1">欢迎加入</h2>
              {teamName && <p className="text-sm text-indigo-600 font-medium mb-1">{teamName}</p>}
              <p className="text-sm text-neutral-400">正在跳转...</p>
            </div>
          )}

          {/* 失败 */}
          {status === 'error' && (
            <div className="py-6 animate-fade-in">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h2 className="font-semibold text-neutral-900 mb-1">加入失败</h2>
              <p className="text-sm text-neutral-400 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/')}>返回首页</Button>
                <Button onClick={() => window.location.reload()} variant="secondary">重试</Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          遇到问题？<a href="mailto:support@orbit.app" className="text-neutral-600 hover:text-neutral-900 transition-colors">联系支持</a>
        </p>
      </div>
    </div>
  );
};

export default JoinPage;
