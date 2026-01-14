import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { userApi } from '../services/api';
import { useDialog } from '../components/ConfirmDialog';
import { AiConfigPanel } from '../components/AiConfigPanel';
import { Button, Input, Avatar, Badge } from '../components/ui';

const AVATAR_CATEGORIES = [
  { key: 'face', label: '表情', items: ['😊', '😎', '🤓', '🧐', '😄', '🥳', '😇', '🤩', '😏', '🥰', '😋', '🤗', '😴', '🤔', '🙃', '😜'] },
  { key: 'animal', label: '动物', items: ['🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐰', '🐻', '🐮', '🐷', '🐵', '🦄', '🐲', '🦋'] },
  { key: 'food', label: '美食', items: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍩', '🍪', '🧁', '🍰', '🍦', '🍫', '🥐', '🍿', '🥤', '☕'] },
  { key: 'sport', label: '运动', items: ['⚽', '🏀', '🎾', '🏐', '🎱', '🏓', '🏸', '⛳', '🎯', '🎳', '🏋️', '🚴', '🏄', '⛷️', '🏊', '🧘'] },
  { key: 'nature', label: '自然', items: ['🌸', '🌺', '🌻', '🌹', '🌈', '☀️', '🌙', '⭐', '🌟', '❄️', '🔥', '💧', '🍀', '🌵', '🌴', '🍄'] },
  { key: 'object', label: '物品', items: ['💎', '🔮', '🎨', '🎮', '🎵', '🎸', '🎹', '📷', '💡', '🔧', '🚀', '✈️', '🎁', '👑', '💰', '🏆'] },
  { key: 'robot', label: '奇幻', items: ['🤖', '👻', '👽', '🎃', '💀', '👾', '🧙', '🧛', '🧜', '🧚', '🦸', '🦹', '🥷', '🧞', '🧟', '👹'] },
  { key: 'work', label: '工作', items: ['👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧'] },
] as const;
const COLORS = [
  { value: 'bg-blue-100 text-blue-700', label: '蓝' },
  { value: 'bg-pink-100 text-pink-700', label: '粉' },
  { value: 'bg-green-100 text-green-700', label: '绿' },
  { value: 'bg-purple-100 text-purple-700', label: '紫' },
  { value: 'bg-orange-100 text-orange-700', label: '橙' },
  { value: 'bg-red-100 text-red-700', label: '红' },
  { value: 'bg-yellow-100 text-yellow-700', label: '黄' },
  { value: 'bg-neutral-100 text-neutral-700', label: '灰' },
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
  const [avatarCategory, setAvatarCategory] = useState<string>('face');

  const { alert } = useDialog();
  useEffect(() => {
    let cancelled = false;
    userApi.getMyTeams().then(({ data }) => { if (!cancelled) setTeams(data); });
    return () => { cancelled = true; };
  }, []);

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
    if (file.size > 2 * 1024 * 1024) { await alert({ title: '文件过大', message: '图片不能超过 2MB', type: 'warning' }); return; }
    setUploading(true);
    try {
      const { data } = await userApi.uploadAvatar(file);
      setAvatar(data.url);
    } catch { await alert({ title: '上传失败', message: '请稍后重试', type: 'danger' }); }
    finally { setUploading(false); }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (newPwd.length < 6) { setPwdError('新密码至少6位'); return; }
    if (newPwd !== confirmPwd) { setPwdError('两次密码不一致'); return; }
    try {
      await userApi.changePassword(oldPwd, newPwd);
      await alert({ title: '修改成功', message: '密码已更新', type: 'info' });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: unknown) { setPwdError((e as { response?: { data?: { message?: string } } }).response?.data?.message || '修改失败'); }
  };

  const tabs = [
    { key: 'profile', label: '资料' },
    { key: 'teams', label: '团队' },
    { key: 'password', label: '密码' },
    { key: 'ai', label: 'AI' },
  ] as const;

  return (
    <div className="min-h-screen bg-neutral-50/50">
      {/* 极简头部 */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="h-5 w-px bg-neutral-200 mx-4" />
          <h1 className="text-base font-semibold text-neutral-900">设置</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* 标签切换 */}
        <div className="flex gap-1 mb-6 border-b border-neutral-100">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${tab === t.key ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
              {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
            </button>
          ))}
        </div>

        {/* 个人资料 */}
        {tab === 'profile' && (
          <div className="minimal-card p-6 animate-fade-in">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-neutral-100">
              <Avatar src={avatar} fallback={avatar} size="xl" color={color} className="text-3xl" />
              <div>
                <div className="font-semibold text-neutral-900">{user?.name}</div>
                <div className="text-sm text-neutral-400">{user?.email}</div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="max-w-xs">
                <Input label="姓名" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-3">头像</label>
                <div className="flex flex-wrap gap-1 mb-3">
                  {AVATAR_CATEGORIES.map((cat) => (
                    <button key={cat.key} onClick={() => setAvatarCategory(cat.key)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${avatarCategory === cat.key ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{cat.label}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-neutral-50 rounded-lg min-h-[88px]">
                  {AVATAR_CATEGORIES.find(c => c.key === avatarCategory)?.items.map((a) => (
                    <button key={a} onClick={() => setAvatar(a)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${avatar === a ? 'ring-2 ring-neutral-900 ring-offset-1 bg-white' : 'bg-white hover:bg-neutral-100'}`}>{a}</button>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {uploading ? '上传中...' : '上传图片'}
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-3">背景色</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c.value} onClick={() => setColor(c.value)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${c.value} ${color === c.value ? 'ring-2 ring-neutral-900 ring-offset-1' : ''}`}>{c.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-3">技能</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg text-sm">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-neutral-900 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                  {skills.length === 0 && <span className="text-sm text-neutral-400">暂无技能标签</span>}
                </div>
                <div className="flex gap-2 max-w-sm">
                  <Input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="添加技能" size="sm" />
                  <Button onClick={addSkill} disabled={!newSkill.trim()} variant="secondary" size="sm" className="whitespace-nowrap">添加</Button>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveProfile} isLoading={saving}>{saving ? '保存中...' : '保存'}</Button>
              </div>
            </div>
          </div>
        )}

        {/* 我的团队 */}
        {tab === 'teams' && (
          <div className="space-y-3 animate-fade-in">
            {teams.length === 0 ? (
              <div className="minimal-card p-12 text-center text-neutral-400">暂未加入团队</div>
            ) : teams.map((team) => (
              <div key={team.id} className="minimal-card p-5">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-medium text-neutral-900">{team.name}</h3>
                    <Badge variant={team.role === 'owner' ? 'warning' : team.role === 'admin' ? 'primary' : 'default'} size="sm" className="mt-1">
                      {team.role === 'owner' ? '创建者' : team.role === 'admin' ? '管理员' : '成员'}
                    </Badge>
                  </div>
                  <span className="text-sm text-neutral-400">{team.memberCount} 人</span>
                </div>
                <div className="flex -space-x-2">
                  {team.members.slice(0, 8).map((m) => (
                    <Avatar key={m.user.id} src={m.user.avatar} fallback={m.user.avatar} size="sm" color={m.user.color} className="ring-2 ring-white" />
                  ))}
                  {team.memberCount > 8 && <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs text-neutral-500 ring-2 ring-white">+{team.memberCount - 8}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 修改密码 */}
        {tab === 'password' && (
          <div className="minimal-card p-6 max-w-sm animate-fade-in">
            <div className="space-y-4">
              <Input type="password" label="原密码" value={oldPwd} onChange={(e) => { setOldPwd(e.target.value); setPwdError(''); }} />
              <Input type="password" label="新密码" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdError(''); }} placeholder="至少6位" />
              <Input type="password" label="确认新密码" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(''); }} error={!!pwdError} errorText={pwdError} />
              <Button onClick={handleChangePassword}>修改密码</Button>
            </div>
          </div>
        )}

        {/* AI 设置 */}
        {tab === 'ai' && (
          <div className="minimal-card p-6 animate-fade-in">
            <h3 className="font-medium text-neutral-900 mb-2">自定义 AI 模型</h3>
            <p className="text-sm text-neutral-400 mb-6">配置您的 API Key，使用偏好的模型。</p>
            <AiConfigPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
