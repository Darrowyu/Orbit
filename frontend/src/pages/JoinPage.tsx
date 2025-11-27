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
  const joinedRef = useRef(false);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) { setStatus('login'); return; }
    if (!inviteLink || joinedRef.current) return;
    joinedRef.current = true;

    joinByLink(inviteLink)
      .then(() => { setStatus('success'); setTimeout(() => navigate('/'), 1500); })
      .catch((e) => { setStatus('error'); setError(e.response?.data?.message || '加入失败'); });
  }, [inviteLink, user, isInitialized]);

  if (status === 'login') return <LoginModal />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">正在加入团队...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">加入成功！</h2>
            <p className="text-gray-500">正在跳转到主页...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">加入失败</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>返回首页</Button>
          </>
        )}
      </div>
    </div>
  );
};
