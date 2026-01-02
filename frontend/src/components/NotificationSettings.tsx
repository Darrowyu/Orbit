import React, { useEffect, useState } from 'react';
import { notificationApi, NotificationPreference } from '../services/api';

interface SettingItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
    <div>
      <div className="text-sm font-medium text-neutral-900">{label}</div>
      <div className="text-xs text-neutral-400 mt-0.5">{description}</div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-neutral-200'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'left-5' : 'left-1'}`} />
    </button>
  </div>
);

export const NotificationSettings: React.FC = () => {
  const [pref, setPref] = useState<NotificationPreference | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    notificationApi.getPreferences().then(({ data }) => setPref(data));
  }, []);

  const update = async (key: keyof NotificationPreference, value: boolean) => {
    if (!pref) return;
    setSaving(true);
    setPref({ ...pref, [key]: value });
    await notificationApi.updatePreferences({ [key]: value });
    setSaving(false);
  };

  if (!pref) return <div className="p-4 text-center text-neutral-400">加载中...</div>;

  const settings: { key: keyof NotificationPreference; label: string; desc: string }[] = [
    { key: 'taskAssigned', label: '任务指派', desc: '当有新任务指派给你时通知' },
    { key: 'taskStatusChanged', label: '任务状态变更', desc: '当你负责的任务状态变化时通知' },
    { key: 'taskDueSoon', label: '任务即将到期', desc: '任务截止日期前24小时提醒' },
    { key: 'taskOverdue', label: '任务逾期', desc: '任务超过截止日期时提醒' },
    { key: 'newComment', label: '新评论', desc: '当有人评论你负责的任务时通知' },
    { key: 'projectMemberAdded', label: '项目成员变动', desc: '加入/移出项目或角色变更时通知' },
    { key: 'teamJoined', label: '团队动态', desc: '加入团队或角色变更时通知' },
    { key: 'browserPush', label: '浏览器推送', desc: '在桌面显示通知弹窗' },
  ];

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-neutral-900 mb-4">通知偏好设置</h3>
      {saving && <div className="text-xs text-indigo-500 mb-2">保存中...</div>}
      {settings.map(({ key, label, desc }) => (
        <SettingItem key={key} label={label} description={desc} checked={pref[key] as boolean} onChange={(v) => update(key, v)} />
      ))}
    </div>
  );
};

export default NotificationSettings;
