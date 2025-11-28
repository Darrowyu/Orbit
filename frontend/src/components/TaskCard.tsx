import React, { useState } from 'react';
import { Task, Priority, TaskStatus, User, Subtask } from '../types';

interface TaskCardProps {
  task: Task;
  onMove: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAssignSubtask: (taskId: string, subtaskId: string, assigneeId: string) => void;
  onCreateFromSubtask: (subtaskTitle: string, parentTaskId: string, parentTitle: string, parentDescription: string) => Promise<void>;
  isSelected?: boolean;
  dependencyType?: 'none' | 'dependency' | 'dependent';
  onSelect?: (taskId: string) => void;
  isDragging?: boolean;
  dragHandleProps?: object | null;
  draggableProps?: object;
  innerRef?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  teamMembers: User[];
  isArchiveView?: boolean;
}

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const colors = { [Priority.LOW]: 'bg-green-100 text-green-800', [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800', [Priority.HIGH]: 'bg-red-100 text-red-800' };
  const labels = { [Priority.LOW]: '低', [Priority.MEDIUM]: '中', [Priority.HIGH]: '高' };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[priority]}`}>{labels[priority]}</span>;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onMove, onEdit, onDelete, onArchive, onRestore, onToggleSubtask, onAssignSubtask, onCreateFromSubtask, isSelected, dependencyType = 'none', onSelect, isDragging, dragHandleProps, draggableProps, innerRef, style, teamMembers, isArchiveView }) => {
  const [hoveredSubtask, setHoveredSubtask] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const completed = task.subtasks.filter((s) => s.completed).length;
  const total = task.subtasks.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const now = Date.now();
  const dueTs = task.dueDate ? new Date(task.dueDate).getTime() : null;
  const isOverdue = dueTs ? dueTs < now : false;
  const isDueSoon = dueTs ? !isOverdue && dueTs - now < 86400000 : false;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  const getMember = (id?: string) => teamMembers.find((m) => m.id === id);
  const mainAssignee = getMember(task.assigneeId);

  const handleAISubdivide = async (subtask: Subtask, e: React.MouseEvent) => {
    e.stopPropagation();
    setAiLoading(subtask.id);
    try {
      await onCreateFromSubtask(subtask.title, task.id, task.title, task.description);
    } catch (err) { console.error('AI细分失败:', err); }
    finally { setAiLoading(null); }
  };

  const getBorder = () => {
    if (isSelected) return 'ring-2 ring-indigo-500 border-indigo-500 shadow-md';
    if (dependencyType === 'dependency') return 'ring-2 ring-amber-400 border-amber-400 shadow-md';
    if (dependencyType === 'dependent') return 'ring-2 ring-purple-400 border-purple-400 shadow-md';
    return 'border-gray-100 hover:shadow-md';
  };

  return (
    <div ref={innerRef} {...draggableProps} {...dragHandleProps} style={style} id={`task-${task.id}`} onClick={() => !isDragging && onSelect?.(task.id)} className={`bg-white p-4 rounded-xl shadow-sm border group relative flex flex-col gap-3 transition-all duration-200 ${isDragging ? 'shadow-2xl rotate-2 ring-2 ring-indigo-400 z-50 opacity-90' : getBorder()}`}>
      <div className="flex justify-between items-start">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isArchiveView ? (
            <button onClick={(e) => { e.stopPropagation(); onRestore?.(task.id); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded" title="恢复">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </button>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded" title="编辑">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              {task.status === TaskStatus.DONE && onArchive && (
                <button onClick={(e) => { e.stopPropagation(); onArchive(task.id); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded" title="归档">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} onMouseDown={(e) => e.stopPropagation()} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="删除">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-gray-900 font-semibold mb-1 cursor-grab active:cursor-grabbing leading-tight">{task.title}</h3>
        <p className="text-gray-500 text-xs line-clamp-2">{task.description}</p>
      </div>
      {dependencyType !== 'none' && !isSelected && <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-opacity-10 w-fit ${dependencyType === 'dependency' ? 'bg-amber-500 text-amber-600' : 'bg-purple-500 text-purple-600'}`}>{dependencyType === 'dependency' ? '← 前置' : '→ 后续'}</div>}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
            <span className="text-[10px] text-gray-400 font-medium">{completed}/{total}</span>
          </div>
          <div className="space-y-1 mt-2" onMouseDown={(e) => e.stopPropagation()}>
            {task.subtasks.map((st) => {
              const stAssignee = getMember(st.assigneeId);
              return (
                <div key={st.id} onMouseEnter={() => setHoveredSubtask(st.id)} onMouseLeave={() => setHoveredSubtask(null)} onClick={(e) => { e.stopPropagation(); onToggleSubtask(task.id, st.id); }} className="flex items-center gap-2 cursor-pointer group/subtask p-1 -mx-1 hover:bg-gray-50 rounded justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors duration-200 shrink-0 ${st.completed ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 group-hover/subtask:border-indigo-400'}`}>{st.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
                    <span className={`text-xs truncate transition-all duration-300 ${st.completed ? 'text-gray-400 line-through opacity-75' : 'text-gray-700'}`}>{st.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {hoveredSubtask === st.id && (
                      <button onClick={(e) => handleAISubdivide(st, e)} disabled={aiLoading === st.id} className="text-[10px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-1.5 py-0.5 rounded hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50" title="AI细分">
                        {aiLoading === st.id ? '...' : '🤖'}
                      </button>
                    )}
                    <div className="relative group/assignee ml-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-white shadow-sm transition-transform hover:scale-110 cursor-pointer overflow-hidden ${stAssignee?.avatar?.startsWith('/uploads') ? 'bg-gray-100' : stAssignee ? stAssignee.color : 'bg-gray-100 text-gray-400 border-gray-200'}`} title={stAssignee ? `负责人: ${stAssignee.name}` : '点击分配'}>
                        {stAssignee?.avatar?.startsWith('/uploads') ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${stAssignee.avatar}`} alt="avatar" className="w-full h-full object-cover" /> : stAssignee ? stAssignee.avatar : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                      </div>
                      <select value={st.assigneeId || ''} onChange={(e) => { e.stopPropagation(); onAssignSubtask(task.id, st.id, e.target.value); }} onClick={(e) => e.stopPropagation()} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                        <option value="">待认领</option>
                        {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-auto">
        <div className="flex items-center space-x-2">
          <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs shadow-sm shrink-0 overflow-hidden ${mainAssignee?.avatar?.startsWith('/uploads') ? 'bg-gray-100' : mainAssignee ? mainAssignee.color : 'bg-gray-100 text-gray-500'}`} title={`负责人: ${mainAssignee?.name || '待认领'}`}>
            {mainAssignee?.avatar?.startsWith('/uploads') ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${mainAssignee.avatar}`} alt="avatar" className="w-full h-full object-cover" /> : mainAssignee?.avatar || '?'}
          </div>
          {mainAssignee && <span className="text-[10px] text-gray-500 font-medium truncate max-w-[60px]">{mainAssignee.name}</span>}
          {task.dueDate && task.status !== TaskStatus.DONE && <div className={`flex items-center text-[10px] px-1.5 py-0.5 rounded border ml-1 ${isOverdue ? 'bg-red-50 text-red-600 border-red-100' : isDueSoon ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{formatDate(task.dueDate)}</div>}
        </div>
        <div className="flex space-x-1 opacity-25 hover:opacity-100 transition-opacity" onMouseDown={(e) => e.stopPropagation()}>
          {task.status !== TaskStatus.TODO && <button onClick={(e) => { e.stopPropagation(); const sts = Object.values(TaskStatus); onMove(task.id, sts[sts.indexOf(task.status) - 1]); }} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="上一步"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>}
          {task.status !== TaskStatus.DONE && <button onClick={(e) => { e.stopPropagation(); const sts = Object.values(TaskStatus); onMove(task.id, sts[sts.indexOf(task.status) + 1]); }} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="下一步"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TaskCard);
