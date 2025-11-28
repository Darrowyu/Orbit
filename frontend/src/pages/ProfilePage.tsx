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
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [aiPrompt, setAiPrompt] = useState(user?.aiPrompt || '');
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
      const { data } = await userApi.updateProfile({ name, avatar, color, skills, aiPrompt: aiPrompt || undefined });
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
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl overflow-hidden ${avatar?.startsWith('/uploads') ? 'bg-gray-100' : color}`}>
                {avatar?.startsWith('/uploads') ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${avatar}`} alt="avatar" className="w-full h-full object-cover" /> : avatar}
              </div>
              <div><div className="font-semibold text-lg text-gray-900">{user?.name}</div><div className="text-sm text-gray-400">{user?.email}</div></div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">姓名</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
                  <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="输入技能（如：React、Python、UI设计）" className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2" />
                  <button onClick={addSkill} disabled={!newSkill.trim()} className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50">添加</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  AI 提示词定制
                </label>
                <p className="text-xs text-gray-500 mb-2">自定义 AI 生成任务时的提示词，留空则使用默认提示词</p>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={4} placeholder="例如：你是一个敏捷开发专家，请用 Scrum 方法论来拆解任务..." className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm border p-3 font-mono" />
                <div className="mt-2 space-y-1">
                  <div className="flex items-start gap-2 text-xs text-gray-500 bg-purple-50 p-2 rounded">
                    <svg className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <div>可用变量：<code className="bg-white px-1 rounded">{'{title}'}</code> 任务标题</div>
                      <div className="mt-1">系统会自动添加 JSON 格式要求，无需在提示词中指定</div>
                    </div>
                  </div>
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
