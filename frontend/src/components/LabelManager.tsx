import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Tag } from './ui/Tag';
import { useLabelStore } from '../stores/labelStore';
import { labelApi } from '../services/api';
import { Label } from '../types';

const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

interface LabelManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LabelManager: React.FC<LabelManagerProps> = ({ isOpen, onClose }) => {
  const { labels, setLabels, addLabel, updateLabel, removeLabel } = useLabelStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && labels.length === 0) {
      labelApi.getAll().then(({ data }) => setLabels(data)).catch(() => {});
    }
  }, [isOpen, labels.length, setLabels]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (editId) {
        const { data } = await labelApi.update(editId, { name, color });
        updateLabel(editId, data);
        setEditId(null);
      } else {
        const { data } = await labelApi.create({ name, color });
        addLabel(data);
      }
      setName('');
      setColor(PRESET_COLORS[0]);
    } finally { setLoading(false); }
  };

  const handleEdit = (label: Label) => {
    setEditId(label.id);
    setName(label.name);
    setColor(label.color);
  };

  const handleDelete = async (id: string) => {
    await labelApi.delete(id);
    removeLabel(id);
    if (editId === id) { setEditId(null); setName(''); }
  };

  const handleCancel = () => {
    setEditId(null);
    setName('');
    setColor(PRESET_COLORS[0]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="管理标签" size="sm">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="标签名称" size="sm" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          <Button onClick={handleSubmit} isLoading={loading} size="sm">{editId ? '更新' : '添加'}</Button>
          {editId && <Button onClick={handleCancel} variant="ghost" size="sm">取消</Button>}
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="border-t border-slate-100 pt-4 space-y-2 max-h-60 overflow-y-auto">
          {labels.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">暂无标签，创建第一个吧</p>
          ) : labels.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group">
              <Tag color={l.color}>{l.name}</Tag>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconButton size="sm" variant="ghost" onClick={() => handleEdit(l)} title="编辑">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </IconButton>
                <IconButton size="sm" variant="ghost" onClick={() => handleDelete(l.id)} className="text-red-500 hover:bg-red-50" title="删除">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
