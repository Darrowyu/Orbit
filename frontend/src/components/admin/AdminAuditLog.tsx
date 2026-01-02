import React, { useState, useEffect, memo } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { Button, Avatar, Select, Input } from '../ui';

const ACTION_LABELS: Record<string, { label: string; class: string }> = {
  CREATE: { label: '创建', class: 'bg-emerald-50 text-emerald-600' },
  UPDATE: { label: '更新', class: 'bg-blue-50 text-blue-600' },
  DELETE: { label: '删除', class: 'bg-red-50 text-red-600' },
  ARCHIVE: { label: '归档', class: 'bg-amber-50 text-amber-600' },
  RESTORE: { label: '恢复', class: 'bg-purple-50 text-purple-600' },
  MOVE: { label: '移动', class: 'bg-cyan-50 text-cyan-600' },
  ASSIGN: { label: '分配', class: 'bg-indigo-50 text-indigo-600' },
};

const ENTITY_LABELS: Record<string, string> = {
  TASK: '任务',
  SUBTASK: '子任务',
  PROJECT: '项目',
  TEAM: '团队',
  USER: '用户',
};

const ACTION_OPTIONS = [
  { value: '', label: '全部操作' },
  { value: 'CREATE', label: '创建' },
  { value: 'UPDATE', label: '更新' },
  { value: 'DELETE', label: '删除' },
  { value: 'ARCHIVE', label: '归档' },
  { value: 'RESTORE', label: '恢复' },
];

const ENTITY_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'TASK', label: '任务' },
  { value: 'PROJECT', label: '项目' },
  { value: 'TEAM', label: '团队' },
  { value: 'USER', label: '用户' },
];

export const AdminAuditLog: React.FC = memo(() => {
  const { auditLogs, auditTotal, isLoading, fetchAuditLogs, users, fetchUsers } = useAdminStore();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchAuditLogs({ page, action, entityType, userId, startDate, endDate }); }, [page, action, entityType, userId, startDate, endDate, fetchAuditLogs]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderJson = (data: Record<string, unknown> | null): React.ReactNode => {
    if (!data) return <span className="text-neutral-400">-</span>;
    return (
      <pre className="text-xs bg-neutral-50 p-2 rounded overflow-x-auto max-h-40">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="w-32">
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} size="sm" options={ACTION_OPTIONS} />
        </div>
        <div className="w-32">
          <Select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} size="sm" options={ENTITY_OPTIONS} />
        </div>
        <div className="w-36">
          <Select value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} size="sm" options={[{ value: '', label: '全部用户' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
        </div>
        <div className="w-36">
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} size="sm" placeholder="开始日期" />
        </div>
        <div className="w-36">
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} size="sm" placeholder="结束日期" />
        </div>
      </div>

      <div className="minimal-card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-neutral-400">加载中...</div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">暂无记录</div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {auditLogs.map((log) => (
              <div key={log.id}>
                <div className="p-4 flex items-center gap-4 hover:bg-neutral-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(log.id)}>
                  <div className="text-xs text-neutral-400 w-32 shrink-0">
                    {new Date(log.createdAt).toLocaleString('zh-CN')}
                  </div>
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <Avatar src={log.user.avatar} fallback={log.user.avatar} size="xs" color={log.user.color} />
                    <span className="text-sm text-neutral-600 truncate">{log.user.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${ACTION_LABELS[log.action]?.class || 'bg-neutral-100 text-neutral-500'}`}>
                    {ACTION_LABELS[log.action]?.label || log.action}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-neutral-100 text-neutral-500 shrink-0">
                    {ENTITY_LABELS[log.entityType] || log.entityType}
                  </span>
                  <span className="text-xs text-neutral-400 truncate flex-1">{log.entityId}</span>
                  <svg className={`w-4 h-4 text-neutral-400 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedId === log.id && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">变更前</div>
                      {renderJson(log.oldValue)}
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 mb-1">变更后</div>
                      {renderJson(log.newValue)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="p-4 border-t border-neutral-100 flex justify-between items-center text-sm text-neutral-400">
          <span>共 {auditTotal} 条记录</span>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>上一页</Button>
            <span className="px-2 text-neutral-500">第 {page} 页</span>
            <Button variant="ghost" size="xs" onClick={() => setPage((p) => p + 1)} disabled={auditLogs.length < 50}>下一页</Button>
          </div>
        </div>
      </div>
    </div>
  );
});

AdminAuditLog.displayName = 'AdminAuditLog';
