import React, { useState, useEffect } from 'react';
import { TaskTemplate } from '../types';
import { templateApi } from '../services/api';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Modal, ModalFooter } from './ui/Modal';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';

interface TaskTemplateListProps {
  onSelect: (template: TaskTemplate) => void;
}

export const TaskTemplateList: React.FC<TaskTemplateListProps> = ({ onSelect }) => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', title: '', description: '', priority: 'MEDIUM', subtasks: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await templateApi.getAll();
      setTemplates(data);
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.title.trim()) return;
    setSaving(true);
    try {
      const subtasks = form.subtasks.split('\n').map(s => s.trim()).filter(Boolean);
      const { data } = await templateApi.create({ ...form, subtasks });
      setTemplates(ts => [data, ...ts]);
      setShowModal(false);
      setForm({ name: '', title: '', description: '', priority: 'MEDIUM', subtasks: '' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除此模板？')) return;
    await templateApi.delete(id);
    setTemplates(ts => ts.filter(t => t.id !== id));
  };

  const priorityLabels: Record<string, string> = { LOW: '低', MEDIUM: '中', HIGH: '高' };
  const priorityVariants: Record<string, 'success' | 'warning' | 'danger'> = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger' };

  if (loading) return <div className="text-sm text-slate-400 text-center py-4">加载中...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">任务模板</h3>
        <Button size="xs" variant="ghost" onClick={() => setShowModal(true)} leftIcon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}>
          新建
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">暂无模板，创建常用任务模板可快速复用</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} onClick={() => onSelect(t)} className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white cursor-pointer group transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{t.name}</span>
                    <Badge variant={priorityVariants[t.priority]} size="sm">{priorityLabels[t.priority]}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{t.title}</p>
                  {t.subtasks.length > 0 && <p className="text-xs text-slate-400 mt-1">{t.subtasks.length} 个子任务</p>}
                </div>
                <IconButton size="sm" variant="ghost" onClick={(e) => handleDelete(t.id, e)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50" title="删除">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="新建模板" size="md">
        <div className="space-y-4">
          <Input label="模板名称" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：日常Bug修复" />
          <Input label="任务标题" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="任务默认标题" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">描述</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="任务描述..." rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">优先级</label>
            <div className="flex gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.priority === p ? 'bg-[#001C3D] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">子任务（每行一个）</label>
            <textarea value={form.subtasks} onChange={(e) => setForm(f => ({ ...f, subtasks: e.target.value }))} placeholder="子任务1&#10;子任务2&#10;子任务3" rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] resize-none" />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowModal(false)}>取消</Button>
          <Button onClick={handleCreate} isLoading={saving}>创建</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
