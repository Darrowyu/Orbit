import { memo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Project } from '../../types';
import { NotificationBell } from '../NotificationBell';
import { Avatar, IconButton } from '../ui';

interface SlimHeaderProps {
  user: User;
  currentProject: Project | null;
  projects: Project[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectProject: (project: Project | null) => void;
  onLogout: () => void;
}

export const SlimHeader = memo(function SlimHeader({
  user, currentProject, projects, searchQuery, setSearchQuery, onSelectProject, onLogout
}: SlimHeaderProps) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProject = (project: Project | null) => {
    onSelectProject(project);
    setIsDropdownOpen(false);
  };

  return (
    <header className="h-12 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Logo + 项目切换 */}
        <div className="flex items-center gap-4">
          <img src="/Orbit_Logo.png" alt="Orbit" className="w-7 h-7 rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')} />
          
          {/* 项目切换器 */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {currentProject ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentProject.color }} />
                  <span className="text-sm font-medium text-slate-700">{currentProject.name}</span>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-700">所有任务</span>
              )}
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* 下拉菜单 */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 animate-fade-in-down z-50">
                <button 
                  onClick={() => handleSelectProject(null)} 
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${!currentProject ? 'bg-slate-50' : ''}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#001C3D] to-[#0f4c81]" />
                  所有任务
                </button>
                {projects.length > 0 && <div className="h-px bg-slate-100 my-1" />}
                {projects.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => handleSelectProject(p)} 
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${currentProject?.id === p.id ? 'bg-slate-50' : ''}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 搜索框 - 中屏以上显示 */}
        <div className="hidden md:block flex-1 max-w-md mx-4 lg:mx-8">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索任务..."
              className="w-full h-9 pl-9 pr-4 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 小屏搜索按钮 */}
          <IconButton onClick={() => {}} title="搜索" className="md:hidden text-slate-400 hover:text-[#001C3D] hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </IconButton>
          <IconButton onClick={() => navigate('/dashboard')} title="仪表盘" className="hidden sm:flex text-slate-400 hover:text-[#001C3D] hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
          </IconButton>
          <NotificationBell />
          {user.isSuperAdmin && (
            <IconButton onClick={() => navigate('/admin')} title="管理后台" className="hidden sm:flex text-slate-400 hover:text-[#001C3D] hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </IconButton>
          )}
          <Avatar src={user.avatar} alt={user.name} fallback={user.avatar} size="sm" color={user.color} onClick={() => navigate('/profile')} className="cursor-pointer" />
          <IconButton onClick={onLogout} title="退出登录" className="text-slate-400 hover:text-red-500 hover:bg-red-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </IconButton>
        </div>
      </div>
    </header>
  );
});
