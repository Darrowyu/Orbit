import { memo } from 'react';
import { User } from '../types';
import { Button, Select } from './ui';

interface FilterBarProps {
  members: User[];
  filterAssignee: string;
  setFilterAssignee: (a: string) => void;
  sortOption: string;
  setSortOption: (s: string) => void;
  onNewTask: () => void;
}

export const FilterBar = memo(function FilterBar({
  members, filterAssignee, setFilterAssignee, sortOption, setSortOption, onNewTask
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-8 py-3 sm:py-4 bg-[#FAFAFA]">
      {/* 筛选器 */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
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

      {/* 新建按钮 */}
      <Button 
        onClick={onNewTask} 
        size="sm"
        className="w-full sm:w-auto"
        leftIcon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        }
      >
        新建任务
      </Button>
    </div>
  );
});
