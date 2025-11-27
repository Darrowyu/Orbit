import React, { useState, useEffect, useRef } from 'react';
import { useNotificationStore } from '../stores/notificationStore';

export const NotificationBell: React.FC = () => {
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="p-3 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">通知</h3>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-800">全部已读</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400"><svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>暂无通知</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} onClick={() => !n.read && markAsRead(n.id)} className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-indigo-50/50' : ''}`}>
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
        </div>
      )}
    </div>
  );
};
