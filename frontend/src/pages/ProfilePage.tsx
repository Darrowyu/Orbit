import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userApi } from '../services/api';
import { useDialog } from '../components/ConfirmDialog';
import { AiConfigPanel } from '../components/AiConfigPanel';
import { Card, Button, Input, Avatar, Badge, IconButton } from '../components/ui';

const AVATARS = ['😊', '😎', '🤓', '🧐', '🤖', '👻', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🌟', '⭐', '🎯', '🎨', '🎮', '🎵', '💎', '🔮', '🌈', '☀️'];
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
  const [tab, setTab] = useState<'profile' | 'teams' | 'password' | 'ai'>('profile');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [color, setColor] = useState(user?.color || '');
  const [name, setName] = useState(user?.name || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');

  const { alert } = useDialog();
  useEffect(() => { userApi.getMyTeams().then(({ data }) => setTeams(data)); }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await userApi.updateProfile({ name, avatar, color, skills });
      updateUser(data);
      await alert({ title: '保存成功', message: '个人资料已更新', type: 'info' });
    } catch { await alert({ title: '保存失败', message: '请稍后重试', type: 'danger' }); }
    setSaving(false);
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { await alert({ title: '文件过大', message: '图片大小不能超过 2MB', type: 'warning' }); return; }
    setUploading(true);
    try {
      const { data } = await userApi.uploadAvatar(file);
      setAvatar(data.url); // 只存储相对路径
    } catch { await alert({ title: '上传失败', message: '请稍后重试', type: 'danger' }); }
    finally { setUploading(false); }
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-[var(--shadow-sm)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconButton onClick={() => navigate('/')} variant="ghost" className="text-slate-500 hover:text-[#001C3D]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </IconButton>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#001C3D] to-[#0F4C81]">个人设置</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          {(['profile', 'teams', 'password', 'ai'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-white text-[#001C3D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t === 'profile' ? '个人资料' : t === 'teams' ? '我的团队' : t === 'password' ? '修改密码' : 'AI 设置'}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <Card variant="default" padding="md">
            <div className="flex items-center gap-6 mb-8">
              <Avatar src={avatar} fallback={avatar} size="xl" color={color} className="text-3xl" />
              <div><div className="font-semibold text-lg text-slate-900">{user?.name}</div><div className="text-sm text-slate-400">{user?.email}</div></div>
            </div>
            <div className="space-y-6">
              <div className="max-w-xs">
                <Input label="姓名" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择头像</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {AVATARS.map((a) => (
                    <button key={a} onClick={() => setAvatar(a)} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${avatar === a ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'bg-gray-100 hover:bg-gray-200'}`}>{a}</button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {uploading ? '上传中...' : '上传图片'}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                  </label>
                  {avatar?.startsWith('/uploads') && <span className="text-xs text-gray-500">已上传自定义头像</span>}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">技能标签</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                  {skills.length === 0 && <span className="text-sm text-gray-400">暂无技能标签，添加后可帮助 AI 更精准推荐任务</span>}
                </div>
                <div className="flex gap-2">
                  <Input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="输入技能（如：React、Python、UI设计）" />
                  <Button onClick={addSkill} disabled={!newSkill.trim()} variant="secondary">添加</Button>
                </div>
              </div>
              <Button onClick={handleSaveProfile} isLoading={saving}>{saving ? '保存中...' : '保存修改'}</Button>
            </div>
          </Card>
        )}

        {tab === 'teams' && (
          <div className="space-y-4">
            {teams.length === 0 ? <Card variant="default" padding="lg" className="text-center text-slate-400">暂未加入任何团队</Card> : teams.map((team) => (
              <Card key={team.id} variant="default" padding="md" hoverable>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{team.name}</h3>
                    <Badge variant={team.role === 'owner' ? 'warning' : team.role === 'admin' ? 'primary' : 'default'} size="sm" className="mt-1">{team.role === 'owner' ? '创建者' : team.role === 'admin' ? '管理员' : '成员'}</Badge>
                  </div>
                  <Badge variant="default" size="md">{team.memberCount} 位成员</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.members.slice(0, 10).map((m) => (
                    <Avatar key={m.user.id} src={m.user.avatar} fallback={m.user.avatar} size="sm" color={m.user.color} alt={m.user.name} />
                  ))}
                  {team.memberCount > 10 && <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600 font-medium">+{team.memberCount - 10}</div>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'password' && (
          <Card variant="default" padding="md" className="max-w-md">
            <div className="space-y-4">
              <Input type="password" label="原密码" value={oldPwd} onChange={(e) => { setOldPwd(e.target.value); setPwdError(''); }} />
              <Input type="password" label="新密码" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdError(''); }} placeholder="至少6位" />
              <Input type="password" label="确认新密码" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(''); }} error={!!pwdError} errorText={pwdError} />
              <Button onClick={handleChangePassword}>修改密码</Button>
            </div>
          </Card>
        )}

        {tab === 'ai' && (
          <Card variant="default" padding="md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">自定义 AI 模型</h3>
            <p className="text-sm text-slate-500 mb-6">配置您自己的 AI API Key，使用您偏好的模型进行任务智能生成。未配置时将使用系统默认模型。</p>
            <AiConfigPanel />
          </Card>
        )}
      </div>
    </div>
  );
};
