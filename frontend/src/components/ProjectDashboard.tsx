import { memo, useEffect } from 'react';
import { Project, ProjectStatus, TeamMember } from '../types';
import { useProjectStore } from '../stores/projectStore';
import { Card, Badge, Button, Avatar } from './ui';
import { MilestoneList } from './MilestoneList';

interface ProjectDashboardProps {
    project: Project;
    teamMembers: TeamMember[];
    onEditProject: () => void;
    onManageMembers: () => void;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
    [ProjectStatus.ACTIVE]: { label: '进行中', variant: 'success' },
    [ProjectStatus.ON_HOLD]: { label: '暂停', variant: 'warning' },
    [ProjectStatus.COMPLETED]: { label: '已完成', variant: 'info' },
    [ProjectStatus.ARCHIVED]: { label: '已归档', variant: 'default' },
};

export const ProjectDashboard = memo(function ProjectDashboard({ project, teamMembers: _teamMembers, onEditProject, onManageMembers }: ProjectDashboardProps) {
    const { currentStats, fetchProjectStats } = useProjectStore();
    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG[ProjectStatus.ACTIVE];

    useEffect(() => { fetchProjectStats(project.id); }, [project.id, fetchProjectStats]);

    const stats = currentStats || { total: 0, byStatus: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 }, byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 }, progress: 0 };

    // 计算日期进度
    const today = new Date();
    const start = project.startDate ? new Date(project.startDate) : null;
    const end = project.endDate ? new Date(project.endDate) : null;
    const timeProgress = start && end ? Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)) : null;
    const isOverdue = end && today > end && project.status !== ProjectStatus.COMPLETED;
    const daysRemaining = end ? Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

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

                {/* 统计卡片 */}
                <div className="grid grid-cols-4 gap-4 mb-6">
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
                <div className="mb-6">
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
                    <Card variant="ghost" padding="sm" className="mb-6">
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
                <div className="mb-6">
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
