import { memo, useState } from 'react';
import { Project, ProjectStatus } from '../types';
import { ProjectCard } from './ProjectCard';
import { Button, Card } from './ui';
import { IconButton } from './ui/IconButton';

interface ProjectSidebarProps {
    projects: Project[];
    archivedProjects: Project[];
    currentProject: Project | null;
    onSelectProject: (project: Project | null) => void;
    onCreateProject: () => void;
    onEditProject: (project: Project) => void;
    onArchiveProject: (id: string) => void;
    onRestoreProject: (id: string) => void;
    onDeleteProject: (id: string) => void;
    loading?: boolean;
}

export const ProjectSidebar = memo(function ProjectSidebar({
    projects,
    archivedProjects,
    currentProject,
    onSelectProject,
    onCreateProject,
    onEditProject,
    onArchiveProject,
    onRestoreProject,
    onDeleteProject,
    loading,
}: ProjectSidebarProps) {
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const activeProjects = filteredProjects.filter(p => p.status === ProjectStatus.ACTIVE);
    const otherProjects = filteredProjects.filter(p => p.status !== ProjectStatus.ACTIVE && p.status !== ProjectStatus.ARCHIVED);

    return (
        <div className="w-80 h-full bg-slate-50/80 border-r border-slate-200 flex flex-col">
            {/* 头部 */}
            <div className="p-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#001C3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        项目列表
                    </h2>
                    <IconButton icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>} onClick={onCreateProject} size="sm" variant="primary" />
                </div>

                {/* 搜索框 */}
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="搜索项目..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* 项目列表 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-[#001C3D] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* 全部任务入口 */}
                        <Card
                            variant={!currentProject ? 'bordered' : 'default'}
                            padding="sm"
                            hoverable
                            clickable
                            onClick={() => onSelectProject(null)}
                            className={!currentProject ? 'ring-2 ring-[#001C3D]/30 border-[#001C3D]' : ''}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#001C3D] to-[#0f4c81] flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                                </div>
                                <div>
                                    <div className="font-medium text-slate-800">所有任务</div>
                                    <div className="text-xs text-slate-500">查看全部任务</div>
                                </div>
                            </div>
                        </Card>

                        {/* 进行中的项目 */}
                        {activeProjects.length > 0 && (
                            <div className="pt-2">
                                <div className="px-2 py-1 text-xs font-medium text-slate-400 uppercase tracking-wider">进行中 ({activeProjects.length})</div>
                                <div className="space-y-2 mt-1">
                                    {activeProjects.map(p => (
                                        <ProjectCard
                                            key={p.id}
                                            project={p}
                                            isActive={currentProject?.id === p.id}
                                            onClick={() => onSelectProject(p)}
                                            onEdit={() => onEditProject(p)}
                                            onArchive={() => onArchiveProject(p.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 其他状态的项目 */}
                        {otherProjects.length > 0 && (
                            <div className="pt-2">
                                <div className="px-2 py-1 text-xs font-medium text-slate-400 uppercase tracking-wider">其他 ({otherProjects.length})</div>
                                <div className="space-y-2 mt-1">
                                    {otherProjects.map(p => (
                                        <ProjectCard
                                            key={p.id}
                                            project={p}
                                            isActive={currentProject?.id === p.id}
                                            onClick={() => onSelectProject(p)}
                                            onEdit={() => onEditProject(p)}
                                            onArchive={() => onArchiveProject(p.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 空状态 */}
                        {projects.length === 0 && !loading && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <p className="text-slate-500 mb-2">还没有项目</p>
                                <Button onClick={onCreateProject} variant="ghost" size="sm">创建第一个项目</Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 归档项目入口 */}
            {archivedProjects.length > 0 && (
                <div className="p-3 border-t border-slate-200 bg-white/80">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 text-sm text-slate-600 transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            已归档 ({archivedProjects.length})
                        </span>
                        <svg className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {showArchived && (
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                            {archivedProjects.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-sm border border-slate-100">
                                    <span className="text-slate-600 truncate">{p.name}</span>
                                    <div className="flex gap-1 shrink-0">
                                        <IconButton icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>} onClick={() => onRestoreProject(p.id)} size="xs" variant="ghost" title="恢复" />
                                        <IconButton icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>} onClick={() => onDeleteProject(p.id)} size="xs" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" title="删除" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
