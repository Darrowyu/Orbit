import { memo } from 'react';
import { User } from '../types';
import { Button, Select } from './ui';

interface FilterBarProps {
  members: User[];
  filterAssignee: string;
  setFilterAssignee: (a: string) => void;
  sortOption: string;
  setSortOption: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onNewTask: () => void;
}

export const FilterBar = memo(function FilterBar({
  members, filterAssignee, setFilterAssignee, sortOption, setSortOption, searchQuery, setSearchQuery, selectionMode, onToggleSelectionMode, onNewTask
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-[#FAFAFA]">
      {/* 筛选器 */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
        {/* 看板本地过滤 */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="筛选看板..."
            className="h-8 w-36 sm:w-44 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto">
          <button 
            className={`px-2 sm:px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${filterAssignee === 'ALL' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`} 
            onClick={() => setFilterAssignee('ALL')}
          >
            全部
          </button>
          {members.slice(0, 3).map(m => (
            <button 
              key={m.id} 
              className={`hidden sm:block px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${filterAssignee === m.id ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`} 
              onClick={() => setFilterAssignee(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
        
        <Select 
          value={sortOption} 
          onChange={e => setSortOption(e.target.value)} 
          size="sm" 
          options={[
            { value: 'DEFAULT', label: '默认排序' }, 
            { value: 'PRIORITY_DESC', label: '优先级 ↓' }, 
            { value: 'DATE_DESC', label: '时间 ↓' }
          ]} 
        />
      </div>

      {/* 多选 + 新建按钮 */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant={selectionMode ? 'outline' : 'secondary'}
          size="sm"
          onClick={onToggleSelectionMode}
          className="flex-1 sm:flex-none"
          leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        >
          {selectionMode ? '退出多选' : '多选'}
        </Button>
        <Button
          id="onboarding-new-task"
          onClick={onNewTask}
          size="sm"
          className="flex-1 sm:flex-none"
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          新建任务
        </Button>
      </div>
    </div>
  );
});
