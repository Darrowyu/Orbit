import React, { useState, useEffect, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import { useAuthStore } from '../stores/authStore';
import { useDialog } from '../components/ConfirmDialog';
import { Button, Input, Avatar, Modal, ModalFooter, Select } from '../components/ui';
import { TrendChart, HealthIndicators, AdminTeamList, AdminProjectList, AdminTaskMonitor, AdminAuditLog, AdminLoginLog, AdminSettings } from '../components/admin';

type TabKey = 'stats' | 'users' | 'teams' | 'projects' | 'tasks' | 'audit' | 'logs' | 'settings';

const UserManagement = memo(({ users, user, total, loading, page, search, statusFilter, setPage, setSearch, setStatusFilter, handleToggleStatus, openPwdModal, handleSetAdmin, handleDelete }: { users: { id: string; name: string; email: string; avatar: string; color: string; isSuperAdmin: boolean; isActive: boolean; lastLoginAt: string | null; _count: { teamMembers: number } }[]; user: { id: string } | null; total: number; loading: boolean; page: number; search: string; statusFilter: string; setPage: (fn: (p: number) => number) => void; setSearch: (s: string) => void; setStatusFilter: (s: string) => void; handleToggleStatus: (id: string) => void; openPwdModal: (id: string, name: string) => void; handleSetAdmin: (id: string, current: boolean) => void; handleDelete: (id: string) => void }) => (
  <div className="minimal-card overflow-hidden">
    <div className="p-4 border-b border-neutral-100 flex gap-3">
      <div className="flex-1"><Input type="text" placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)} size="sm" /></div>
      <div className="w-28"><Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="sm" options={[{ value: '', label: '全部' }, { value: 'active', label: '活跃' }, { value: 'disabled', label: '禁用' }]} /></div>
    </div>
    {loading ? <div className="text-center py-12 text-neutral-400">加载中...</div> : (
      <table className="w-full text-sm">
        <thead><tr className="text-left text-neutral-400 border-b border-neutral-100"><th className="p-4 font-medium">用户</th><th className="p-4 font-medium">团队</th><th className="p-4 font-medium">状态</th><th className="p-4 font-medium">最后登录</th><th className="p-4 font-medium text-center">操作</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
              <td className="p-4"><div className="flex items-center gap-3"><Avatar src={u.avatar} fallback={u.avatar} size="sm" color={u.color} /><div><div className="font-medium text-neutral-900 flex items-center gap-2">{u.name}{u.isSuperAdmin && <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">管理员</span>}</div><div className="text-xs text-neutral-400">{u.email}</div></div></div></td>
              <td className="p-4 text-neutral-500">{u._count.teamMembers}</td>
              <td className="p-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${u.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{u.isActive ? '活跃' : '禁用'}</span></td>
              <td className="p-4 text-neutral-400 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN') : '-'}</td>
              <td className="p-4"><div className="flex justify-center gap-1">
                {u.id !== user?.id && <button onClick={() => handleToggleStatus(u.id)} className="p-1.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors" title={u.isActive ? '禁用' : '启用'}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={u.isActive ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg></button>}
                <button onClick={() => openPwdModal(u.id, u.name)} className="p-1.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors" title="重置密码"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg></button>
                {u.id !== user?.id && <><button onClick={() => handleSetAdmin(u.id, u.isSuperAdmin)} className="p-1.5 rounded text-neutral-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title={u.isSuperAdmin ? '取消管理员' : '设为管理员'}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg></button><button onClick={() => handleDelete(u.id)} className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="删除"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></>}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
    <div className="p-4 border-t border-neutral-100 flex justify-between items-center text-sm text-neutral-400">
      <span>共 {total} 位用户</span>
      <div className="flex gap-2 items-center">
        <Button variant="ghost" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
        <span className="px-2 text-neutral-500">第 {page} 页</span>
        <Button variant="ghost" size="xs" onClick={() => setPage((p) => p + 1)} disabled={users.length < 20}>下一页</Button>
      </div>
    </div>
  </div>
));
UserManagement.displayName = 'UserManagement';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { users, stats, total, trends, health, fetchStats, fetchUsers, toggleUserStatus, resetPassword, setSuperAdmin, deleteUser, fetchTrends, fetchHealth } = useAdminStore();
  const [usersLoading, setUsersLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('stats');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pwdModal, setPwdModal] = useState<{ id: string; name: string } | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => { fetchStats(); fetchUsers().finally(() => setUsersLoading(false)); fetchTrends(); fetchHealth(); }, [fetchStats, fetchUsers, fetchTrends, fetchHealth]);
  useEffect(() => { if (tab === 'users') { setUsersLoading(true); fetchUsers({ page, search, status: statusFilter }).finally(() => setUsersLoading(false)); } }, [page, search, statusFilter, tab, fetchUsers]);

  const { confirm } = useDialog();
  const handleToggleStatus = useCallback(async (id: string) => { if (await confirm({ title: '切换状态', message: '确定要切换该用户状态吗？', type: 'warning' })) await toggleUserStatus(id); }, [confirm, toggleUserStatus]);
  const openPwdModal = useCallback((id: string, name: string) => { setPwdModal({ id, name }); setNewPwd(''); setConfirmPwd(''); setPwdError(''); }, []);
  const handleResetPassword = useCallback(async () => {
    if (newPwd.length < 6) { setPwdError('密码至少6位'); return; }
    if (newPwd !== confirmPwd) { setPwdError('两次密码不一致'); return; }
    if (!pwdModal) return;
    await resetPassword(pwdModal.id, newPwd);
    setPwdModal(null);
  }, [newPwd, confirmPwd, pwdModal, resetPassword]);
  const handleSetAdmin = useCallback(async (id: string, current: boolean) => { if (await confirm({ title: '权限变更', message: current ? '确定取消管理员权限？' : '确定设为管理员？', type: 'warning' })) await setSuperAdmin(id, !current); }, [confirm, setSuperAdmin]);
  const handleDelete = useCallback(async (id: string) => { if (await confirm({ title: '删除用户', message: '确定要删除该用户吗？此操作不可恢复！', type: 'danger', confirmText: '删除' })) await deleteUser(id); }, [confirm, deleteUser]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'stats', label: '概览' },
    { key: 'users', label: '用户' },
    { key: 'teams', label: '团队' },
    { key: 'projects', label: '项目' },
    { key: 'tasks', label: '任务' },
    { key: 'audit', label: '审计' },
    { key: 'logs', label: '日志' },
    { key: 'settings', label: '设置' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50">
      {/* 极简头部 */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="h-5 w-px bg-neutral-200" />
            <h1 className="text-base font-semibold text-neutral-900">管理后台</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">{user?.name}</span>
            <Avatar src={user?.avatar} fallback={user?.avatar} size="sm" color={user?.color} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* 标签切换 */}
        <div className="flex gap-1 mb-6 border-b border-neutral-100">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${tab === t.key ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
              {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
            </button>
          ))}
        </div>

        {/* 统计概览 */}
        {tab === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[{ label: '总用户', value: stats.totalUsers }, { label: '活跃用户', value: stats.activeUsers }, { label: '已禁用', value: stats.disabledUsers }, { label: '团队数', value: stats.totalTeams }, { label: '任务数', value: stats.totalTasks }].map((s, i) => (
                  <div key={s.label} className="minimal-card p-5 animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="text-2xl font-semibold text-neutral-900 mb-1">{s.value}</div>
                    <div className="text-sm text-neutral-400">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {trends && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TrendChart title="新增用户" data={trends.newUsers} dates={trends.dates} color="#6366f1" />
                <TrendChart title="完成任务" data={trends.completedTasks} dates={trends.dates} color="#22c55e" />
                <TrendChart title="活跃用户" data={trends.activeUsers} dates={trends.dates} color="#3b82f6" />
              </div>
            )}
            {health && <HealthIndicators {...health} />}
            {stats && (
              <div className="minimal-card p-6">
                <h3 className="text-sm font-medium text-neutral-500 mb-6">快速概览</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div><div className="text-sm text-neutral-400 mb-2">活跃率</div><div className="text-xl font-semibold text-neutral-900">{stats.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%</div><div className="mt-2 h-1 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-neutral-900 rounded-full transition-all duration-500" style={{ width: `${stats.totalUsers ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%` }} /></div></div>
                  <div><div className="text-sm text-neutral-400 mb-2">平均团队人数</div><div className="text-xl font-semibold text-neutral-900">{stats.totalTeams ? (stats.totalUsers / stats.totalTeams).toFixed(1) : 0}</div></div>
                  <div><div className="text-sm text-neutral-400 mb-2">人均任务</div><div className="text-xl font-semibold text-neutral-900">{stats.totalUsers ? (stats.totalTasks / stats.totalUsers).toFixed(1) : 0}</div></div>
                  <div><div className="text-sm text-neutral-400 mb-2">团队均任务</div><div className="text-xl font-semibold text-neutral-900">{stats.totalTeams ? (stats.totalTasks / stats.totalTeams).toFixed(1) : 0}</div></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 用户管理 */}
        {tab === 'users' && <UserManagement users={users} user={user} total={total} loading={usersLoading} page={page} search={search} statusFilter={statusFilter} setPage={setPage} setSearch={setSearch} setStatusFilter={setStatusFilter} handleToggleStatus={handleToggleStatus} openPwdModal={openPwdModal} handleSetAdmin={handleSetAdmin} handleDelete={handleDelete} />}

        {/* 团队管理 */}
        {tab === 'teams' && <AdminTeamList />}

        {/* 项目管理 */}
        {tab === 'projects' && <AdminProjectList />}

        {/* 任务监控 */}
        {tab === 'tasks' && <AdminTaskMonitor />}

        {/* 操作审计 */}
        {tab === 'audit' && <AdminAuditLog />}

        {/* 登录日志 */}
        {tab === 'logs' && <AdminLoginLog />}

        {/* 系统设置 */}
        {tab === 'settings' && <AdminSettings />}
      </div>

      {/* 重置密码弹窗 */}
      <Modal isOpen={!!pwdModal} onClose={() => setPwdModal(null)} title="重置密码" description={`为 ${pwdModal?.name} 设置新密码`} size="sm">
        <div className="space-y-4">
          <Input type="password" label="新密码" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdError(''); }} placeholder="至少6位" />
          <Input type="password" label="确认密码" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(''); }} error={!!pwdError} errorText={pwdError} />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setPwdModal(null)}>取消</Button>
          <Button onClick={handleResetPassword}>确认</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AdminPage;
