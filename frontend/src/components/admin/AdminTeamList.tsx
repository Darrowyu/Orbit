import React, { useState, useEffect, memo } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { useDialog } from '../ConfirmDialog';
import { Button, Input, Avatar, Modal, ModalFooter, Select } from '../ui';
import { adminApi } from '../../services/api';

export const AdminTeamList: React.FC = memo(() => {
  const { teams, teamsTotal, fetchTeams, transferOwnership, dissolveTeam } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState<string | null>(null);
  const [transferModal, setTransferModal] = useState<{ teamId: string; members: { userId: string; user: { id: string; name: string } }[] } | null>(null);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [teamDetail, setTeamDetail] = useState<{ members: { user: { id: string; name: string; email: string; avatar: string; color: string } }[]; projects: { id: string; name: string; status: string; color: string }[]; _count: { tasks: number } } | null>(null);
  const { confirm } = useDialog();

  useEffect(() => { setLoading(true); fetchTeams({ page, search }).finally(() => setLoading(false)); }, [page, search, fetchTeams]);

  const handleViewDetail = async (id: string) => {
    setDetailModal(id);
    try {
      const { data } = await adminApi.getTeamDetail(id);
      setTeamDetail(data);
    } catch { setTeamDetail(null); }
  };

  const handleTransfer = async (teamId: string) => {
    try {
      const { data } = await adminApi.getTeamDetail(teamId);
      setTransferModal({ teamId, members: data.members });
      setNewOwnerId('');
    } catch { /* 静默处理 */ }
  };

  const handleConfirmTransfer = async () => {
    if (!transferModal || !newOwnerId) return;
    await transferOwnership(transferModal.teamId, newOwnerId);
    setTransferModal(null);
    fetchTeams({ page, search });
  };

  const handleDissolve = async (id: string, name: string) => {
    if (await confirm({ title: '解散团队', message: `确定要解散团队"${name}"吗？此操作将删除所有相关数据且不可恢复！`, type: 'danger', confirmText: '解散' })) {
      await dissolveTeam(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <Input type="text" placeholder="搜索团队名称或代码..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} size="sm" />
        </div>
      </div>

      <div className="minimal-card overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-neutral-400">加载中...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 border-b border-neutral-100">
                <th className="p-4 font-medium">团队</th>
                <th className="p-4 font-medium">所有者</th>
                <th className="p-4 font-medium text-center">成员</th>
                <th className="p-4 font-medium text-center">项目</th>
                <th className="p-4 font-medium text-center">任务</th>
                <th className="p-4 font-medium">创建时间</th>
                <th className="p-4 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-neutral-900">{t.name}</div>
                    <div className="text-xs text-neutral-400">{t.code}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Avatar src={t.owner.avatar} fallback={t.owner.avatar} size="sm" color={t.owner.color} />
                      <span className="text-neutral-600">{t.owner.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center text-neutral-500">{t._count.members}</td>
                  <td className="p-4 text-center text-neutral-500">{t._count.projects}</td>
                  <td className="p-4 text-center text-neutral-500">{t._count.tasks}</td>
                  <td className="p-4 text-neutral-400 text-xs">{new Date(t.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleViewDetail(t.id)} className="p-1.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors" title="查看详情">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button onClick={() => handleTransfer(t.id)} className="p-1.5 rounded text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="转让所有权">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </button>
                      <button onClick={() => handleDissolve(t.id, t.name)} className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="解散团队">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="p-4 border-t border-neutral-100 flex justify-between items-center text-sm text-neutral-400">
          <span>共 {teamsTotal} 个团队</span>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
            <span className="px-2 text-neutral-500">第 {page} 页</span>
            <Button variant="ghost" size="xs" onClick={() => setPage((p) => p + 1)} disabled={teams.length < 20}>下一页</Button>
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      <Modal isOpen={!!detailModal} onClose={() => { setDetailModal(null); setTeamDetail(null); }} title="团队详情" size="lg">
        {teamDetail ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-neutral-500 mb-2">成员 ({teamDetail.members.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {teamDetail.members.map((m) => (
                  <div key={m.user.id} className="flex items-center gap-2 p-2 rounded bg-neutral-50">
                    <Avatar src={m.user.avatar} fallback={m.user.avatar} size="sm" color={m.user.color} />
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{m.user.name}</div>
                      <div className="text-xs text-neutral-400">{m.user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-500 mb-2">项目 ({teamDetail.projects.length})</h4>
              <div className="flex flex-wrap gap-2">
                {teamDetail.projects.map((p) => (
                  <span key={p.id} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: `${p.color}20`, color: p.color }}>{p.name}</span>
                ))}
              </div>
            </div>
            <div className="text-sm text-neutral-500">任务总数: {teamDetail._count.tasks}</div>
          </div>
        ) : <div className="text-center py-8 text-neutral-400">加载中...</div>}
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setDetailModal(null); setTeamDetail(null); }}>关闭</Button>
        </ModalFooter>
      </Modal>

      {/* 转让弹窗 */}
      <Modal isOpen={!!transferModal} onClose={() => setTransferModal(null)} title="转让所有权" size="sm">
        <Select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)} label="选择新所有者" options={[{ value: '', label: '请选择' }, ...(transferModal?.members.map((m) => ({ value: m.userId, label: m.user.name })) || [])]} />
        <ModalFooter>
          <Button variant="ghost" onClick={() => setTransferModal(null)}>取消</Button>
          <Button onClick={handleConfirmTransfer} disabled={!newOwnerId}>确认转让</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
});

AdminTeamList.displayName = 'AdminTeamList';
