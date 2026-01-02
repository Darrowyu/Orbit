import { memo, useState } from 'react';
import { Project, TeamMember, ProjectRole } from '../types';
import { Button, Modal, ModalFooter, Select, Avatar, Badge, Card } from './ui';
import { IconButton } from './ui/IconButton';

interface ProjectMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    teamMembers: TeamMember[];
    onAddMember: (userId: string, role: string) => Promise<void>;
    onUpdateMember: (memberId: string, role: string) => Promise<void>;
    onRemoveMember: (memberId: string) => Promise<void>;
}

const ROLE_OPTIONS: { value: ProjectRole; label: string }[] = [
    { value: 'admin', label: '管理员' },
    { value: 'member', label: '成员' },
];

export const ProjectMemberModal = memo(function ProjectMemberModal({
    isOpen,
    onClose,
    project,
    teamMembers,
    onAddMember,
    onUpdateMember,
    onRemoveMember,
}: ProjectMemberModalProps) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('member');
    const [loading, setLoading] = useState(false);

    const projectMemberIds = new Set(project.members.map(m => m.user.id));
    const availableMembers = teamMembers.filter(m => !projectMemberIds.has(m.id));

    const handleAdd = async () => {
        if (!selectedUserId) return;
        setLoading(true);
        try {
            await onAddMember(selectedUserId, selectedRole);
            setSelectedUserId('');
            setSelectedRole('member');
        } finally { setLoading(false); }
    };

    const handleRoleChange = async (memberId: string, role: string) => {
        setLoading(true);
        try { await onUpdateMember(memberId, role); } finally { setLoading(false); }
    };

    const handleRemove = async (memberId: string) => {
        if (!window.confirm('确定要移除该成员吗？')) return;
        setLoading(true);
        try { await onRemoveMember(memberId); } finally { setLoading(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="管理项目成员" description={project.name} size="lg">
            <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
                {/* 添加成员 */}
                {availableMembers.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-slate-700 mb-3">添加成员</h3>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Select
                                    value={selectedUserId}
                                    onChange={e => setSelectedUserId(e.target.value)}
                                    options={[{ value: '', label: '选择团队成员...' }, ...availableMembers.map(m => ({ value: m.id, label: `${m.name} (${m.email})` }))]}
                                />
                            </div>
                            <div className="w-28">
                                <Select
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    options={ROLE_OPTIONS}
                                />
                            </div>
                            <Button onClick={handleAdd} disabled={!selectedUserId || loading} isLoading={loading}>添加</Button>
                        </div>
                    </div>
                )}

                {/* 成员列表 */}
                <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">当前成员 ({project.members.length})</h3>
                    <div className="space-y-2">
                        {project.members.map(m => {
                            const isOwner = m.role === 'owner';
                            return (
                                <Card key={m.id} variant="ghost" padding="sm" className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={m.user.name} src={m.user.avatar?.startsWith('http') ? m.user.avatar : undefined} size="md" color={m.user.color} />
                                        <div>
                                            <div className="font-medium text-slate-800 flex items-center gap-2">
                                                {m.user.name}
                                                {isOwner && <Badge variant="warning" size="sm">负责人</Badge>}
                                            </div>
                                            <div className="text-sm text-slate-500">{m.user.email}</div>
                                        </div>
                                    </div>

                                    {!isOwner && (
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={m.role}
                                                onChange={e => handleRoleChange(m.id, e.target.value)}
                                                options={ROLE_OPTIONS}
                                                disabled={loading}
                                            />
                                            <IconButton
                                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                                                onClick={() => handleRemove(m.id)}
                                                disabled={loading}
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            />
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* 权限说明 */}
                <Card variant="ghost" padding="sm" className="mt-6">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">角色权限说明</h4>
                    <div className="space-y-1 text-xs text-slate-500">
                        <div><Badge variant="warning" size="sm">负责人</Badge> 完全控制权限，可删除项目</div>
                        <div><Badge variant="info" size="sm">管理员</Badge> 可编辑项目信息和管理成员</div>
                        <div><Badge variant="default" size="sm">成员</Badge> 可查看项目和处理分配的任务</div>
                    </div>
                </Card>
            </div>

            <ModalFooter>
                <Button onClick={onClose} variant="ghost">关闭</Button>
            </ModalFooter>
        </Modal>
    );
});
