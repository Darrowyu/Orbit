import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userApi } from '../services/api';
import { useDialog } from '../components/ConfirmDialog';

const AVATARS = ['👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '🕵️‍♂️', '🕵️‍♀️', '👨‍🚀', '👩‍🚀', '👨‍💼', '👩‍💼', '🧑‍🔬', '👨‍🎤', '👩‍🎤', '👨‍🏫', '👩‍🏫', '🦸‍♂️', '🦸‍♀️', '🧙‍♂️', '🧙‍♀️', '🐱', '🐶', '🦊', '🐼', '🐨'];
const COLORS = [
  { value: 'bg-blue-100 text-blue-700', label: '蓝色' },
  { value: 'bg-pink-100 text-pink-700', label: '粉色' },
  { value: 'bg-green-100 text-green-700', label: '绿色' },
  { value: 'bg-purple-100 text-purple-700', label: '紫色' },
  { value: 'bg-orange-100 text-orange-700', label: '橙色' },
  { value: 'bg-red-100 text-red-700', label: '红色' },
  { value: 'bg-yellow-100 text-yellow-700', label: '黄色' },
  { value: 'bg-indigo-100 text-indigo-700', label: '靛蓝' },
];

interface TeamInfo { id: string; name: string; role: string; memberCount: number; members: { user: { id: string; name: string; avatar: string; color: string } }[] }

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [tab, setTab] = useState<'profile' | 'teams' | 'password'>('profile');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [color, setColor] = useState(user?.color || '');
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  const { alert } = useDialog();
  useEffect(() => { userApi.getMyTeams().then(({ data }) => setTeams(data)); }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await userApi.updateProfile({ name, avatar, color });
      updateUser(data);
      await alert({ title: '保存成功', message: '个人资料已更新', type: 'info' });
    } catch { await alert({ title: '保存失败', message: '请稍后重试', type: 'danger' }); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (newPwd.length < 6) { setPwdError('新密码至少6位'); return; }
    if (newPwd !== confirmPwd) { setPwdError('两次密码不一致'); return; }
    try {
      await userApi.changePassword(oldPwd, newPwd);
      await alert({ title: '修改成功', message: '密码已更新，请使用新密码登录', type: 'info' });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) { setPwdError(e.response?.data?.message || '修改失败'); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">个人设置</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {(['profile', 'teams', 'password'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'profile' ? '个人资料' : t === 'teams' ? '我的团队' : '修改密码'}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-6 mb-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${color}`}>{avatar}</div>
              <div><div className="font-semibold text-lg text-gray-900">{user.name}</div><div className="text-sm text-gray-400">{user.email}</div></div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择头像</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((a) => (
                    <button key={a} onClick={() => setAvatar(a)} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${avatar === a ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-gray-100 hover:bg-gray-200'}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">头像背景色</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c.value} onClick={() => setColor(c.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${c.value} ${color === c.value ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}>{c.label}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">{saving ? '保存中...' : '保存修改'}</button>
            </div>
          </div>
        )}

        {tab === 'teams' && (
          <div className="space-y-4">
            {teams.length === 0 ? <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">暂未加入任何团队</div> : teams.map((team) => (
              <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${team.role === 'owner' ? 'bg-amber-100 text-amber-700' : team.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{team.role === 'owner' ? '创建者' : team.role === 'admin' ? '管理员' : '成员'}</span>
                  </div>
                  <span className="text-sm text-gray-400">{team.memberCount} 位成员</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.members.slice(0, 10).map((m) => (
                    <div key={m.user.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${m.user.color}`} title={m.user.name}>{m.user.avatar}</div>
                  ))}
                  {team.memberCount > 10 && <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">+{team.memberCount - 10}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'password' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">原密码</label>
                <input type="password" value={oldPwd} onChange={(e) => { setOldPwd(e.target.value); setPwdError(''); }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
                <input type="password" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdError(''); }} placeholder="至少6位" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">确认新密码</label>
                <input type="password" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(''); }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {pwdError && <p className="text-sm text-red-500">{pwdError}</p>}
              <button onClick={handleChangePassword} className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">修改密码</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
