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
import { SimpleBurndownChart } from './SimpleBurndownChart';
import { ProjectStatsPanel } from './ProjectStatsPanel';
import { ProjectTimeline } from './ProjectTimeline';

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

    useEffect(() => { fetchProjectStats(project.id); }, [project.id, fetchProjectStats]); // 获取项目统计

    useEffect(() => { // 获取 Cockpit 数据
        let cancelled = false;
        const loadCockpitData = async () => {
            setLoading(true);
            try {
                const { data } = await projectApi.getCockpit(project.id);
                if (!cancelled) setCockpitData(data);
            } catch {
                // 静默处理错误，使用现有统计数据
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadCockpitData();
        return () => { cancelled = true; };
    }, [project.id]);

    const stats = currentStats || { total: 0, byStatus: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 }, byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 }, progress: 0 };
    const risks = cockpitData?.risks || { overdue: [], highPriority: [], blocked: [] };
    const burndownData = cockpitData?.burndown || [];
    const cumulativeFlowData = cockpitData?.cumulativeFlow || [];
    const teamWorkloadData = cockpitData?.teamWorkload || [];
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
                {project.description && (
                    <p className="text-slate-600 mb-6 leading-relaxed">{project.description}</p>
                )}

                {/* 第一行：风险预警、燃尽图、累积流图、团队负载 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="col-span-1">
                        <RiskAlertPanel overdue={risks.overdue} highPriority={risks.highPriority} blocked={risks.blocked} loading={loading} onTaskClick={onTaskClick} />
                    </div>
                    <div className="col-span-1 h-48">
                        <SimpleBurndownChart data={burndownData} loading={loading} />
                    </div>
                    <div className="col-span-1 h-48">
                        <CumulativeFlowChart data={cumulativeFlowData} loading={loading} />
                    </div>
                    <div className="col-span-1 h-48">
                        <TeamWorkloadChart data={teamWorkloadData} loading={loading} />
                    </div>
                </div>

                {/* 第二行：统计面板(8列) | 近期活动(4列) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                    <div className="lg:col-span-8 space-y-6">
                        <ProjectStatsPanel stats={stats} projectColor={project.color} />
                        <ProjectTimeline project={project} />
                    </div>
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
