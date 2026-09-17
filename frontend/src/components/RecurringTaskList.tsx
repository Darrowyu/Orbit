import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import { IconButton } from './ui/IconButton';
import { recurringApi, templateApi, RecurringTask } from '../services/api';
import { TaskTemplate } from '../types';
import { useDialog } from './ConfirmDialog';
import { getErrorMessage } from '../utils/error';

interface RecurringTaskListProps {
  isOpen: boolean;
  onClose: () => void;
}

// 频率单位文案：每 N 天/周/月（key 与后端大写枚举 DTO 一致）
const FREQUENCY_UNITS: Record<string, string> = { DAILY: '天', WEEKLY: '周', MONTHLY: '月' };

const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('zh-CN') : '-');

export const RecurringTaskList: React.FC<RecurringTaskListProps> = ({ isOpen, onClose }) => {
  const { confirm, alert } = useDialog();
  const [rules, setRules] = useState<RecurringTask[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ templateId: '', frequency: 'DAILY', interval: 1, startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [{ data: ruleData }, { data: templateData }] = await Promise.all([recurringApi.getAll(), templateApi.getAll()]);
      setRules(ruleData);
      setTemplates(templateData);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  const handleCreate = async () => {
    if (!form.templateId || !form.startDate) return;
    setSaving(true);
    try {
      const { data } = await recurringApi.create({
        templateId: form.templateId,
        frequency: form.frequency,
        interval: form.interval,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      });
      setRules((rs) => [data, ...rs]);
      setShowForm(false);
      setForm({ templateId: '', frequency: 'DAILY', interval: 1, startDate: '', endDate: '' });
    } catch (err) {
      await alert({ title: '创建失败', message: getErrorMessage(err), type: 'danger' });
    } finally { setSaving(false); }
  };

  const handleToggle = async (rule: RecurringTask) => {
    try {
      const { data } = await recurringApi.update(rule.id, { isActive: !rule.isActive });
      setRules((rs) => rs.map((r) => (r.id === rule.id ? data : r)));
    } catch (err) {
      await alert({ title: '操作失败', message: getErrorMessage(err), type: 'danger' });
    }
  };

  const handleDelete = async (rule: RecurringTask) => {
    if (await confirm({ title: '删除周期任务', message: `确定删除「${rule.template.name}」的周期规则吗？`, type: 'danger', confirmText: '删除' })) {
      try {
        await recurringApi.delete(rule.id);
        setRules((rs) => rs.filter((r) => r.id !== rule.id));
      } catch (err) {
        await alert({ title: '删除失败', message: getErrorMessage(err), type: 'danger' });
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="周期任务" description="按模板定时自动创建任务（每小时检查一次）" size="lg">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowForm((v) => !v)} variant={showForm ? 'ghost' : 'primary'}>
            {showForm ? '收起' : '新建规则'}
          </Button>
        </div>

        {showForm && (
          templates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
              暂无任务模板，请先在「创建新任务」弹窗中创建模板，再来设置周期任务
            </p>
          ) : (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
              <Select
                label="任务模板"
                value={form.templateId}
                onChange={(e) => setForm((f) => ({ ...f, templateId: e.target.value }))}
                options={[{ value: '', label: '选择模板...' }, ...templates.map((t) => ({ value: t.id, label: t.name }))]}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="频率"
                  value={form.frequency}
                  onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                  options={[{ value: 'DAILY', label: '每天' }, { value: 'WEEKLY', label: '每周' }, { value: 'MONTHLY', label: '每月' }]}
                />
                <Input
                  type="number"
                  label="间隔"
                  min={1}
                  value={form.interval}
                  onChange={(e) => setForm((f) => ({ ...f, interval: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  helperText={`每 ${form.interval} ${FREQUENCY_UNITS[form.frequency]}创建一次`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" label="开始日期" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                <Input type="date" label="结束日期（可选）" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleCreate} isLoading={saving} disabled={!form.templateId || !form.startDate}>创建</Button>
              </div>
            </div>
          )
        )}

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-4">加载中...</p>
        ) : loadError ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-red-500">加载失败，请稍后重试</p>
            <Button size="sm" variant="ghost" onClick={load}>重新加载</Button>
          </div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">暂无周期任务规则</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{rule.template.name}</span>
                    <Badge variant={rule.isActive ? 'success' : 'default'} size="sm">{rule.isActive ? '启用中' : '已停用'}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    每 {rule.interval} {FREQUENCY_UNITS[rule.frequency] || rule.frequency} · 下次运行 {formatDate(rule.nextRun)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggle(rule)}
                    title={rule.isActive ? '停用' : '启用'}
                    className={`relative w-9 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-[#001C3D]' : 'bg-slate-200'}`}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                      style={rule.isActive ? { transform: 'translateX(16px)' } : undefined}
                    />
                  </button>
                  <IconButton size="sm" variant="ghost" onClick={() => handleDelete(rule)} className="text-red-500 hover:bg-red-50" title="删除">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
