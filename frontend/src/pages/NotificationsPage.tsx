import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { Notification } from '../types';

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

const getIcon = (type: string) => {
    switch (type) {
        case 'task_assigned': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
        case 'task_status': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
        case 'team_joined': return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
        default: return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    }
};

const getColor = (type: string) => {
    switch (type) {
        case 'task_assigned': return 'bg-blue-100 text-blue-600';
        case 'task_status': return 'bg-green-100 text-green-600';
        case 'team_joined': return 'bg-purple-100 text-purple-600';
        default: return 'bg-gray-100 text-gray-600';
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
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">通知中心</h1>
                            <p className="text-sm text-gray-500">{unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读通知'}</p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">全部已读</button>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* 筛选 */}
                <div className="flex gap-2 mb-6">
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>全部</button>
                    <button onClick={() => setFilter('unread')} className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${filter === 'unread' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>未读 {unreadCount > 0 && `(${unreadCount})`}</button>
                </div>

                {/* 通知列表 */}
                {filteredNotifications.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{filter === 'unread' ? '没有未读通知' : '暂无通知'}</h3>
                        <p className="text-gray-500">有新动态时会在这里提醒你</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                        {filteredNotifications.map((notification, index) => (
                            <div key={notification.id} onClick={() => handleClick(notification)} className={`flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors animate-fade-in-up ${!notification.read ? 'bg-indigo-50/30' : ''}`} style={{ animationDelay: `${index * 30}ms` }}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getColor(notification.type)}`}>
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>{notification.title}</h4>
                                        <span className="text-xs text-gray-400 shrink-0">{formatTime(notification.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                </div>
                                {!notification.read && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default NotificationsPage;
