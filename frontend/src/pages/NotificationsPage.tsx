import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { Notification } from '../types';
import { Button } from '../components/ui';

const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const getTypeStyle = (type: string) => {
    switch (type) {
        case 'task_assigned': return 'bg-blue-50 text-blue-600';
        case 'task_status': return 'bg-emerald-50 text-emerald-600';
        case 'team_joined': return 'bg-purple-50 text-purple-600';
        default: return 'bg-neutral-50 text-neutral-500';
    }
};

export const NotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { notifications, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => { if (user) fetchNotifications(); }, [user, fetchNotifications]);

    const filteredNotifications = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

    const handleClick = async (notification: Notification) => {
        if (!notification.read) await markAsRead(notification.id);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-neutral-50/50">
            {/* 极简头部 */}
            <header className="bg-white border-b border-neutral-100 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="h-5 w-px bg-neutral-200" />
                        <div>
                            <h1 className="text-base font-semibold text-neutral-900">通知</h1>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors">全部已读</button>
                    )}
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-6">
                {/* 筛选 */}
                <div className="flex gap-1 mb-6 border-b border-neutral-100">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${filter === 'all' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
                        全部
                        {filter === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
                    </button>
                    <button onClick={() => setFilter('unread')} className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${filter === 'unread' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
                        未读 {unreadCount > 0 && <span className="ml-1 text-xs">({unreadCount})</span>}
                        {filter === 'unread' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
                    </button>
                </div>

                {/* 通知列表 */}
                {filteredNotifications.length === 0 ? (
                    <div className="minimal-card p-12 text-center animate-fade-in">
                        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <h3 className="font-medium text-neutral-900 mb-1">{filter === 'unread' ? '没有未读通知' : '暂无通知'}</h3>
                        <p className="text-sm text-neutral-400">有新动态时会提醒你</p>
                    </div>
                ) : (
                    <div className="minimal-card overflow-hidden divide-y divide-neutral-50">
                        {filteredNotifications.map((notification, index) => (
                            <div key={notification.id} onClick={() => handleClick(notification)} className={`flex items-start gap-4 p-4 hover:bg-neutral-50/50 cursor-pointer transition-colors animate-fade-in-up ${!notification.read ? 'bg-indigo-50/20' : ''}`} style={{ animationDelay: `${index * 20}ms` }}>
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getTypeStyle(notification.type)}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className={`text-sm ${!notification.read ? 'font-medium text-neutral-900' : 'text-neutral-700'}`}>{notification.title}</h4>
                                        <span className="text-xs text-neutral-400 shrink-0">{formatTime(notification.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                </div>
                                {!notification.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default NotificationsPage;
