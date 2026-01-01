import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../stores/taskStore';
import { useTeamStore } from '../stores/teamStore';
import { useAuthStore } from '../stores/authStore';
import { TaskStatus, Priority } from '../types';
import { Card, Avatar, Badge, IconButton } from '../components/ui';

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string; bgColor: string; trend?: string }> = ({ icon, label, value, color, bgColor, trend }) => (
    <Card variant="default" padding="md" hoverable className="animate-fade-in-up group">
        <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor} ${color} shadow-sm group-hover:scale-105 transition-transform`}>{icon}</div>
            {trend && <Badge variant={trend.startsWith('+') ? 'success' : 'danger'} size="sm">{trend}</Badge>}
        </div>
        <div className="text-3xl font-bold text-slate-900 mb-1 tracking-tight">{value}</div>
        <div className="text-sm text-slate-500 font-medium">{label}</div>
    </Card>
);

const ProgressRing: React.FC<{ progress: number; size?: number; strokeWidth?: number }> = ({ progress, size = 120, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-gray-100" />
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#progressGradient)" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
            <defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6366F1" /><stop offset="100%" stopColor="#8B5CF6" /></linearGradient></defs>
        </svg>
    );
};

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { tasks, fetchTasks } = useTaskStore();
    const { currentTeam, members } = useTeamStore();

    useEffect(() => { if (user?.currentTeamId) fetchTasks(); }, [user?.currentTeamId, fetchTasks]);

    const stats = useMemo(() => {
        const myTasks = tasks.filter(t => t.assigneeId === user?.id);
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
        return {
            total: tasks.length,
            myTotal: myTasks.length,
            todo: tasks.filter(t => t.status === TaskStatus.TODO).length,
            inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
            review: tasks.filter(t => t.status === TaskStatus.REVIEW).length,
            done: tasks.filter(t => t.status === TaskStatus.DONE).length,
            highPriority: tasks.filter(t => t.priority === Priority.HIGH).length,
            overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.DONE).length,
            completionRate: tasks.length ? Math.round((tasks.filter(t => t.status === TaskStatus.DONE).length / tasks.length) * 100) : 0,
        };
    }, [tasks, user?.id]);

    const upcomingDeadlines = useMemo(() => {
        return tasks.filter(t => t.dueDate && t.status !== TaskStatus.DONE)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 5);
    }, [tasks]);

    const priorityColors: Record<string, string> = { [Priority.HIGH]: 'bg-orange-100 text-orange-700', [Priority.MEDIUM]: 'bg-blue-100 text-blue-700', [Priority.LOW]: 'bg-gray-100 text-gray-600' };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* 头部 */}
            <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-[var(--shadow-sm)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <IconButton onClick={() => navigate('/')} variant="ghost" className="text-slate-500 hover:text-[#001C3D]">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </IconButton>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#001C3D] to-[#0F4C81]">仪表盘</h1>
                            <p className="text-sm text-slate-500">{currentTeam?.name || '我的空间'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">欢迎回来，</span>
                        <span className="font-medium text-slate-900">{user?.name}</span>
                        <Avatar src={user?.avatar} fallback={user?.avatar} size="sm" color={user?.color} />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 统计卡片 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} label="全部任务" value={stats.total} color="text-[#001C3D]" bgColor="bg-[#001C3D]/10" />
                    <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="进行中" value={stats.inProgress} color="text-blue-600" bgColor="bg-blue-100" />
                    <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="已完成" value={stats.done} color="text-emerald-600" bgColor="bg-emerald-100" />
                    <StatCard icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} label="已逾期" value={stats.overdue} color="text-red-600" bgColor="bg-red-100" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 完成率环形图 */}
                    <Card variant="default" padding="md" className="animate-fade-in-up stagger-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6">任务完成率</h3>
                        <div className="flex items-center justify-center">
                            <div className="relative">
                                <ProgressRing progress={stats.completionRate} size={160} strokeWidth={12} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-gray-900">{stats.completionRate}%</span>
                                    <span className="text-sm text-gray-500">完成率</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="text-center"><div className="text-2xl font-bold text-slate-900">{stats.done}</div><div className="text-xs text-slate-500">已完成</div></div>
                            <div className="text-center"><div className="text-2xl font-bold text-slate-900">{stats.total - stats.done}</div><div className="text-xs text-slate-500">待处理</div></div>
                        </div>
                    </Card>

                    {/* 即将到期 */}
                    <Card variant="default" padding="md" className="lg:col-span-2 animate-fade-in-up stagger-2">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-slate-900">即将到期</h3>
                            <button onClick={() => navigate('/')} className="text-sm text-[#001C3D] hover:text-[#0F4C81] font-medium transition-colors">查看全部 →</button>
                        </div>
                        {upcomingDeadlines.length === 0 ? (
                            <div className="text-center py-8 text-gray-400"><svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p>暂无即将到期的任务</p></div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingDeadlines.map((task) => {
                                    const dueDate = new Date(task.dueDate!);
                                    const isOverdue = dueDate < new Date();
                                    const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                    return (
                                        <div key={task.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate('/')}>
                                            <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : daysLeft <= 1 ? 'bg-orange-500' : 'bg-green-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 truncate">{task.title}</div>
                                                <div className="text-sm text-gray-500">{dueDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${priorityColors[task.priority] || 'bg-gray-100 text-gray-600'}`}>{task.priority === Priority.HIGH ? '高' : task.priority === Priority.MEDIUM ? '中' : '低'}</span>
                                            <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{isOverdue ? '已逾期' : daysLeft === 0 ? '今天' : daysLeft === 1 ? '明天' : `${daysLeft}天后`}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                {/* 团队成员 */}
                <Card variant="default" padding="md" className="mt-8 animate-fade-in-up stagger-3">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-slate-900">团队成员</h3>
                        <Badge variant="default" size="md">{members.length} 位成员</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {members.slice(0, 10).map((member) => {
                            const memberTasks = tasks.filter(t => t.assigneeId === member.id);
                            const completedTasks = memberTasks.filter(t => t.status === TaskStatus.DONE).length;
                            return (
                                <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all hover:shadow-sm cursor-pointer group">
                                    <Avatar src={member.avatar} fallback={member.avatar} size="md" color={member.color} className="group-hover:scale-105 transition-transform" />
                                    <div>
                                        <div className="font-medium text-slate-900 text-sm">{member.name}</div>
                                        <div className="text-xs text-slate-500">{completedTasks}/{memberTasks.length} 完成</div>
                                    </div>
                                </div>
                            );
                        })}
                        {members.length > 10 && <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 text-sm text-slate-600 font-medium">+{members.length - 10}</div>}
                    </div>
                </Card>
            </main>
        </div>
    );
};

export default DashboardPage;
