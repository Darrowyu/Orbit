import { memo } from 'react';
import { Project, ProjectStatus } from '../types';
import { Card, Badge } from './ui';

interface ProjectCardProps {
    project: Project;
    onClick?: () => void;
    onEdit?: () => void;
    onArchive?: () => void;
    isActive?: boolean;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'default' }> = {
    [ProjectStatus.ACTIVE]: { label: '进行中', variant: 'success' },
    [ProjectStatus.ON_HOLD]: { label: '暂停', variant: 'warning' },
    [ProjectStatus.COMPLETED]: { label: '已完成', variant: 'info' },
    [ProjectStatus.ARCHIVED]: { label: '已归档', variant: 'default' },
};

export const ProjectCard = memo(function ProjectCard({ project, onClick, onEdit, onArchive, isActive }: ProjectCardProps) {
    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG[ProjectStatus.ACTIVE];

    return (
        <Card
            variant={isActive ? 'bordered' : 'default'}
            padding="none"
            hoverable
            clickable={!!onClick}
            onClick={onClick}
            className={`group relative overflow-hidden ${isActive ? 'ring-2 ring-[#001C3D]/30 border-[#001C3D]' : ''}`}
        >
            {/* 颜色指示条 */}
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: project.color }} />

            <div className="p-4 pl-5">
                {/* 头部：名称和状态 */}
                <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-800 text-base leading-tight pr-2 line-clamp-1">{project.name}</h3>
                    <Badge variant={status.variant} size="sm">{status.label}</Badge>
                </div>

                {/* 描述 */}
                {project.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{project.description}</p>
                )}

                {/* 底部信息 */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                        {/* 任务数 */}
                        <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            {project.taskCount} 任务
                        </span>
                        {/* 成员数 */}
                        <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {project.members.length}
                        </span>
                    </div>

                    {/* 日期范围 */}
                    {(project.startDate || project.endDate) && (
                        <span className="text-slate-400">
                            {project.startDate ? new Date(project.startDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
                            {project.startDate && project.endDate && ' - '}
                            {project.endDate ? new Date(project.endDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                    )}
                </div>

                {/* 成员头像 */}
                {project.members.length > 0 && (
                    <div className="flex items-center mt-3 -space-x-2">
                        {project.members.slice(0, 5).map(m => (
                            <div key={m.id} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium shadow-sm" style={{ backgroundColor: `${m.user.color}20`, color: m.user.color }}>
                                {m.user.avatar?.startsWith('http') ? <img src={m.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : m.user.name?.charAt(0)}
                            </div>
                        ))}
                        {project.members.length > 5 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs text-slate-500">+{project.members.length - 5}</div>
                        )}
                    </div>
                )}
            </div>

            {/* 操作按钮（hover 显示） */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {onEdit && (
                    <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg bg-white/90 hover:bg-slate-100 text-slate-400 hover:text-[#001C3D] shadow-sm transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                    </button>
                )}
                {onArchive && (
                    <button onClick={e => { e.stopPropagation(); onArchive(); }} className="p-1.5 rounded-lg bg-white/90 hover:bg-slate-100 text-slate-400 hover:text-[#001C3D] shadow-sm transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </button>
                )}
            </div>
        </Card>
    );
});
