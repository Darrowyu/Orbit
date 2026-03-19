import { memo } from 'react';
import { Card, Badge } from './ui';
import type { ProjectStats } from '../types';

interface ProjectStatsPanelProps {
    stats: ProjectStats;
    projectColor: string;
}

// 项目统计面板组件
export const ProjectStatsPanel = memo(function ProjectStatsPanel({ stats, projectColor }: ProjectStatsPanelProps) {
    return (
        <div className="space-y-6">
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
                    <span className="text-sm font-bold" style={{ color: projectColor }}>{stats.progress}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats.progress}%`, backgroundColor: projectColor }} />
                </div>
            </div>

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
    );
});
