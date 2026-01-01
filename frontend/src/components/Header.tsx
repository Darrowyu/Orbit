import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, TeamMember, Team } from '../types';
import { NotificationBell } from './NotificationBell';
import { Button } from './Button';

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
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/Orbit_Logo.png" alt="Orbit" className="w-9 h-9 rounded-xl shadow-lg shadow-indigo-200" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-800 tracking-tight">Orbit</h1>
          {currentTeam && (
            <button onClick={onTeamSettings} className="ml-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-1 transition-colors">
              <span>{currentTeam.name}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative hidden lg:block">
            <input type="text" placeholder="搜索任务..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 xl:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 transition-all" />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="appearance-none bg-slate-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 pl-3 pr-8 py-2 cursor-pointer min-w-[120px]">
            <option value="ALL">所有成员</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="appearance-none bg-slate-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 pl-3 pr-8 py-2 cursor-pointer hidden sm:block min-w-[120px]">
            <option value="DEFAULT">默认排序</option>
            <option value="PRIORITY_DESC">优先级 (高→低)</option>
            <option value="DATE_DESC">创建时间 (新→旧)</option>
          </select>
          <Button onClick={onNewTask} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}>
            <span className="hidden sm:inline">新建任务</span><span className="sm:hidden">新建</span>
          </Button>
          <div className="flex items-center gap-2 border-l pl-4 ml-2">
            <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="仪表盘">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
            </button>
            <NotificationBell />
            {user.isSuperAdmin && (
              <button onClick={() => navigate('/admin')} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="管理后台">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            )}
            <button onClick={() => navigate('/profile')} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm hover:ring-2 hover:ring-indigo-300 transition-all cursor-pointer overflow-hidden ${user.avatar?.startsWith('/uploads') ? 'bg-gray-100' : user.color}`} title="个人设置">
              {user.avatar?.startsWith('/uploads') ? <img src={`${apiUrl}${user.avatar}`} alt="avatar" className="w-full h-full object-cover" /> : user.avatar}
            </button>
            <button onClick={onLogout} className="text-gray-400 hover:text-gray-600 p-1" title="退出登录">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
export default Header;
