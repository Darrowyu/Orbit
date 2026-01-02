import React, { useMemo, useState } from 'react';
import { Task, TaskStatus, Priority } from '../types';
import { IconButton } from './ui/IconButton';

interface GanttChartProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateChange?: (taskId: string, startDate: string, endDate: string) => void;
}

const CELL_WIDTH = 40;
const ROW_HEIGHT = 36;

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onTaskClick }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  
  const days = useMemo(() => {
    const result: Date[] = [];
    const d = new Date(startDate);
    for (let i = 0; i < 30; i++) {
      result.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return result;
  }, [startDate]);

  const tasksWithDates = useMemo(() => {
    return tasks.filter(t => t.dueDate && !t.isArchived).map(t => {
      const due = new Date(t.dueDate!);
      const created = new Date(t.createdAt);
      return { ...t, startDate: created, endDate: due };
    });
  }, [tasks]);

  const getPosition = (date: Date) => {
    const diff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff * CELL_WIDTH;
  };

  const prevWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  const nextWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const today = new Date();
  const todayPos = getPosition(today);

  const statusColors: Record<TaskStatus, string> = {
    [TaskStatus.TODO]: 'bg-slate-400',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-500',
    [TaskStatus.REVIEW]: 'bg-amber-500',
    [TaskStatus.DONE]: 'bg-emerald-500',
  };

  const priorityBorders: Record<Priority, string> = {
    [Priority.HIGH]: 'border-l-4 border-l-red-500',
    [Priority.MEDIUM]: 'border-l-4 border-l-amber-500',
    [Priority.LOW]: 'border-l-4 border-l-emerald-500',
  };

  const formatMonth = (d: Date) => d.toLocaleDateString('zh-CN', { month: 'short' });
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const isToday = (d: Date) => d.toDateString() === today.toDateString();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <IconButton variant="ghost" onClick={prevWeek} title="上一周">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </IconButton>
          <h2 className="text-lg font-semibold text-slate-900">{formatMonth(days[0])} - {formatMonth(days[days.length - 1])}</h2>
          <IconButton variant="ghost" onClick={nextWeek} title="下一周">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </IconButton>
        </div>
        <button onClick={() => setStartDate(new Date(new Date().setDate(new Date().getDate() - 7)))} className="text-sm text-[#001C3D] hover:underline font-medium">
          今天
        </button>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 250 + days.length * CELL_WIDTH }}>
          <div className="flex border-b border-slate-100">
            <div className="w-[250px] shrink-0 p-2 bg-slate-50 text-xs font-medium text-slate-500 border-r border-slate-100">任务</div>
            <div className="flex">
              {days.map((d, i) => (
                <div key={i} className={`text-center text-xs p-1 border-r border-slate-100 ${isWeekend(d) ? 'bg-slate-50' : ''} ${isToday(d) ? 'bg-blue-50' : ''}`} style={{ width: CELL_WIDTH }}>
                  <div className="text-slate-400">{d.getDate()}</div>
                  <div className={`text-[10px] ${isToday(d) ? 'text-blue-600 font-medium' : 'text-slate-300'}`}>
                    {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {todayPos >= 0 && todayPos < days.length * CELL_WIDTH && (
              <div className="absolute top-0 bottom-0 w-px bg-blue-400 z-10" style={{ left: 250 + todayPos + CELL_WIDTH / 2 }} />
            )}

            {tasksWithDates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">暂无带截止日期的任务</div>
            ) : (
              tasksWithDates.map((t) => {
                const start = getPosition(t.startDate);
                const end = getPosition(t.endDate);
                const left = Math.max(0, start);
                const width = Math.max(CELL_WIDTH, end - left + CELL_WIDTH);
                const isVisible = end >= 0 && start < days.length * CELL_WIDTH;

                return (
                  <div key={t.id} className="flex border-b border-slate-100" style={{ height: ROW_HEIGHT }}>
                    <div className="w-[250px] shrink-0 px-3 flex items-center gap-2 border-r border-slate-100 bg-white">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[t.status]}`} />
                      <span className="text-sm text-slate-700 truncate cursor-pointer hover:text-[#001C3D]" onClick={() => onTaskClick(t)}>
                        {t.title}
                      </span>
                    </div>
                    <div className="flex-1 relative">
                      {days.map((d, i) => (
                        <div key={i} className={`absolute top-0 bottom-0 border-r border-slate-100 ${isWeekend(d) ? 'bg-slate-50/50' : ''}`} style={{ left: i * CELL_WIDTH, width: CELL_WIDTH }} />
                      ))}
                      {isVisible && (
                        <div
                          className={`absolute top-1 bottom-1 rounded cursor-pointer transition-opacity hover:opacity-80 ${statusColors[t.status]} ${priorityBorders[t.priority]}`}
                          style={{ left: left, width: width }}
                          onClick={() => onTaskClick(t)}
                          title={`${t.title}\n${t.startDate.toLocaleDateString('zh-CN')} - ${t.endDate.toLocaleDateString('zh-CN')}`}
                        >
                          <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
                            {t.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-400" /> 待办</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> 进行中</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> 审核</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> 完成</span>
      </div>
    </div>
  );
};
