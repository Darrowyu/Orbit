import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LoginModal } from './LoginModal';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean; // 是否需要管理员权限
}

export const ProtectedRoute: React.FC<Props> = ({ children, requireAdmin }) => {
  const { user, isInitialized, checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, [checkAuth]);

  if (!isInitialized) { // 等待认证状态初始化
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginModal />; // 未登录显示登录弹窗

  if (requireAdmin && !user.isSuperAdmin) return <Navigate to="/" replace />; // 非管理员跳转首页

  return <>{children}</>;
};
