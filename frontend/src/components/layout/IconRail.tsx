import { memo, useState } from 'react';
import { Project, ProjectStatus } from '../../types';

interface IconRailProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  onCreateProject: () => void;
  onSettings: () => void;
}

export const IconRail = memo(function IconRail({
  projects, currentProject, onSelectProject, onCreateProject, onSettings
}: IconRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const activeProjects = projects.filter(p => p.status === ProjectStatus.ACTIVE);

  return (
    <div
      className="hidden sm:flex h-full bg-white border-r border-slate-200 flex-col transition-all duration-200 ease-out overflow-hidden"
      style={{ width: isExpanded ? 240 : 48 }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* 项目列表 */}
      <div className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {/* 所有任务 */}
        <button
          onClick={() => onSelectProject(null)}
          className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${!currentProject ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
        >
          <div className="relative flex-shrink-0 w-6 flex items-center justify-center">
            {!currentProject && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#001C3D] rounded-full" />}
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#001C3D] to-[#0f4c81]" />
          </div>
          <span className={`text-sm text-slate-700 truncate whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>所有任务</span>
        </button>

        {/* 分隔线 */}
        {activeProjects.length > 0 && <div className="h-px bg-slate-100 my-2 mx-3" />}

        {/* 项目列表 */}
        {activeProjects.map(p => (
          <button
            key={p.id}
            onClick={() => onSelectProject(p)}
            className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${currentProject?.id === p.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
          >
            <div className="relative flex-shrink-0 w-6 flex items-center justify-center">
              {currentProject?.id === p.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#001C3D] rounded-full" />}
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            </div>
            <span className={`text-sm text-slate-700 truncate whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>{p.name}</span>
          </button>
        ))}
      </div>

      {/* 底部操作 */}
      <div className="py-3 border-t border-slate-100">
        <button onClick={onCreateProject} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors">
          <div className="flex-shrink-0 w-6 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className={`text-sm text-slate-600 whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>新建项目</span>
        </button>
        <button onClick={onSettings} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors">
          <div className="flex-shrink-0 w-6 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className={`text-sm text-slate-600 whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>团队设置</span>
        </button>
      </div>
    </div>
  );
});
