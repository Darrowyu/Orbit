import React, { useEffect, memo, useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { Button, Input, Select } from '../ui';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

type SettingOption = { value: string; label: string };

type SettingItemBase = { key: string; label: string; desc: string; unit?: string };
type SettingItemSelect = SettingItemBase & { type: 'select'; options: SettingOption[] };
type SettingItemInput = SettingItemBase & { type: 'text' | 'number' };
type SettingItem = SettingItemSelect | SettingItemInput;
type SettingGroup = { title: string; items: SettingItem[] };

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: 'AI 配置',
    items: [
      { key: 'ai_enabled', label: '全局AI功能', type: 'select', options: [{ value: 'true', label: '启用' }, { value: 'false', label: '禁用' }], desc: '禁用后用户无法使用AI任务分解功能' },
      { key: 'ai_default_provider', label: '默认Provider', type: 'select', options: [{ value: 'gemini', label: 'Gemini' }, { value: 'openai', label: 'OpenAI' }, { value: 'custom', label: '自定义' }], desc: '用户未配置时的默认AI服务商' },
    ],
  },
  {
    title: '存储配置',
    items: [
      { key: 'upload_max_size', label: '附件大小限制', type: 'number', unit: 'MB', desc: '单个文件最大上传大小' },
      { key: 'upload_allowed_types', label: '允许文件类型', type: 'text', desc: '逗号分隔，如: jpg,png,pdf,doc' },
    ],
  },
  {
    title: '安全配置',
    items: [
      { key: 'login_max_attempts', label: '登录失败锁定', type: 'number', unit: '次', desc: '超过次数后临时锁定账户' },
      { key: 'password_min_length', label: '密码最小长度', type: 'number', unit: '位', desc: '用户密码最小字符数' },
      { key: 'session_expires', label: '会话有效期', type: 'select', options: [{ value: '1', label: '1天' }, { value: '7', label: '7天' }, { value: '30', label: '30天' }], desc: '用户登录状态保持时间' },
    ],
  },
];

export const AdminSettings: React.FC = memo(() => {
  const { settings, storageStats, fetchSettings, updateSetting, fetchStorageStats } = useAdminStore();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { fetchSettings(); fetchStorageStats(); }, [fetchSettings, fetchStorageStats]);
  useEffect(() => { setLocalSettings(settings); }, [settings]);

  const handleChange = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    await updateSetting(key, localSettings[key] || '');
    setSaving(null);
  };

  return (
    <div className="space-y-6">
      {/* 存储统计 */}
      {storageStats && (
        <div className="minimal-card p-5">
          <h3 className="text-sm font-medium text-neutral-500 mb-4">存储统计</h3>
          <div className="flex gap-8">
            <div>
              <div className="text-2xl font-semibold text-neutral-900">{formatBytes(storageStats.totalSize)}</div>
              <div className="text-xs text-neutral-400 mt-1">总存储占用</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-neutral-900">{storageStats.fileCount}</div>
              <div className="text-xs text-neutral-400 mt-1">文件总数</div>
            </div>
          </div>
        </div>
      )}

      {/* 设置分组 */}
      {SETTING_GROUPS.map((group) => (
        <div key={group.title} className="minimal-card p-5">
          <h3 className="text-sm font-medium text-neutral-500 mb-4">{group.title}</h3>
          <div className="space-y-4">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-start gap-4">
                <div className="w-32 shrink-0">
                  <div className="text-sm font-medium text-neutral-700">{item.label}</div>
                  {item.desc && <div className="text-xs text-neutral-400 mt-0.5">{item.desc}</div>}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  {item.type === 'select' ? (
                    <Select value={localSettings[item.key] || ''} onChange={(e) => handleChange(item.key, e.target.value)} size="sm" options={[{ value: '', label: '未设置' }, ...item.options]} className="w-32" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input type={item.type} value={localSettings[item.key] || ''} onChange={(e) => handleChange(item.key, e.target.value)} size="sm" className="w-24" />
                      {item.unit && <span className="text-sm text-neutral-400">{item.unit}</span>}
                    </div>
                  )}
                  <Button size="xs" variant="ghost" onClick={() => handleSave(item.key)} disabled={saving === item.key || localSettings[item.key] === settings[item.key]}>
                    {saving === item.key ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 说明 */}
      <div className="text-xs text-neutral-400 p-4 bg-neutral-50 rounded-lg">
        <p className="font-medium mb-1">说明</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>部分配置需要重启服务后生效</li>
          <li>安全相关配置变更会同步记录到审计日志</li>
          <li>存储限制不影响已上传文件</li>
        </ul>
      </div>
    </div>
  );
});

AdminSettings.displayName = 'AdminSettings';
