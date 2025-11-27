import React, { useState } from 'react';
import { Button } from './Button';
import { useTeamStore } from '../stores/teamStore';
import { useAuthStore } from '../stores/authStore';
import { TeamRole } from '../types';
import { useDialog } from './ConfirmDialog';

interface Props { isOpen: boolean; onClose: () => void; }

export const TeamSettings: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentTeam, teams, members, switchTeam, updateMemberRole, removeMember, regenerateCode } = useTeamStore();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !currentTeam) return null;

  const myRole = currentTeam.members.find(m => m.user.id === user?.id)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => copyToClipboard(currentTeam.code);
  const copyLink = () => copyToClipboard(`${window.location.origin}/join/${currentTeam.inviteLink}`);

  const { confirm } = useDialog();

  const handleRoleChange = async (memberId: string, role: string) => {
    if (await confirm({ title: '修改角色', message: `确定要修改该成员的角色为 ${role === 'admin' ? '管理员' : '成员'} 吗？`, type: 'warning' })) {
      await updateMemberRole(memberId, role);
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (await confirm({ title: '移除成员', message: `确定要移除成员 ${name} 吗？`, type: 'danger', confirmText: '移除' })) {
      await removeMember(memberId);
    }
  };

  const roleLabels: Record<TeamRole, string> = { owner: '所有者', admin: '管理员', member: '成员' };
  const roleColors: Record<TeamRole, string> = { owner: 'bg-amber-100 text-amber-700', admin: 'bg-purple-100 text-purple-700', member: 'bg-gray-100 text-gray-600' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">团队设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {teams.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">切换团队</label>
              <select value={currentTeam.id} onChange={(e) => switchTeam(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white">
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邀请码</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-lg tracking-widest text-center">{currentTeam.code}</div>
              <Button variant="secondary" onClick={copyCode}>{copied ? '已复制' : '复制'}</Button>
              {canManage && <Button variant="ghost" onClick={regenerateCode} title="重新生成">🔄</Button>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邀请链接</label>
            <Button variant="secondary" onClick={copyLink} className="w-full">复制邀请链接</Button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">团队成员 ({currentTeam.members.length})</label>
            <div className="space-y-2">
              {currentTeam.members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${m.user.color}`}>{m.user.avatar}</div>
                    <div>
                      <div className="font-medium text-gray-900">{m.user.name} {m.user.id === user?.id && <span className="text-gray-400 text-sm">(我)</span>}</div>
                      <div className="text-sm text-gray-500">{m.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[m.role]}`}>{roleLabels[m.role]}</span>
                    {canManage && m.role !== 'owner' && m.user.id !== user?.id && (
                      <div className="flex gap-1">
                        <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)} className="text-xs border rounded p-1">
                          <option value="admin">管理员</option>
                          <option value="member">成员</option>
                        </select>
                        {isOwner && <button onClick={() => handleRemove(m.id, m.user.name)} className="text-red-500 hover:text-red-700 p-1" title="移除"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose} className="w-full">关闭</Button>
        </div>
      </div>
    </div>
  );
};
