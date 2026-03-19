import { memo, useEffect, useState } from 'react';
import { Project, ProjectStatus, TeamMember, Task, ProjectCockpitData } from '../types';
import { projectApi } from '../services/api';
import { useProjectStore } from '../stores/projectStore';
import { Card, Badge, Button, Avatar } from './ui';
import { MilestoneList } from './MilestoneList';
import { RiskAlertPanel } from './RiskAlertPanel';
import { ProjectActivityFeed } from './ProjectActivityFeed';
import { CumulativeFlowChart } from './CumulativeFlowChart';
import { TeamWorkloadChart } from './TeamWorkloadChart';

interface ProjectDashboardProps {
    project: Project;
    teamMembers: TeamMember[];
    onEditProject: () => void;
    onManageMembers: () => void;
    onTaskClick?: (task: Task) => void;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
    [ProjectStatus.ACTIVE]: { label: '进行中', variant: 'success' },
    [ProjectStatus.ON_HOLD]: { label: '暂停', variant: 'warning' },
    [ProjectStatus.COMPLETED]: { label: '已完成', variant: 'info' },
    [ProjectStatus.ARCHIVED]: { label: '已归档', variant: 'default' },
};

// 简化版燃尽图组件 - 接受 data prop
interface SimpleBurndownChartProps {
    data: { date: string; remaining: number; completed: number }[];
    loading?: boolean;
}

const SimpleBurndownChart = memo(function SimpleBurndownChart({ data, loading }: SimpleBurndownChartProps) {
    if (loading) {
        return (
            <Card className="h-full" padding="md">
                <div className="text-sm font-medium text-slate-700 mb-2">燃尽图</div>
                <div className="flex-1 bg-slate-100 animate-pulse rounded min-h-[120px]" />
            </Card>
        );
    }

    // 计算SVG路径点
    const calculatePoints = () => {
        if (data.length === 0) return { actualPoints: '', idealPoints: '' };

        const maxRemaining = Math.max(...data.map(d => d.remaining), 1);
        const width = 100; // 百分比宽度
        const height = 100; // 百分比高度
        const padding = 10;

        const actualPoints = data.map((d, i) => {
            const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
            const y = padding + (height - padding * 2) - (d.remaining / maxRemaining) * (height - padding * 2);
            return `${x},${y}`;
        }).join(' ');

        // 理想线：从第一个remaining到0
        const idealStart = data[0]?.remaining || 0;
        const idealPoints = `${padding},${padding + (height - padding * 2) - (idealStart / maxRemaining) * (height - padding * 2)} ${width - padding},${height - padding}`;

        return { actualPoints, idealPoints, maxRemaining };
    };

    const { actualPoints, idealPoints } = calculatePoints();

    return (
        <Card className="h-full flex flex-col" padding="md">
            <div className="text-sm font-medium text-slate-700 mb-2">燃尽图</div>

            {data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm min-h-[120px]">
                    暂无数据
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-[120px]">
                    <svg viewBox="0 0 100 100" className="w-full flex-1" preserveAspectRatio="none">
                        {/* 网格线 */}
                        <line x1="10" y1="90" x2="90" y2="90" stroke="#e2e8f0" strokeWidth="0.5" />
                        <line x1="10" y1="10" x2="10" y2="90" stroke="#e2e8f0" strokeWidth="0.5" />

                        {/* 理想线 */}
                        <polyline points={idealPoints} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />

                        {/* 实际线 */}
                        <polyline points={actualPoints} fill="none" stroke="#001C3D" strokeWidth="1.5" />

                        {/* 数据点 */}
                        {data.map((d, i) => {
                            const maxRemaining = Math.max(...data.map(item => item.remaining), 1);
                            const x = 10 + (i / (data.length - 1 || 1)) * 80;
                            const y = 10 + 80 - (d.remaining / maxRemaining) * 80;
                            return <circle key={i} cx={x} cy={y} r="1.5" fill="#001C3D" />;
                        })}
                    </svg>

                    {/* 图例 */}
                    <div className="flex justify-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#001C3D]" /> 实际</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-400" style={{ borderTop: '1px dashed' }} /> 理想</span>
                    </div>
                </div>
            )}
        </Card>
    );
});

export const ProjectDashboard = memo(function ProjectDashboard({
    project,
    teamMembers: _teamMembers,
    onEditProject,
    onManageMembers,
    onTaskClick,
}: ProjectDashboardProps) {
    const { currentStats, fetchProjectStats } = useProjectStore();
    const [cockpitData, setCockpitData] = useState<ProjectCockpitData | null>(null);
    const [loading, setLoading] = useState(false);
    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG[ProjectStatus.ACTIVE];

    // 获取项目统计
    useEffect(() => {
        fetchProjectStats(project.id);
    }, [project.id, fetchProjectStats]);

    // 获取 Cockpit 数据
    useEffect(() => {
        let cancelled = false;
        const loadCockpitData = async () => {
            setLoading(true);
            try {
                const { data } = await projectApi.getCockpit(project.id);
                if (!cancelled) {
                    setCockpitData(data);
                }
            } catch (err) {
                // 静默处理错误，使用现有统计数据
                console.error('Failed to load cockpit data:', err);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        loadCockpitData();
        return () => { cancelled = true; };
    }, [project.id]);

    const stats = currentStats || { total: 0, byStatus: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 }, byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 }, progress: 0 };

    // 计算日期进度
    const today = new Date();
    const start = project.startDate ? new Date(project.startDate) : null;
    const end = project.endDate ? new Date(project.endDate) : null;
    const timeProgress = start && end ? Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)) : null;
    const isOverdue = end && today > end && project.status !== ProjectStatus.COMPLETED;
    const daysRemaining = end ? Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    // 风险数据
    const risks = cockpitData?.risks || { overdue: [], highPriority: [], blocked: [] };

    // 图表数据
    const burndownData = cockpitData?.burndown || [];
    const cumulativeFlowData = cockpitData?.cumulativeFlow || [];
    const teamWorkloadData = cockpitData?.teamWorkload || [];

    // 活动数据
    const activities = cockpitData?.activities || [];

    return (
        <Card variant="default" padding="none" className="overflow-hidden">
            {/* 头部 Banner */}
            <div className="relative h-32 overflow-hidden" style={{ backgroundColor: project.color }}>
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)', backgroundSize: '20px 20px' }} />

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                    <div>
                        <Badge variant={status.variant} size="sm" className="mb-2">{status.label}</Badge>
                        <h1 className="text-2xl font-bold text-white drop-shadow-sm">{project.name}</h1>
                    </div>
                    <Button onClick={onEditProject} variant="ghost" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                        编辑
                    </Button>
                </div>
            </div>

            <div className="p-6">
                {/* 描述 */}
                {project.description && (
                    <p className="text-slate-600 mb-6 leading-relaxed">{project.description}</p>
                )}

                {/* 第一行：风险预警、燃尽图、累积流图、团队负载 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* 风险预警 */}
                    <div className="col-span-1">
                        <RiskAlertPanel
                            overdue={risks.overdue}
                            highPriority={risks.highPriority}
                            blocked={risks.blocked}
                            loading={loading}
                            onTaskClick={onTaskClick}
                        />
                    </div>

                    {/* 燃尽图 */}
                    <div className="col-span-1 h-48">
                        <SimpleBurndownChart data={burndownData} loading={loading} />
                    </div>

                    {/* 累积流图 */}
                    <div className="col-span-1 h-48">
                        <CumulativeFlowChart data={cumulativeFlowData} loading={loading} />
                    </div>

                    {/* 团队负载 */}
                    <div className="col-span-1 h-48">
                        <TeamWorkloadChart data={teamWorkloadData} loading={loading} />
                    </div>
                </div>

                {/* 第二行：统计面板 + 进度 + 状态分布 (8列) | 近期活动 (4列) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                    {/* 左侧：统计面板 + 进度 + 状态分布 */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* 统计卡片 */}
                        <div className="grid grid-cols-4 gap-4">
                            <Card variant="ghost" padding="sm">
                                <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
                                <div className="text-sm text-slate-500">总任务</div>
                            </Card>
                            <Card variant="ghost" padding="sm" className="bg-blue-50">
                                <div className="text-2xl font-bold text-blue-600">{stats.byStatus.IN_PROGRESS + stats.byStatus.REVIEW}</div>
                                <div className="text-sm text-blue-500">进行中</div>
                            </Card>
                            <Card variant="ghost" padding="sm" className="bg-emerald-50">
                                <div className="text-2xl font-bold text-emerald-600">{stats.byStatus.DONE}</div>
                                <div className="text-sm text-emerald-500">已完成</div>
                            </Card>
                            <Card variant="ghost" padding="sm" className="bg-amber-50">
                                <div className="text-2xl font-bold text-amber-600">{stats.byPriority.HIGH}</div>
                                <div className="text-sm text-amber-500">高优先级</div>
                            </Card>
                        </div>

                        {/* 进度条 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-700">任务完成进度</span>
                                <span className="text-sm font-bold" style={{ color: project.color }}>{stats.progress}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats.progress}%`, backgroundColor: project.color }} />
                            </div>
                        </div>

                        {/* 时间进度（如果有日期） */}
                        {(start || end) && (
                            <Card variant="ghost" padding="sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        项目周期
                                    </span>
                                    {daysRemaining !== null && (
                                        <Badge variant={isOverdue ? 'danger' : daysRemaining <= 7 ? 'warning' : 'default'} size="sm">
                                            {isOverdue ? '已逾期' : daysRemaining === 0 ? '今天截止' : `剩余 ${daysRemaining} 天`}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                                    <span>{start ? new Date(start).toLocaleDateString('zh-CN') : '未设置'}</span>
                                    <span className="flex-1 border-t border-dashed border-slate-300" />
                                    <span>{end ? new Date(end).toLocaleDateString('zh-CN') : '未设置'}</span>
                                </div>
                                {timeProgress !== null && (
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${isOverdue ? 'bg-red-500' : 'bg-[#001C3D]'}`} style={{ width: `${Math.min(100, timeProgress)}%` }} />
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* 状态分布 */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-700 mb-3">任务状态分布</h3>
                            <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                                {stats.total > 0 && (
                                    <>
                                        <div className="bg-slate-400 transition-all" style={{ width: `${(stats.byStatus.TODO / stats.total) * 100}%` }} title={`待处理: ${stats.byStatus.TODO}`} />
                                        <div className="bg-blue-500 transition-all" style={{ width: `${(stats.byStatus.IN_PROGRESS / stats.total) * 100}%` }} title={`进行中: ${stats.byStatus.IN_PROGRESS}`} />
                                        <div className="bg-purple-500 transition-all" style={{ width: `${(stats.byStatus.REVIEW / stats.total) * 100}%` }} title={`审核中: ${stats.byStatus.REVIEW}`} />
                                        <div className="bg-emerald-500 transition-all" style={{ width: `${(stats.byStatus.DONE / stats.total) * 100}%` }} title={`已完成: ${stats.byStatus.DONE}`} />
                                    </>
                                )}
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />待处理 {stats.byStatus.TODO}</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />进行中 {stats.byStatus.IN_PROGRESS}</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />审核中 {stats.byStatus.REVIEW}</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />已完成 {stats.byStatus.DONE}</span>
                            </div>
                        </div>
                    </div>

                    {/* 右侧：近期活动动态 */}
                    <div className="lg:col-span-4">
                        <ProjectActivityFeed activities={activities} loading={loading} />
                    </div>
                </div>

                {/* 里程碑 */}
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">项目里程碑</h3>
                    <MilestoneList projectId={project.id} />
                </div>

                {/* 项目成员 */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">项目成员 ({project.members.length})</h3>
                        <Button onClick={onManageMembers} variant="ghost" size="xs">管理成员</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {project.members.map(m => (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                                <Avatar name={m.user.name} src={m.user.avatar?.startsWith('http') ? m.user.avatar : undefined} size="xs" color={m.user.color} />
                                <span className="text-sm text-slate-700">{m.user.name}</span>
                                {m.role === 'owner' && <Badge variant="warning" size="sm">负责人</Badge>}
                                {m.role === 'admin' && <Badge variant="info" size="sm">管理员</Badge>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
});
