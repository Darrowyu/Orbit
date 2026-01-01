import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, TeamMember, Team } from '../types';
import { NotificationBell } from './NotificationBell';
import { Button, IconButton, Avatar } from './ui';

interface HeaderProps {
  user: User;
  currentTeam: Team | null;
  members: TeamMember[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterAssignee: string;
  setFilterAssignee: (a: string) => void;
  sortOption: string;
  setSortOption: (s: string) => void;
  onNewTask: () => void;
  onTeamSettings: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = memo(({
  user, currentTeam, members, searchQuery, setSearchQuery, filterAssignee, setFilterAssignee,
  sortOption, setSortOption, onNewTask, onTeamSettings, onLogout
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-[var(--shadow-sm)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Team */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative">
              <img src="/Orbit_Logo.png" alt="Orbit" className="w-9 h-9 rounded-xl shadow-[var(--shadow-brand-sm)] group-hover:shadow-[var(--shadow-brand)] transition-shadow" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#001C3D]/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#001C3D] to-[#0F4C81] tracking-tight">Orbit</h1>
          </div>
          {currentTeam && (
            <button onClick={onTeamSettings} className="ml-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 flex items-center gap-1.5 transition-all hover:shadow-sm">
              <span className="font-medium">{currentTeam.name}</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative hidden lg:block group">
            <input 
              type="text" 
              placeholder="搜索任务..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-48 xl:w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] bg-slate-50/50 hover:bg-white transition-all placeholder:text-slate-400" 
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#001C3D] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          {/* Filters */}
          <div className="relative">
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="appearance-none bg-slate-50/50 hover:bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] pl-3 pr-9 py-2 cursor-pointer min-w-[110px] transition-all">
              <option value="ALL">所有成员</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div className="relative hidden sm:block">
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="appearance-none bg-slate-50/50 hover:bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] pl-3 pr-9 py-2 cursor-pointer min-w-[110px] transition-all">
              <option value="DEFAULT">默认排序</option>
              <option value="PRIORITY_DESC">优先级 ↓</option>
              <option value="DATE_DESC">时间 ↓</option>
            </select>
            <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>

          {/* New Task Button */}
          <Button 
            onClick={onNewTask} 
            leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>}
          >
            <span className="hidden sm:inline">新建任务</span>
            <span className="sm:hidden">新建</span>
          </Button>

          {/* Divider & User Actions */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 ml-1">
            <IconButton onClick={() => navigate('/dashboard')} title="仪表盘" className="text-slate-400 hover:text-[#001C3D] hover:bg-[#001C3D]/5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
            </IconButton>
            
            <NotificationBell />
            
            {user.isSuperAdmin && (
              <IconButton onClick={() => navigate('/admin')} title="管理后台" className="text-slate-400 hover:text-[#001C3D] hover:bg-[#001C3D]/5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </IconButton>
            )}
            
            <Avatar 
              src={user.avatar} 
              alt={user.name}
              fallback={user.avatar}
              size="sm" 
              color={user.color}
              onClick={() => navigate('/profile')}
              className="ml-1"
            />
            
            <IconButton onClick={onLogout} title="退出登录" className="text-slate-400 hover:text-red-500 hover:bg-red-50">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </IconButton>
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
export default Header;
