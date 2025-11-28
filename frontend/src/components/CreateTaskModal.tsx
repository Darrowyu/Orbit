import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Priority, Subtask, User } from '../types';
import { aiApi } from '../services/api';
import { Button } from './Button';
import { AIAssistPanel } from './AIAssistPanel';
import { useAuthStore } from '../stores/authStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => void;
  teamMembers: User[];
  initialData?: Task | null;
  allTasks?: Task[];
}

interface DraftSubtask { id: string; title: string; assigneeId?: string; }

export const CreateTaskModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, teamMembers, initialData, allTasks = [] }) => {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [subtasks, setSubtasks] = useState<DraftSubtask[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState(teamMembers[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [dependsOn, setDependsOn] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setPriority(initialData.priority);
        setAssigneeId(initialData.assigneeId || teamMembers[0]?.id || '');
        setDueDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '');
        setSubtasks(initialData.subtasks.map((s) => ({ id: s.id, title: s.title, assigneeId: s.assigneeId })));
        setDependsOn(initialData.dependsOn || []);
      } else {
        setTitle(''); setDescription(''); setPriority(Priority.MEDIUM); setSubtasks([]); setAssigneeId(teamMembers[0]?.id || ''); setDueDate(''); setDependsOn([]);
      }
    }
  }, [isOpen, initialData, teamMembers]);

  if (!isOpen) return null;
  const handleAiAssist = async () => {
    if (!title.trim()) return;
    setIsAiLoading(true);
    try {
      const { data } = await aiApi.generate(title, user?.aiPrompt);
      setDescription(data.description);
      setSubtasks(data.subtasks.map((t) => ({ id: Math.random().toString(36).slice(2, 11), title: t, assigneeId })));
      setPriority(data.priority as Priority);
    } catch (e) { console.error(e); }
    finally { setIsAiLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted: Subtask[] = subtasks.filter((t) => t.title.trim()).map((t) => {
      const orig = initialData?.subtasks.find((os) => os.id === t.id);
      return { id: t.id, title: t.title, completed: orig?.completed || false, assigneeId: t.assigneeId };
    });
    onSubmit({
      title, description, status: initialData?.status || TaskStatus.TODO, priority, assigneeId,
      subtasks: formatted, dueDate: dueDate ? new Date(dueDate + 'T23:59:59').toISOString() : null, dependsOn,
    });
    onClose();
  };

  const addSubtask = () => setSubtasks([...subtasks, { id: Math.random().toString(36).substr(2, 9), title: '', assigneeId }]);
  const updateSubtask = (id: string, u: Partial<DraftSubtask>) => setSubtasks(subtasks.map((s) => (s.id === id ? { ...s, ...u } : s)));
  const removeSubtask = (id: string) => setSubtasks(subtasks.filter((s) => s.id !== id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 flex flex-col">
        <div className="p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{initialData ? '编辑任务' : '创建新任务'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">任务标题</label>
              <div className="flex gap-2">
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="例如：重构登录页面" />
                {!initialData && <Button type="button" variant="secondary" onClick={handleAiAssist} disabled={!title.trim() || isAiLoading} isLoading={isAiLoading} className="whitespace-nowrap" title="AI 自动生成"><span className="flex items-center text-indigo-600"><svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.35 9.65L22 12L14.35 14.35L12 22L9.65 14.35L2 12L9.65 9.65L12 2Z" fill="currentColor" /></svg>AI 填充</span></Button>}
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">描述</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="任务详细说明..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">优先级</label><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white"><option value={Priority.LOW}>低</option><option value={Priority.MEDIUM}>中</option><option value={Priority.HIGH}>高</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">负责人</label><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white">{teamMembers.map((m) => <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">前置任务（依赖）</label>
              <div className="space-y-2">
                {allTasks.filter((t) => t.id !== initialData?.id).length === 0 ? (
                  <p className="text-sm text-gray-400">暂无其他任务可选择</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {allTasks.filter((t) => t.id !== initialData?.id).map((t) => (
                      <label key={t.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${dependsOn.includes(t.id) ? 'bg-amber-50 border border-amber-200' : ''}`}>
                        <input type="checkbox" checked={dependsOn.includes(t.id)} onChange={(e) => { if (e.target.checked) setDependsOn([...dependsOn, t.id]); else setDependsOn(dependsOn.filter((id) => id !== t.id)); }} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className={`text-xs px-1.5 py-0.5 rounded ${t.status === 'DONE' ? 'bg-green-100 text-green-700' : t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{t.status === 'DONE' ? '✓' : t.status === 'IN_PROGRESS' ? '◐' : '○'}</span>
                        <span className="text-sm text-gray-700 truncate">{t.title}</span>
                      </label>
                    ))}
                  </div>
                )}
                {dependsOn.length > 0 && <p className="text-xs text-amber-600">已选择 {dependsOn.length} 个前置任务，需先完成才能推进此任务</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">子任务清单</label>
              <div className="space-y-2 mb-2">
                {subtasks.map((st, idx) => (
                  <div key={st.id} className="group flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 p-2 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 shadow-sm">
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">{idx + 1}</span>
                    <input type="text" value={st.title} onChange={(e) => updateSubtask(st.id, { title: e.target.value })} className="bg-transparent w-full focus:outline-none text-gray-800 placeholder-gray-400" placeholder="输入子任务..." />
                    <div className="relative shrink-0 border-l pl-2 ml-1"><select value={st.assigneeId || assigneeId} onChange={(e) => updateSubtask(st.id, { assigneeId: e.target.value })} className="appearance-none bg-transparent text-xs font-medium text-gray-600 focus:outline-none cursor-pointer pr-4 max-w-[80px]">{teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></div></div>
                    <button type="button" onClick={() => removeSubtask(st.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1" title="删除"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addSubtask} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center py-1 px-2 rounded hover:bg-indigo-50 transition-colors"><svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>添加子任务</button>
            </div>
            {!initialData && title && description && (
              <AIAssistPanel
                taskTitle={title}
                description={description}
                subtasks={subtasks.map(s => s.title)}
                teamMembers={teamMembers}
                taskHistory={allTasks.filter(t => t.status === TaskStatus.DONE).slice(0, 10)}
                onAssigneeRecommend={(id) => setAssigneeId(id)}
                onWorkloadEstimate={(hours) => console.log('预估工作量:', hours)}
              />
            )}
          </div>
          <div className="p-6 border-t border-gray-100 shrink-0 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button type="submit">{initialData ? '保存修改' : '创建任务'}</Button></div>
        </form>
      </div>
    </div>
  );
};
