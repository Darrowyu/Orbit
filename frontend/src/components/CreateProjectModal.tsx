import { useState, useEffect, memo } from 'react';
import { Project, ProjectStatus, TeamMember } from '../types';
import { Button, Input, Select, Modal, ModalFooter } from './ui';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description?: string; color?: string; startDate?: string; endDate?: string }) => Promise<void>;
    initialData?: Project | null;
    teamMembers?: TeamMember[];
}

const PROJECT_COLORS = ['#001C3D', '#0f4c81', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

const STATUS_OPTIONS = [
    { value: ProjectStatus.ACTIVE, label: '进行中' },
    { value: ProjectStatus.ON_HOLD, label: '暂停' },
    { value: ProjectStatus.COMPLETED, label: '已完成' },
];

export const CreateProjectModal = memo(function CreateProjectModal({ isOpen, onClose, onSubmit, initialData }: CreateProjectModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(PROJECT_COLORS[0]);
    const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.ACTIVE);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            setColor(initialData.color);
            setStatus(initialData.status);
            setStartDate(initialData.startDate?.split('T')[0] || '');
            setEndDate(initialData.endDate?.split('T')[0] || '');
        } else {
            setName('');
            setDescription('');
            setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
            setStatus(ProjectStatus.ACTIVE);
            setStartDate('');
            setEndDate('');
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            await onSubmit({ name: name.trim(), description: description.trim() || undefined, color, startDate: startDate || undefined, endDate: endDate || undefined });
            onClose();
        } finally { setLoading(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? '编辑项目' : '创建新项目'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* 项目名称 */}
                <Input
                    label="项目名称"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="输入项目名称"
                    required
                    autoFocus
                />

                {/* 描述 */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">项目描述</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="简述项目目标和范围..."
                        rows={3}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] transition-all resize-none"
                    />
                </div>

                {/* 颜色选择 */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">项目颜色</label>
                    <div className="flex gap-2 flex-wrap">
                        {PROJECT_COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-[#001C3D] scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* 日期范围 */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="开始日期"
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                    <Input
                        label="结束日期"
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        min={startDate}
                    />
                </div>

                {/* 状态（仅编辑时显示） */}
                {initialData && (
                    <Select
                        label="项目状态"
                        value={status}
                        onChange={e => setStatus(e.target.value as ProjectStatus)}
                        options={STATUS_OPTIONS}
                    />
                )}

                {/* 操作按钮 */}
                <ModalFooter>
                    <Button onClick={onClose} variant="ghost">取消</Button>
                    <Button type="submit" disabled={!name.trim()} isLoading={loading}>{initialData ? '保存更改' : '创建项目'}</Button>
                </ModalFooter>
            </form>
        </Modal>
    );
});
