import React, { useState, useEffect } from 'react';
import { Milestone } from '../types';
import { milestoneApi } from '../services/api';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Modal, ModalFooter } from './ui/Modal';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

interface MilestoneListProps {
  projectId: string;
  onSelectMilestone?: (milestone: Milestone) => void;
}

export const MilestoneList: React.FC<MilestoneListProps> = ({ projectId, onSelectMilestone }) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMilestones();
  }, [projectId]);

  const loadMilestones = async () => {
    try {
      const { data } = await milestoneApi.getByProject(projectId);
      setMilestones(data);
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.dueDate) return;
    setSaving(true);
    try {
      if (editId) {
        const { data } = await milestoneApi.update(editId, form);
        setMilestones(ms => ms.map(m => m.id === editId ? data : m));
      } else {
        const { data } = await milestoneApi.create({ ...form, projectId });
        setMilestones(ms => [...ms, data]);
      }
      closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此里程碑？')) return;
    await milestoneApi.delete(id);
    setMilestones(ms => ms.filter(m => m.id !== id));
  };

  const handleToggleStatus = async (ms: Milestone) => {
    const newStatus = ms.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const { data } = await milestoneApi.update(ms.id, { status: newStatus });
    setMilestones(list => list.map(m => m.id === ms.id ? data : m));
  };

  const openEdit = (ms: Milestone) => {
    setEditId(ms.id);
    setForm({ name: ms.name, description: ms.description, dueDate: ms.dueDate.split('T')[0] });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm({ name: '', description: '', dueDate: '' });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  const isOverdue = (d: string) => new Date(d) < new Date() && new Date(d).toDateString() !== new Date().toDateString();

  if (loading) return <div className="text-sm text-slate-400 text-center py-4">加载中...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">里程碑</h3>
        <Button size="xs" variant="ghost" onClick={() => setShowModal(true)} leftIcon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}>
          添加
        </Button>
      </div>

      {milestones.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">暂无里程碑</p>
      ) : (
        <div className="space-y-2">
          {milestones.map(ms => {
            const taskCount = ms.tasks?.length || 0;
            const doneCount = ms.tasks?.filter(t => t.status === 'DONE').length || 0;
            const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
            return (
              <div key={ms.id} className={`p-3 rounded-xl border transition-colors cursor-pointer group ${ms.status === 'COMPLETED' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-100 hover:border-slate-200'}`} onClick={() => onSelectMilestone?.(ms)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(ms); }} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${ms.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}>
                        {ms.status === 'COMPLETED' && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <span className={`text-sm font-medium truncate ${ms.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{ms.name}</span>
                    </div>
                    {ms.description && <p className="text-xs text-slate-500 mt-1 truncate pl-6">{ms.description}</p>}
                    <div className="flex items-center gap-3 mt-2 pl-6">
                      <Badge variant={isOverdue(ms.dueDate) && ms.status !== 'COMPLETED' ? 'danger' : 'default'} size="sm">{formatDate(ms.dueDate)}</Badge>
                      {taskCount > 0 && <span className="text-xs text-slate-400">{doneCount}/{taskCount} 任务</span>}
                    </div>
                    {taskCount > 0 && (
                      <div className="mt-2 pl-6">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(ms); }} title="编辑">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </IconButton>
                    <IconButton size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(ms.id); }} className="text-red-500 hover:bg-red-50" title="删除">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </IconButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal} title={editId ? '编辑里程碑' : '新建里程碑'} size="sm">
        <div className="space-y-4">
          <Input label="名称" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="里程碑名称" />
          <Input label="描述" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="可选" />
          <Input label="截止日期" type="date" value={form.dueDate} onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={closeModal}>取消</Button>
          <Button onClick={handleSubmit} isLoading={saving}>{editId ? '保存' : '创建'}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
