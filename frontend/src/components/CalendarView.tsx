import React, { useMemo, useState } from 'react';
import { Task, TaskStatus, Priority } from '../types';
import { IconButton } from './ui/IconButton';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateChange?: (taskId: string, newDate: string) => void;
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick, onDateChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  
  const { year, month, days, firstDay } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const d: Date[] = [];
    for (let i = 1; i <= dim; i++) d.push(new Date(y, m, i));
    return { year: y, month: m, days: d, firstDay: first };
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.filter(t => t.dueDate && !t.isArchived).forEach(t => {
      const key = new Date(t.dueDate!).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date().toDateString();

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedTaskId && onDateChange) {
      onDateChange(draggedTaskId, date.toISOString());
    }
    setDraggedTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragStart = (taskId: string) => setDraggedTaskId(taskId);
  const handleDragEnd = () => setDraggedTaskId(null);

  const priorityColors: Record<Priority, string> = { [Priority.HIGH]: 'bg-red-500', [Priority.MEDIUM]: 'bg-amber-500', [Priority.LOW]: 'bg-emerald-500' };
  const statusColors: Record<TaskStatus, string> = { [TaskStatus.TODO]: 'border-slate-300', [TaskStatus.IN_PROGRESS]: 'border-blue-400', [TaskStatus.REVIEW]: 'border-amber-400', [TaskStatus.DONE]: 'border-emerald-400' };

  const prevMonthDays = useMemo(() => {
    const prevDim = new Date(year, month, 0).getDate();
    return Array.from({ length: firstDay }, (_, i) => prevDim - firstDay + i + 1);
  }, [year, month, firstDay]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <IconButton variant="ghost" onClick={prevMonth} title="上个月">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </IconButton>
          <h2 className="text-lg font-semibold text-slate-900 min-w-[120px] text-center">{year}年 {MONTHS[month]}</h2>
          <IconButton variant="ghost" onClick={nextMonth} title="下个月">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </IconButton>
        </div>
        <button onClick={() => setCurrentDate(new Date())} className="text-sm text-[#001C3D] hover:underline font-medium">今天</button>
      </div>
      
      <div className="grid grid-cols-7">
        {DAYS.map(d => <div key={d} className="p-2 text-center text-xs font-medium text-slate-500 border-b border-slate-100 bg-slate-50">{d}</div>)}
        {prevMonthDays.map((d, i) => <div key={`prev-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/30 p-1 text-slate-300 text-sm">{d}</div>)}
        {days.map(date => {
          const key = date.toDateString();
          const dayTasks = tasksByDate[key] || [];
          const isToday = key === today;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <div 
              key={key} 
              className={`min-h-[100px] border-b border-r border-slate-100 p-1 transition-colors ${isToday ? 'bg-blue-50/50' : isWeekend ? 'bg-slate-50/50' : ''} ${draggedTaskId ? 'hover:bg-blue-50' : ''}`}
              onDrop={(e) => handleDrop(e, date)}
              onDragOver={handleDragOver}
            >
              <div className={`text-sm mb-1 ${isToday ? 'bg-[#001C3D] text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto' : 'text-slate-600 px-1'}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(t => (
                  <div 
                    key={t.id} 
                    draggable 
                    onDragStart={() => handleDragStart(t.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick(t)}
                    className={`text-xs p-1.5 rounded-lg bg-white border-l-2 ${statusColors[t.status]} shadow-sm hover:shadow cursor-pointer truncate flex items-center gap-1 transition-shadow`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColors[t.priority]}`} />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-slate-400 px-1 cursor-pointer hover:text-slate-600" onClick={() => onTaskClick(dayTasks[3])}>
                    +{dayTasks.length - 3} 更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 高优先级</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 中优先级</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 低优先级</span>
        <span className="ml-auto text-slate-400">拖拽任务可修改截止日期</span>
      </div>
    </div>
  );
};
