import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../stores/taskStore';
import { useTeamStore } from '../stores/teamStore';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import { TaskStatus, Priority } from '../types';
import { Avatar, Badge } from '../components/ui';
import { BurndownChart } from '../components/BurndownChart';
import { TeamWorkloadChart } from '../components/TeamWorkloadChart';

const StatCard: React.FC<{ label: string; value: number | string; trend?: string }> = ({ label, value, trend }) => (
    <div className="minimal-card p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-neutral-500 font-medium">{label}</span>
            {trend && <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{trend}</span>}
        </div>
        <div className="text-3xl font-semibold text-neutral-900 tracking-tight">{value}</div>
    </div>
);

const ProgressRing: React.FC<{ progress: number; size?: number; strokeWidth?: number }> = ({ progress, size = 120, strokeWidth = 6 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-neutral-100" />
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="text-neutral-900 transition-all duration-700" />
        </svg>
    );
};

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { tasks, fetchTasks } = useTaskStore();
    const { currentTeam, members } = useTeamStore();
    const { projects } = useProjectStore();
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    useEffect(() => { if (user?.currentTeamId) fetchTasks(); }, [user?.currentTeamId, fetchTasks]);
    useEffect(() => { if (projects.length > 0 && !selectedProjectId) setSelectedProjectId(projects[0].id); }, [projects, selectedProjectId]);

    const dateRange = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 14);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }, []);

    const stats = useMemo(() => {
        const myTasks = tasks.filter(t => t.assigneeId === user?.id);
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

    return (
        <div className="min-h-screen bg-neutral-50/50">
            {/* 极简头部 */}
            <header className="bg-white border-b border-neutral-100 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="h-5 w-px bg-neutral-200" />
                        <div>
                            <h1 className="text-base font-semibold text-neutral-900">仪表盘</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-neutral-500">{currentTeam?.name}</span>
                        <Avatar src={user?.avatar} fallback={user?.avatar} size="sm" color={user?.color} />
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* 欢迎语 */}
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-neutral-900 mb-1">欢迎回来，{user?.name}</h2>
                    <p className="text-neutral-500">这是您的工作概览</p>
                </div>

                {/* 统计卡片 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard label="全部任务" value={stats.total} />
                    <StatCard label="进行中" value={stats.inProgress} />
                    <StatCard label="已完成" value={stats.done} />
                    <StatCard label="已逾期" value={stats.overdue} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 完成率 */}
                    <div className="minimal-card p-6 animate-fade-in-up">
                        <h3 className="text-sm font-medium text-neutral-500 mb-6">完成率</h3>
                        <div className="flex items-center justify-center">
                            <div className="relative">
                                <ProgressRing progress={stats.completionRate} size={140} strokeWidth={8} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-semibold text-neutral-900">{stats.completionRate}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-center gap-8 text-center">
                            <div><div className="text-xl font-semibold text-neutral-900">{stats.done}</div><div className="text-xs text-neutral-400">已完成</div></div>
                            <div><div className="text-xl font-semibold text-neutral-900">{stats.total - stats.done}</div><div className="text-xs text-neutral-400">待处理</div></div>
                        </div>
                    </div>

                    {/* 即将到期 */}
                    <div className="minimal-card p-6 lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-neutral-500">即将到期</h3>
                            <button onClick={() => navigate('/')} className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors">查看全部</button>
                        </div>
                        {upcomingDeadlines.length === 0 ? (
                            <div className="text-center py-12 text-neutral-400">
                                <p className="text-sm">暂无即将到期的任务</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {upcomingDeadlines.map((task) => {
                                    const dueDate = new Date(task.dueDate!);
                                    const isOverdue = dueDate < new Date();
                                    const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                    return (
                                        <div key={task.id} onClick={() => navigate('/')} className="flex items-center gap-4 p-3 -mx-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer group">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : daysLeft <= 1 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-neutral-900 truncate group-hover:text-neutral-700">{task.title}</div>
                                            </div>
                                            <span className={`text-xs ${isOverdue ? 'text-red-500' : 'text-neutral-400'}`}>
                                                {isOverdue ? '已逾期' : daysLeft === 0 ? '今天' : daysLeft === 1 ? '明天' : `${daysLeft}天后`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 报表区域 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {selectedProjectId && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            <div className="mb-3 flex items-center justify-between">
                                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <BurndownChart projectId={selectedProjectId} startDate={dateRange.start} endDate={dateRange.end} />
                        </div>
                    )}
                    <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                        <TeamWorkloadChart />
                    </div>
                </div>

                {/* 团队成员 */}
                <div className="minimal-card p-6 mt-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-neutral-500">团队成员</h3>
                        <Badge variant="default" size="sm">{members.length} 人</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {members.slice(0, 12).map((member) => {
                            const memberTasks = tasks.filter(t => t.assigneeId === member.id);
                            const completedTasks = memberTasks.filter(t => t.status === TaskStatus.DONE).length;
                            return (
                                <div key={member.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer">
                                    <Avatar src={member.avatar} fallback={member.avatar} size="sm" color={member.color} />
                                    <div>
                                        <div className="text-sm font-medium text-neutral-900">{member.name}</div>
                                        <div className="text-xs text-neutral-400">{completedTasks}/{memberTasks.length}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {members.length > 12 && <div className="flex items-center justify-center px-3 py-2 rounded-lg bg-neutral-100 text-sm text-neutral-500">+{members.length - 12}</div>}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
