import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Priority, Subtask, User, Project } from '../types';
import { aiApi } from '../services/api';
import { Button, Input, Modal, Badge, Select } from './ui';
import { AIAssistPanel } from './AIAssistPanel';
import { useAuthStore } from '../stores/authStore';
import { LabelSelector } from './LabelSelector';
import { useLabelStore } from '../stores/labelStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => void;
  teamMembers: User[];
  initialData?: Task | null;
  allTasks?: Task[];
  projects?: Project[];
  currentProjectId?: string | null;
}

interface DraftSubtask { id: string; title: string; assigneeId?: string; }

export const CreateTaskModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, teamMembers, initialData, allTasks = [], projects = [], currentProjectId }) => {
  const { user } = useAuthStore();
  const { fetchLabels } = useLabelStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [subtasks, setSubtasks] = useState<DraftSubtask[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState(teamMembers[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchLabels();
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setPriority(initialData.priority);
        setAssigneeId(initialData.assigneeId || teamMembers[0]?.id || '');
        setDueDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '');
        setSubtasks(initialData.subtasks.map((s) => ({ id: s.id, title: s.title, assigneeId: s.assigneeId })));
        setDependsOn(initialData.dependsOn || []);
        setProjectId(initialData.projectId || '');
        setSelectedLabelIds(initialData.labels?.map((l) => l.id) || []);
      } else {
        setTitle(''); setDescription(''); setPriority(Priority.MEDIUM); setSubtasks([]); setAssigneeId(teamMembers[0]?.id || ''); setDueDate(''); setDependsOn([]);
        setProjectId(currentProjectId || '');
        setSelectedLabelIds([]);
      }
    }
  }, [isOpen, initialData, teamMembers, currentProjectId, fetchLabels]);

  if (!isOpen) return null;
  const handleAiAssist = async () => {
    if (!title.trim()) return;
    setIsAiLoading(true);
    try {
      const { data } = await aiApi.generate(title, user?.aiPrompt);
      setDescription(data.description);
      setSubtasks(data.subtasks.map((t) => ({ id: Math.random().toString(36).slice(2, 11), title: t, assigneeId })));
      setPriority(data.priority as Priority);
    } catch { /* AI 生成失败静默处理 */ }
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
      projectId: projectId || undefined,
      labelIds: selectedLabelIds,
    } as any);
    onClose();
  };

  const addSubtask = () => setSubtasks([...subtasks, { id: Math.random().toString(36).slice(2, 11), title: '', assigneeId }]);
  const updateSubtask = (id: string, u: Partial<DraftSubtask>) => setSubtasks(subtasks.map((s) => (s.id === id ? { ...s, ...u } : s)));
  const removeSubtask = (id: string) => setSubtasks(subtasks.filter((s) => s.id !== id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? '编辑任务' : '创建新任务'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">任务标题</label>
            <div className="flex gap-2">
              <Input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：重构登录页面" />
              {!initialData && <Button type="button" variant="secondary" onClick={handleAiAssist} disabled={!title.trim() || isAiLoading} isLoading={isAiLoading} className="whitespace-nowrap" title="AI 自动生成"><span className="flex items-center text-[#001C3D]"><svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.35 9.65L22 12L14.35 14.35L12 22L9.65 14.35L2 12L9.65 9.65L12 2Z" fill="currentColor" /></svg>AI 填充</span></Button>}
            </div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">描述</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#001C3D] focus:ring-[#001C3D]/20 sm:text-sm border p-2.5 transition-all" placeholder="任务详细说明..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="优先级" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} options={[{ value: Priority.LOW, label: '低' }, { value: Priority.MEDIUM, label: '中' }, { value: Priority.HIGH, label: '高' }]} />
            <Select label="负责人" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} options={teamMembers.map((m) => ({ value: m.id, label: `${m.avatar} ${m.name}` }))} />
          </div>
          {projects.length > 0 && (
            <Select
              label="所属项目"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              options={[{ value: '', label: '不属于任何项目' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
            />
          )}
          <Input type="date" label="截止日期" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">标签</label>
            <LabelSelector selectedIds={selectedLabelIds} onChange={setSelectedLabelIds} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">前置任务（依赖）</label>
            <div className="space-y-2">
              {allTasks.filter((t) => t.id !== initialData?.id).length === 0 ? (
                <p className="text-sm text-slate-400">暂无其他任务可选择</p>
              ) : (
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {allTasks.filter((t) => t.id !== initialData?.id).map((t) => (
                    <label key={t.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${dependsOn.includes(t.id) ? 'bg-amber-50 border border-amber-200' : ''}`}>
                      <input type="checkbox" checked={dependsOn.includes(t.id)} onChange={(e) => { if (e.target.checked) setDependsOn([...dependsOn, t.id]); else setDependsOn(dependsOn.filter((id) => id !== t.id)); }} className="rounded border-slate-300 text-[#001C3D] focus:ring-[#001C3D]/20" />
                      <Badge variant={t.status === 'DONE' ? 'success' : t.status === 'IN_PROGRESS' ? 'info' : 'default'} size="sm">{t.status === 'DONE' ? '✓' : t.status === 'IN_PROGRESS' ? '◐' : '○'}</Badge>
                      <span className="text-sm text-slate-700 truncate">{t.title}</span>
                    </label>
                  ))}
                </div>
              )}
              {dependsOn.length > 0 && <p className="text-xs text-amber-600">已选择 {dependsOn.length} 个前置任务，需先完成才能推进此任务</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">子任务清单</label>
            <div className="space-y-2 mb-2">
              {subtasks.map((st, idx) => (
                <div key={st.id} className="group flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 p-2.5 rounded-xl focus-within:ring-2 focus-within:ring-[#001C3D]/20 shadow-sm transition-all">
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[#001C3D]/5 text-[#001C3D] text-xs font-bold">{idx + 1}</span>
                  <input type="text" value={st.title} onChange={(e) => updateSubtask(st.id, { title: e.target.value })} className="bg-transparent w-full focus:outline-none text-slate-800 placeholder-slate-400" placeholder="输入子任务..." />
                  <div className="relative shrink-0 border-l border-slate-200 pl-2 ml-1"><select value={st.assigneeId || assigneeId} onChange={(e) => updateSubtask(st.id, { assigneeId: e.target.value })} className="appearance-none bg-transparent text-xs font-medium text-slate-600 focus:outline-none cursor-pointer pr-4 max-w-[80px]">{teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-slate-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></div></div>
                  <button type="button" onClick={() => removeSubtask(st.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-all" title="删除"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addSubtask} className="text-sm text-[#001C3D] hover:text-[#002855] font-medium flex items-center py-1 px-2 rounded-lg hover:bg-[#001C3D]/5 transition-colors"><svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>添加子任务</button>
          </div>
          {!initialData && title && description && (
            <AIAssistPanel
              taskTitle={title}
              description={description}
              subtasks={subtasks.map(s => s.title)}
              teamMembers={teamMembers}
              taskHistory={allTasks.filter(t => t.status === TaskStatus.DONE).slice(0, 10)}
              onAssigneeRecommend={(id) => setAssigneeId(id)}
              onWorkloadEstimate={() => { /* 预估工作量回调 */ }}
            />
          )}
        </div>
        <div className="p-6 border-t border-slate-100 shrink-0 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={onClose}>取消</Button><Button type="submit">{initialData ? '保存修改' : '创建任务'}</Button></div>
      </form>
    </Modal>
  );
};
