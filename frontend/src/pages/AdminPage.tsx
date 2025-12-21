import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import { useAuthStore } from '../stores/authStore';
import { useDialog } from '../components/ConfirmDialog';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { users, stats, loginLogs, total, isLoading, fetchStats, fetchUsers, toggleUserStatus, resetPassword, setSuperAdmin, deleteUser, fetchLoginLogs } = useAdminStore();
  const [tab, setTab] = useState<'users' | 'logs' | 'stats'>('stats');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pwdModal, setPwdModal] = useState<{ id: string; name: string } | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchLoginLogs();
  }, []);

  useEffect(() => { if (tab === 'users') fetchUsers({ page, search, status: statusFilter }); }, [page, search, statusFilter, tab]);

  const { confirm } = useDialog();
  const handleToggleStatus = async (id: string) => { if (await confirm({ title: '切换状态', message: '确定要切换该用户状态吗？', type: 'warning' })) await toggleUserStatus(id); };
  const openPwdModal = (id: string, name: string) => { setPwdModal({ id, name }); setNewPwd(''); setConfirmPwd(''); setPwdError(''); };
  const handleResetPassword = async () => {
    if (newPwd.length < 6) { setPwdError('密码至少6位'); return; }
    if (newPwd !== confirmPwd) { setPwdError('两次密码不一致'); return; }
    if (!pwdModal) return;
    await resetPassword(pwdModal.id, newPwd);
    setPwdModal(null);
  };
  const handleSetAdmin = async (id: string, current: boolean) => { if (await confirm({ title: '权限变更', message: current ? '确定取消管理员权限？' : '确定设为管理员？', type: 'warning' })) await setSuperAdmin(id, !current); };
  const handleDelete = async (id: string) => { if (await confirm({ title: '删除用户', message: '确定要删除该用户吗？此操作不可恢复！', type: 'danger', confirmText: '删除' })) await deleteUser(id); };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-800">管理后台</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{user?.name}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm overflow-hidden ${user?.avatar?.startsWith('/uploads') ? 'bg-gray-100' : user?.color}`}>
              {user?.avatar?.startsWith('/uploads') ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${user.avatar}`} alt="avatar" className="w-full h-full object-cover" /> : user?.avatar}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {(['stats', 'users', 'logs'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'stats' ? '统计概览' : t === 'users' ? '用户管理' : '登录日志'}
            </button>
          ))}
        </div>

        {tab === 'stats' && stats && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: '总用户', value: stats.totalUsers, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
                { label: '活跃用户', value: stats.activeUsers, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'from-green-500 to-emerald-600', bgColor: 'bg-green-50' },
                { label: '已禁用', value: stats.disabledUsers, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>, color: 'from-red-500 to-rose-600', bgColor: 'bg-red-50' },
                { label: '团队数', value: stats.totalTeams, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, color: 'from-purple-500 to-violet-600', bgColor: 'bg-purple-50' },
                { label: '任务数', value: stats.totalTasks, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, color: 'from-orange-500 to-amber-600', bgColor: 'bg-orange-50' },
              ].map((s, i) => (
                <div key={s.label} className={`p-5 rounded-2xl bg-white border border-gray-100 shadow-sm card-hover animate-fade-in-up`} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg`}>{s.icon}</div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">快速概览</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <div className="text-sm text-gray-500 mb-2">用户活跃率</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{stats.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%</span>
                    <span className="text-sm text-green-600">正常</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${stats.totalUsers ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-2">平均每团队成员</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalTeams ? (stats.totalUsers / stats.totalTeams).toFixed(1) : 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-2">平均每用户任务</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalUsers ? (stats.totalTasks / stats.totalUsers).toFixed(1) : 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-2">平均每团队任务</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalTeams ? (stats.totalTasks / stats.totalTeams).toFixed(1) : 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex gap-3">
              <div className="relative flex-1">
                <input type="text" placeholder="搜索用户名或邮箱..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">全部状态</option>
                <option value="active">活跃</option>
                <option value="disabled">已禁用</option>
              </select>
            </div>
            {isLoading ? <div className="text-center py-12 text-gray-400">加载中...</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b border-gray-100"><th className="p-4 font-medium">用户</th><th className="p-4 font-medium">团队</th><th className="p-4 font-medium">状态</th><th className="p-4 font-medium">最后登录</th><th className="p-4 font-medium text-center">操作</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 overflow-hidden ${u.avatar?.startsWith('/uploads') ? 'bg-gray-100' : u.color}`}>
                              {u.avatar?.startsWith('/uploads') ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${u.avatar}`} alt="avatar" className="w-full h-full object-cover" /> : u.avatar}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 flex items-center gap-2 truncate">{u.name}{u.isSuperAdmin && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">管理员</span>}</div>
                              <div className="text-xs text-gray-400 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{u._count.teamMembers}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? '活跃' : '禁用'}</span></td>
                        <td className="p-4 text-gray-400 text-xs">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN') : '-'}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            {u.id !== user?.id && <button onClick={() => handleToggleStatus(u.id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" title={u.isActive ? '禁用' : '启用'}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={u.isActive ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg></button>}
                            <button onClick={() => openPwdModal(u.id, u.name)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" title="重置密码"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg></button>
                            {u.id !== user?.id && <button onClick={() => handleSetAdmin(u.id, u.isSuperAdmin)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-amber-600" title={u.isSuperAdmin ? '取消管理员' : '设为管理员'}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg></button>}
                            {u.id !== user?.id && <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500" title="删除"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
              <span>共 {total} 位用户</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors">上一页</button>
                <span className="px-3 py-1.5 text-gray-600">第 {page} 页</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={users.length < 20} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors">下一页</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b border-gray-100"><th className="p-4 font-medium">用户</th><th className="p-4 font-medium">IP 地址</th><th className="p-4 font-medium">状态</th><th className="p-4 font-medium">时间</th></tr></thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">暂无登录记录</td></tr>
                  ) : loginLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4"><div className="font-medium text-gray-900">{log.user.name}</div><div className="text-xs text-gray-400">{log.user.email}</div></td>
                      <td className="p-4 text-gray-600">{log.ip || '-'}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-medium ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.success ? '成功' : '失败'}</span></td>
                      <td className="p-4 text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {pwdModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPwdModal(null)}>
          <div className="bg-white rounded-2xl w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">重置密码</h3>
              <p className="text-sm text-gray-500 mt-1">为用户 <span className="font-medium text-indigo-600">{pwdModal.name}</span> 设置新密码</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
                <input type="password" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdError(''); }} placeholder="请输入新密码（至少6位）" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">确认密码</label>
                <input type="password" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(''); }} placeholder="请再次输入新密码" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              {pwdError && <p className="text-sm text-red-500 flex items-center gap-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{pwdError}</p>}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setPwdModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
              <button onClick={handleResetPassword} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">确认重置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
