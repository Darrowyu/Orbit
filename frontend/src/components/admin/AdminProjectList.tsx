import React, { useState, useEffect, memo } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { useDialog } from '../ConfirmDialog';
import { Button, Input, Avatar, Modal, ModalFooter, Select } from '../ui';
import { adminApi } from '../../services/api';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'ACTIVE', label: '活跃' },
  { value: 'ON_HOLD', label: '暂停' },
  { value: 'COMPLETED', label: '完成' },
  { value: 'archived', label: '已归档' },
];

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  ACTIVE: { label: '活跃', class: 'bg-emerald-50 text-emerald-600' },
  ON_HOLD: { label: '暂停', class: 'bg-amber-50 text-amber-600' },
  COMPLETED: { label: '完成', class: 'bg-blue-50 text-blue-600' },
  ARCHIVED: { label: '归档', class: 'bg-neutral-100 text-neutral-500' },
};

export const AdminProjectList: React.FC = memo(() => {
  const { projects, projectsTotal, teams, isLoading, fetchProjects, fetchTeams, archiveProject, restoreProject } = useAdminStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [teamId, setTeamId] = useState('');
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<{ milestones: { id: string; name: string; status: string; dueDate: string }[]; taskStats: { status: string; _count: number }[]; _count: { tasks: number } } | null>(null);
  const { confirm } = useDialog();

  useEffect(() => { fetchTeams(); }, [fetchTeams]);
  useEffect(() => { fetchProjects({ page, status, teamId, search }); }, [page, status, teamId, search, fetchProjects]);

  const handleViewDetail = async (id: string) => {
    setDetailModal(id);
    try {
      const { data } = await adminApi.getProjectDetail(id);
      setProjectDetail(data);
    } catch { setProjectDetail(null); }
  };

  const handleArchive = async (id: string, name: string) => {
    if (await confirm({ title: '归档项目', message: `确定要归档项目"${name}"吗？`, type: 'warning' })) {
      await archiveProject(id);
    }
  };

  const handleRestore = async (id: string) => {
    await restoreProject(id);
    fetchProjects({ page, status, teamId, search });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <Input type="text" placeholder="搜索项目名称..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} size="sm" />
        </div>
        <div className="w-28">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} size="sm" options={STATUS_OPTIONS} />
        </div>
        <div className="w-32">
          <Select value={teamId} onChange={(e) => { setTeamId(e.target.value); setPage(1); }} size="sm" options={[{ value: '', label: '全部团队' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]} />
        </div>
      </div>

      <div className="minimal-card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-neutral-400">加载中...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-100">
                <th className="p-4 font-medium">项目</th>
                <th className="p-4 font-medium">团队</th>
                <th className="p-4 font-medium">负责人</th>
                <th className="p-4 font-medium">状态</th>
                <th className="p-4 font-medium text-center">任务</th>
                <th className="p-4 font-medium text-center">里程碑</th>
                <th className="p-4 font-medium">创建时间</th>
                <th className="p-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-medium text-neutral-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-neutral-500">{p.team.name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Avatar src={p.owner.avatar} fallback={p.owner.avatar} size="sm" color={p.owner.color} />
                      <span className="text-neutral-600">{p.owner.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.isArchived ? STATUS_LABELS.ARCHIVED.class : (STATUS_LABELS[p.status]?.class || 'bg-neutral-100 text-neutral-500')}`}>
                      {p.isArchived ? '归档' : (STATUS_LABELS[p.status]?.label || p.status)}
                    </span>
                  </td>
                  <td className="p-4 text-center text-neutral-500">{p._count.tasks}</td>
                  <td className="p-4 text-center text-neutral-500">{p._count.milestones}</td>
                  <td className="p-4 text-neutral-400 text-xs">{new Date(p.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleViewDetail(p.id)} className="p-1.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors" title="查看详情">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {p.isArchived ? (
                        <button onClick={() => handleRestore(p.id)} className="p-1.5 rounded text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="恢复项目">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      ) : (
                        <button onClick={() => handleArchive(p.id, p.name)} className="p-1.5 rounded text-neutral-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="归档项目">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="p-4 border-t border-neutral-100 flex justify-between items-center text-sm text-neutral-400">
          <span>共 {projectsTotal} 个项目</span>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
            <span className="px-2 text-neutral-500">第 {page} 页</span>
            <Button variant="ghost" size="xs" onClick={() => setPage((p) => p + 1)} disabled={projects.length < 20}>下一页</Button>
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      <Modal isOpen={!!detailModal} onClose={() => { setDetailModal(null); setProjectDetail(null); }} title="项目详情" size="lg">
        {projectDetail ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-neutral-500 mb-2">任务统计</h4>
              <div className="flex gap-4">
                {projectDetail.taskStats.map((s) => (
                  <div key={s.status} className="text-center">
                    <div className="text-lg font-semibold text-neutral-900">{s._count}</div>
                    <div className="text-xs text-neutral-400">{s.status}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-500 mb-2">里程碑 ({projectDetail.milestones.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {projectDetail.milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded bg-neutral-50">
                    <span className="text-sm text-neutral-900">{m.name}</span>
                    <span className="text-xs text-neutral-400">{new Date(m.dueDate).toLocaleDateString('zh-CN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : <div className="text-center py-8 text-neutral-400">加载中...</div>}
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setDetailModal(null); setProjectDetail(null); }}>关闭</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
});

AdminProjectList.displayName = 'AdminProjectList';
