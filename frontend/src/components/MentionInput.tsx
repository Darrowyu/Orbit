import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User } from '../types';
import { Avatar } from './ui/Avatar';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  members: User[];
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({ value, onChange, members, placeholder, rows = 3, className = '' }) => {
  const [showSuggest, setShowSuggest] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionStart, setMentionStart] = useState(-1);
  const suggestRef = useRef<HTMLDivElement>(null);

  const filtered = members.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.email.toLowerCase().includes(query.toLowerCase()));

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    const pos = e.target.selectionStart;
    onChange(v);

    const before = v.slice(0, pos);
    const atMatch = before.match(/@([^\s@]*)$/);
    if (atMatch) {
      setMentionStart(pos - atMatch[0].length);
      setQuery(atMatch[1]);
      setShowSuggest(true);
      setSelectedIndex(0);
    } else {
      setShowSuggest(false);
    }
  };

  const insertMention = useCallback((m: User) => {
    if (!textareaRef.current) return;
    const before = value.slice(0, mentionStart);
    const cursorPos = textareaRef.current.selectionStart;
    const after = value.slice(cursorPos);
    const mention = `@[${m.name}](${m.id}) `;
    const newValue = `${before}${mention}${after}`;
    onChange(newValue);
    setShowSuggest(false);
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = before.length + mention.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, mentionStart, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggest || filtered.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggest(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderValue = () => {
    return value.replace(/@\[([^\]]+)\]\([^)]+\)/g, '<span class="text-[#001C3D] font-medium">@$1</span>');
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-0 p-3 text-sm pointer-events-none whitespace-pre-wrap break-words overflow-hidden" style={{ color: 'transparent' }} dangerouslySetInnerHTML={{ __html: renderValue() }} />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={`w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] resize-none transition-colors bg-transparent ${className}`}
        />
      </div>
      {showSuggest && filtered.length > 0 && (
        <div ref={suggestRef} className="absolute z-50 bottom-full left-0 mb-1 bg-white rounded-xl shadow-lg border border-slate-100 max-h-48 overflow-y-auto w-64 animate-fade-in">
          {filtered.map((m, i) => (
            <button
              key={m.id}
              onClick={() => insertMention(m)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${i === selectedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
            >
              <Avatar src={m.avatar} fallback={m.avatar} size="sm" color={m.color} />
              <div className="overflow-hidden">
                <div className="text-sm font-medium text-slate-700 truncate">{m.name}</div>
                <div className="text-xs text-slate-400 truncate">{m.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400 mt-1">输入 @ 提及成员</p>
    </div>
  );
};
