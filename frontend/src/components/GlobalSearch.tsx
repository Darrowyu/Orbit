import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from './ui/Input';
import { searchApi, SearchResult } from '../services/api';
import { Badge } from './ui/Badge';

interface GlobalSearchProps {
  onSelectTask?: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectTask, onSelectProject }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const { data } = await searchApi.search(q);
      setResults(data);
      setIsOpen(true);
    } finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = wrapperRef.current?.querySelector('input');
        input?.focus();
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasResults = results && (results.tasks.length || results.projects.length || results.comments.length);
  const statusMap: Record<string, 'default' | 'primary' | 'warning' | 'success'> = { TODO: 'default', IN_PROGRESS: 'primary', REVIEW: 'warning', DONE: 'success' };
  const statusLabels: Record<string, string> = { TODO: '待办', IN_PROGRESS: '进行中', REVIEW: '审核', DONE: '完成' };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <Input 
        value={query} 
        onChange={handleChange} 
        onFocus={() => results && setIsOpen(true)}
        placeholder="搜索任务、项目... (Ctrl+K)" 
        size="sm"
        leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        rightIcon={loading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : undefined}
      />
      {isOpen && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 max-h-96 overflow-y-auto animate-fade-in-down">
          {results.tasks.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-slate-400 px-2 py-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                任务
              </div>
              {results.tasks.map((t) => (
                <button key={t.id} onClick={() => { onSelectTask?.(t.id); setIsOpen(false); setQuery(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group">
                  <span className="text-sm text-slate-700 truncate flex-1">{t.title}</span>
                  <Badge variant={statusMap[t.status]} size="sm">{statusLabels[t.status]}</Badge>
                </button>
              ))}
            </div>
          )}
          {results.projects.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-400 px-2 py-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                项目
              </div>
              {results.projects.map((p) => (
                <button key={p.id} onClick={() => { onSelectProject?.(p.id); setIsOpen(false); setQuery(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm text-slate-700 truncate">{p.name}</span>
                  {p.description && <span className="text-xs text-slate-400 truncate">{p.description}</span>}
                </button>
              ))}
            </div>
          )}
          {results.comments.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-400 px-2 py-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                评论
              </div>
              {results.comments.map((c) => (
                <button key={c.id} onClick={() => { onSelectTask?.(c.taskId); setIsOpen(false); setQuery(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">在「{c.taskTitle}」中:</span>
                  <span className="text-sm text-slate-700 block truncate">{c.content}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {isOpen && query.length >= 2 && !hasResults && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 p-4 text-center text-sm text-slate-400 z-50">
          未找到相关结果
        </div>
      )}
    </div>
  );
};
