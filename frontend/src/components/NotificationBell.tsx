import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../stores/notificationStore';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => { // 点击外部关闭
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  const typeIcons: Record<string, string> = {
    TASK_ASSIGNED: '📋', TASK_STATUS_CHANGED: '🔄', SUBTASK_COMPLETED: '✅',
    TEAM_JOINED: '🎉', ROLE_CHANGED: '👑', TEAM_MEMBER_ADDED: '👋',
  };

  const goToNotifications = () => { setIsOpen(false); navigate('/notifications'); };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-lg shadow-red-200 animate-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-scale-in">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
            <h3 className="font-semibold text-gray-900">通知</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">全部已读</button>}
              <button onClick={goToNotifications} className="text-xs text-gray-500 hover:text-gray-700">查看全部</button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <p className="text-sm">暂无通知</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((n, i) => (
                <div key={n.id} onClick={() => !n.read && markAsRead(n.id)} className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors animate-fade-in ${!n.read ? 'bg-indigo-50/50' : ''}`} style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex gap-3">
                    <span className="text-xl">{typeIcons[n.type] || '📢'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm text-gray-900">{n.title}</p>
                        {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 5 && (
            <button onClick={goToNotifications} className="w-full p-3 text-sm text-indigo-600 hover:bg-indigo-50 font-medium transition-colors border-t border-gray-100">
              查看全部 {notifications.length} 条通知
            </button>
          )}
        </div>
      )}
    </div>
  );
};

