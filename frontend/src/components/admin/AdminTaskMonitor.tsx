import React, { useState, useEffect, memo } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { useDialog } from '../ConfirmDialog';
import { Button, Avatar } from '../ui';

const PRIORITY_LABELS: Record<string, { label: string; class: string }> = {
  HIGH: { label: '高', class: 'bg-red-50 text-red-600' },
  MEDIUM: { label: '中', class: 'bg-amber-50 text-amber-600' },
  LOW: { label: '低', class: 'bg-blue-50 text-blue-600' },
};

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  REVIEW: '#a855f7',
  DONE: '#22c55e',
};

export const AdminTaskMonitor: React.FC = memo(() => {
  const { overdueTasks, overdueTotal, taskStats, isLoading, fetchOverdueTasks, fetchTaskStats, batchArchiveTasks } = useAdminStore();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const { confirm } = useDialog();

  useEffect(() => { fetchOverdueTasks(page); fetchTaskStats(); }, [page, fetchOverdueTasks, fetchTaskStats]);

  const handleSelectAll = () => {
    if (selected.length === overdueTasks.length) setSelected([]);
    else setSelected(overdueTasks.map((t) => t.id));
  };

  const handleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleBatchArchive = async () => {
    if (selected.length === 0) return;
    if (await confirm({ title: '批量归档', message: `确定要归档选中的 ${selected.length} 个任务吗？`, type: 'warning' })) {
      await batchArchiveTasks(selected);
      setSelected([]);
    }
  };

  const getDaysOverdue = (dueDate: string): number => {
    const due = new Date(dueDate);
    const now = new Date();
    return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  const totalTasks = taskStats?.statusDistribution.reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* 任务统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="minimal-card p-5">
          <h3 className="text-sm font-medium text-neutral-500 mb-4">任务状态分布</h3>
          {taskStats && totalTasks > 0 ? (
            <div className="space-y-3">
              {taskStats.statusDistribution.map((s) => (
                <div key={s.status} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-neutral-500">{s.status}</div>
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(s.count / totalTasks) * 100}%`, backgroundColor: STATUS_COLORS[s.status] || '#94a3b8' }} />
                  </div>
                  <div className="w-12 text-right text-sm font-medium text-neutral-900">{s.count}</div>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-8 text-neutral-400">暂无数据</div>}
        </div>

        <div className="minimal-card p-5">
          <h3 className="text-sm font-medium text-neutral-500 mb-4">关键指标</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-red-50">
              <div className="text-2xl font-semibold text-red-600">{overdueTotal}</div>
              <div className="text-xs text-red-500 mt-1">逾期任务</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-amber-50">
              <div className="text-2xl font-semibold text-amber-600">{taskStats?.unassignedCount || 0}</div>
              <div className="text-xs text-amber-500 mt-1">无负责人</div>
            </div>
          </div>
        </div>
      </div>

      {/* 逾期任务列表 */}
      <div className="minimal-card overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-900">逾期任务</h3>
          {selected.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleBatchArchive}>归档选中 ({selected.length})</Button>
          )}
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-neutral-400">加载中...</div>
        ) : overdueTasks.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">暂无逾期任务</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-100">
                <th className="p-4 w-10">
                  <input type="checkbox" checked={selected.length === overdueTasks.length && overdueTasks.length > 0} onChange={handleSelectAll} className="rounded border-neutral-300" />
                </th>
                <th className="p-4 font-medium">任务</th>
                <th className="p-4 font-medium">团队</th>
                <th className="p-4 font-medium">负责人</th>
                <th className="p-4 font-medium">优先级</th>
                <th className="p-4 font-medium">逾期</th>
              </tr>
            </thead>
            <tbody>
              {overdueTasks.map((t) => (
                <tr key={t.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="p-4">
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => handleSelect(t.id)} className="rounded border-neutral-300" />
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-neutral-900">{t.title}</div>
                    <div className="text-xs text-neutral-400">{t.status}</div>
                  </td>
                  <td className="p-4 text-neutral-500">{t.team.name}</td>
                  <td className="p-4">
                    {t.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar src={t.assignee.avatar} fallback={t.assignee.avatar} size="sm" color={t.assignee.color} />
                        <span className="text-neutral-600">{t.assignee.name}</span>
                      </div>
                    ) : <span className="text-neutral-400">未分配</span>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_LABELS[t.priority]?.class || 'bg-neutral-100 text-neutral-500'}`}>
                      {PRIORITY_LABELS[t.priority]?.label || t.priority}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-red-500 font-medium">{getDaysOverdue(t.dueDate)} 天</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="p-4 border-t border-neutral-100 flex justify-between items-center text-sm text-neutral-400">
          <span>共 {overdueTotal} 个逾期任务</span>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
            <span className="px-2 text-neutral-500">第 {page} 页</span>
            <Button variant="ghost" size="xs" onClick={() => setPage((p) => p + 1)} disabled={overdueTasks.length < 20}>下一页</Button>
          </div>
        </div>
      </div>
    </div>
  );
});

AdminTaskMonitor.displayName = 'AdminTaskMonitor';
