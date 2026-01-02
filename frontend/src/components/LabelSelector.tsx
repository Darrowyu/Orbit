import React, { useState, useRef, useEffect } from 'react';
import { Tag } from './ui/Tag';
import { useLabelStore } from '../stores/labelStore';
import { labelApi } from '../services/api';

interface LabelSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export const LabelSelector: React.FC<LabelSelectorProps> = ({ selectedIds, onChange, className = '' }) => {
  const { labels, setLabels } = useLabelStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (labels.length === 0) {
      labelApi.getAll().then(({ data }) => setLabels(data)).catch(() => {});
    }
  }, [labels.length, setLabels]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = labels.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  const selected = labels.filter(l => selectedIds.includes(l.id));

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[40px] w-full rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:border-slate-300 transition-colors flex flex-wrap gap-1.5 items-center"
      >
        {selected.length === 0 ? (
          <span className="text-sm text-slate-400">选择标签...</span>
        ) : (
          selected.map(l => <Tag key={l.id} color={l.color} onRemove={() => toggle(l.id)}>{l.name}</Tag>)
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-slate-100">
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="搜索标签..." 
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D]"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">无匹配标签</p>
            ) : filtered.map(l => (
              <button
                key={l.id}
                onClick={() => toggle(l.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${selectedIds.includes(l.id) ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              >
                <Tag color={l.color}>{l.name}</Tag>
                {selectedIds.includes(l.id) && (
                  <svg className="w-4 h-4 text-[#001C3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
