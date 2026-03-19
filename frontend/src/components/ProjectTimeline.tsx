import { memo } from 'react';
import { Card, Badge } from './ui';
import type { Project, ProjectStatus } from '../types';

interface ProjectTimelineProps {
    project: Project;
}

// 项目时间轴组件（展示日期进度）
export const ProjectTimeline = memo(function ProjectTimeline({ project }: ProjectTimelineProps) {
    const today = new Date();
    const start = project.startDate ? new Date(project.startDate) : null;
    const end = project.endDate ? new Date(project.endDate) : null;

    if (!start && !end) return null;

    const timeProgress = start && end
        ? Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100))
        : null;
    const isOverdue = Boolean(end && today > end && project.status !== ('COMPLETED' as ProjectStatus));
    const daysRemaining = end ? Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    function getBadgeVariant(): 'danger' | 'warning' | 'default' { // 根据逾期状态返回徽章样式
        if (isOverdue) return 'danger';
        if (daysRemaining !== null && daysRemaining <= 7) return 'warning';
        return 'default';
    }

    function getDaysLabel(): string { // 根据剩余天数返回文本
        if (isOverdue) return '已逾期';
        if (daysRemaining === 0) return '今天截止';
        return `剩余 ${daysRemaining} 天`;
    }

    return (
        <Card variant="ghost" padding="sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    项目周期
                </span>
                {daysRemaining !== null && (
                    <Badge variant={getBadgeVariant()} size="sm">{getDaysLabel()}</Badge>
                )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                <span>{start ? new Date(start).toLocaleDateString('zh-CN') : '未设置'}</span>
                <span className="flex-1 border-t border-dashed border-slate-300" />
                <span>{end ? new Date(end).toLocaleDateString('zh-CN') : '未设置'}</span>
            </div>
            {timeProgress !== null && (
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isOverdue ? 'bg-red-500' : 'bg-[#001C3D]'}`} style={{ width: `${timeProgress}%` }} />
                </div>
            )}
        </Card>
    );
});
