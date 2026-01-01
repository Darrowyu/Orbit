import React, { useState } from 'react';
import { Button, Modal, Badge, Avatar, Card, Select, IconButton } from './ui';
import { useTeamStore } from '../stores/teamStore';
import { useAuthStore } from '../stores/authStore';
import { TeamRole } from '../types';
import { useDialog } from './ConfirmDialog';

interface Props { isOpen: boolean; onClose: () => void; }

export const TeamSettings: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentTeam, teams, switchTeam, updateMemberRole, removeMember, regenerateCode } = useTeamStore();
  const { user } = useAuthStore();
  const { confirm } = useDialog();
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
  const roleVariants: Record<TeamRole, 'warning' | 'info' | 'default'> = { owner: 'warning', admin: 'info', member: 'default' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="团队设置" size="lg">
      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        {teams.length > 1 && (
          <Select label="切换团队" value={currentTeam.id} onChange={(e) => switchTeam(e.target.value)} options={teams.map(t => ({ value: t.id, label: t.name }))} />
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">邀请码</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-lg tracking-widest text-center text-slate-700">{currentTeam.code}</div>
            <Button variant="secondary" onClick={copyCode}>{copied ? '已复制' : '复制'}</Button>
            {canManage && <Button variant="ghost" onClick={regenerateCode} title="重新生成">🔄</Button>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">邀请链接</label>
          <Button variant="secondary" onClick={copyLink} isFullWidth>复制邀请链接</Button>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">团队成员 ({currentTeam.members.length})</label>
          <div className="space-y-2">
            {currentTeam.members.map(m => {
              const isMe = m.user.id === user?.id;
              const displayUser = isMe && user ? user : m.user;
              return (
              <Card key={m.id} padding="sm" className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={displayUser.avatar} fallback={displayUser.avatar || '?'} size="md" color={displayUser.color} />
                  <div>
                    <div className="font-medium text-slate-900">{displayUser.name} {isMe && <span className="text-slate-400 text-sm">(我)</span>}</div>
                    <div className="text-sm text-slate-500">{displayUser.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={roleVariants[m.role]} size="sm">{roleLabels[m.role]}</Badge>
                  {canManage && m.role !== 'owner' && m.user.id !== user?.id && (
                    <div className="flex items-center gap-1">
                      <div className="w-24">
                        <Select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)} size="sm" options={[{ value: 'admin', label: '管理员' }, { value: 'member', label: '成员' }]} />
                      </div>
                      {isOwner && <IconButton variant="ghost" onClick={() => handleRemove(m.id, m.user.name)} title="移除" className="text-red-500 hover:text-red-700 hover:bg-red-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></IconButton>}
                    </div>
                  )}
                </div>
              </Card>
            );})}
          </div>
        </div>
      </div>
      <div className="p-6 border-t border-slate-100">
        <Button variant="ghost" onClick={onClose} isFullWidth>关闭</Button>
      </div>
    </Modal>
  );
};
