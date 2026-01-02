import React, { useState } from 'react';
import { Task, Priority, TaskStatus, User, Subtask } from '../types';
import { Badge, Avatar, IconButton } from './ui';

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
  const variants: Record<Priority, 'success' | 'warning' | 'danger'> = { [Priority.LOW]: 'success', [Priority.MEDIUM]: 'warning', [Priority.HIGH]: 'danger' };
  const labels = { [Priority.LOW]: '低', [Priority.MEDIUM]: '中', [Priority.HIGH]: '高' };
  return <Badge variant={variants[priority]} size="sm">{labels[priority]}</Badge>;
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
    } catch { /* AI 细分失败静默处理 */ }
    finally { setAiLoading(null); }
  };

  const getBorder = () => {
    if (isSelected) return 'ring-2 ring-[#001C3D] border-[#001C3D] shadow-[var(--shadow-brand)]';
    if (dependencyType === 'dependency') return 'ring-2 ring-amber-400 border-amber-400 shadow-[var(--shadow-warning)]';
    if (dependencyType === 'dependent') return 'ring-2 ring-purple-400 border-purple-400 shadow-md';
    return 'border-slate-100 hover:shadow-[var(--shadow-md)] hover:border-slate-200';
  };

  return (
    <div ref={innerRef} {...draggableProps} {...dragHandleProps} style={style} id={`task-${task.id}`} onClick={() => !isDragging && onSelect?.(task.id)} className={`bg-white p-4 rounded-2xl shadow-[var(--shadow-sm)] border group relative flex flex-col gap-3 transition-all duration-200 ${isDragging ? 'shadow-[var(--shadow-brand-xl)] rotate-2 ring-2 ring-[#001C3D] z-50 opacity-95' : getBorder()}`}>
      <div className="flex justify-between items-start">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isArchiveView ? (
            <IconButton size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onRestore?.(task.id); }} onMouseDown={(e) => e.stopPropagation()} title="恢复" className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </IconButton>
          ) : (
            <>
              <IconButton size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(task); }} onMouseDown={(e) => e.stopPropagation()} title="编辑" className="text-slate-400 hover:text-[#001C3D] hover:bg-[#001C3D]/5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </IconButton>
              {task.status === TaskStatus.DONE && onArchive && (
                <IconButton size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onArchive(task.id); }} onMouseDown={(e) => e.stopPropagation()} title="归档" className="text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </IconButton>
              )}
              <IconButton size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} onMouseDown={(e) => e.stopPropagation()} title="删除" className="text-slate-400 hover:text-red-600 hover:bg-red-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </IconButton>
            </>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-slate-900 font-semibold mb-1 cursor-grab active:cursor-grabbing leading-tight">{task.title}</h3>
        <p className="text-slate-500 text-xs line-clamp-2">{task.description}</p>
      </div>
      {dependencyType !== 'none' && !isSelected && <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-opacity-10 w-fit ${dependencyType === 'dependency' ? 'bg-amber-500 text-amber-600' : 'bg-purple-500 text-purple-600'}`}>{dependencyType === 'dependency' ? '← 前置' : '→ 后续'}</div>}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5"><div className="bg-[#001C3D] h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
            <span className="text-[10px] text-slate-400 font-medium">{completed}/{total}</span>
          </div>
          <div className="space-y-1 mt-2" onMouseDown={(e) => e.stopPropagation()}>
            {task.subtasks.map((st) => {
              const stAssignee = getMember(st.assigneeId);
              return (
                <div key={st.id} onMouseEnter={() => setHoveredSubtask(st.id)} onMouseLeave={() => setHoveredSubtask(null)} onClick={(e) => { e.stopPropagation(); onToggleSubtask(task.id, st.id); }} className="flex items-center gap-2 cursor-pointer group/subtask p-1 -mx-1 hover:bg-slate-50 rounded-lg justify-between transition-colors">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors duration-200 shrink-0 ${st.completed ? 'bg-[#001C3D] border-[#001C3D]' : 'border-slate-300 group-hover/subtask:border-[#001C3D]'}`}>{st.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</div>
                    <span className={`text-xs truncate transition-all duration-300 ${st.completed ? 'text-slate-400 line-through opacity-75' : 'text-slate-700'}`}>{st.title}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {hoveredSubtask === st.id && (
                      <button onClick={(e) => handleAISubdivide(st, e)} disabled={aiLoading === st.id} className="text-[10px] bg-gradient-to-r from-[#001C3D] to-[#0F4C81] text-white px-1.5 py-0.5 rounded hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-0.5" title="AI细分">
                        {aiLoading === st.id ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L14.35 9.65L22 12L14.35 14.35L12 22L9.65 14.35L2 12L9.65 9.65L12 2Z" /></svg>}
                      </button>
                    )}
                    <div className="relative group/assignee ml-1">
                      <Avatar src={stAssignee?.avatar} fallback={stAssignee?.avatar || '?'} size="xs" color={stAssignee?.color || 'bg-slate-100 text-slate-400'} alt={stAssignee ? `负责人: ${stAssignee.name}` : '点击分配'} className="hover:scale-110 transition-transform" />
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
      <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-auto">
        <div className="flex items-center space-x-2">
          <Avatar src={mainAssignee?.avatar} fallback={mainAssignee?.avatar || '?'} size="xs" color={mainAssignee?.color || 'bg-slate-100 text-slate-500'} alt={`负责人: ${mainAssignee?.name || '待认领'}`} />
          {mainAssignee && <span className="text-[10px] text-slate-500 font-medium truncate max-w-[60px]">{mainAssignee.name}</span>}
          {task.dueDate && task.status !== TaskStatus.DONE && <Badge variant={isOverdue ? 'danger' : isDueSoon ? 'warning' : 'default'} size="sm" className="ml-1">{formatDate(task.dueDate)}</Badge>}
        </div>
        <div className="flex gap-0.5 opacity-25 hover:opacity-100 transition-opacity" onMouseDown={(e) => e.stopPropagation()}>
          {task.status !== TaskStatus.TODO && <IconButton size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); const sts = Object.values(TaskStatus); onMove(task.id, sts[sts.indexOf(task.status) - 1]); }} title="上一步" className="w-6 h-6 text-slate-500 hover:text-[#001C3D] hover:bg-slate-100"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></IconButton>}
          {task.status !== TaskStatus.DONE && <IconButton size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); const sts = Object.values(TaskStatus); onMove(task.id, sts[sts.indexOf(task.status) + 1]); }} title="下一步" className="w-6 h-6 text-slate-500 hover:text-[#001C3D] hover:bg-slate-100"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></IconButton>}
        </div>
      </div>
    </div>
  );
};

const areEqual = (prev: TaskCardProps, next: TaskCardProps): boolean => { // 自定义比较函数优化重渲染
  if (prev.task.id !== next.task.id) return false;
  if (prev.task.title !== next.task.title) return false;
  if (prev.task.description !== next.task.description) return false;
  if (prev.task.status !== next.task.status) return false;
  if (prev.task.priority !== next.task.priority) return false;
  if (prev.task.assigneeId !== next.task.assigneeId) return false;
  if (prev.task.dueDate !== next.task.dueDate) return false;
  if (prev.task.subtasks.length !== next.task.subtasks.length) return false;
  for (let i = 0; i < prev.task.subtasks.length; i++) {
    const ps = prev.task.subtasks[i], ns = next.task.subtasks[i];
    if (ps.id !== ns.id || ps.completed !== ns.completed || ps.assigneeId !== ns.assigneeId) return false;
  }
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.dependencyType !== next.dependencyType) return false;
  if (prev.isDragging !== next.isDragging) return false;
  if (prev.isArchiveView !== next.isArchiveView) return false;
  return true;
};

export default React.memo(TaskCard, areEqual);
