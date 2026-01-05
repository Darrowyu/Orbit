import React, { useState, useEffect, memo, useCallback } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { Button, Avatar, Select, Input } from '../ui';

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
];

const parseUserAgent = (ua: string | null): { browser: string; os: string; device: string } => {
  if (!ua) return { browser: '未知', os: '未知', device: '未知' };
  
  let browser = '未知';
  let os = '未知';
  let device = '桌面端';
  
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) { os = 'Android'; device = '移动端'; }
  else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; device = '移动端'; }
  
  return { browser, os, device };
};

export const AdminLoginLog: React.FC = memo(() => {
  const { loginLogs, users, fetchLoginLogs, fetchUsers } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  
  useEffect(() => {
    setLoading(true);
    fetchLoginLogs(userId || undefined, page).finally(() => setLoading(false));
  }, [page, userId, fetchLoginLogs]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const filteredLogs = loginLogs.filter((log) => {
    if (status === 'success' && !log.success) return false;
    if (status === 'failed' && log.success) return false;
    if (startDate && new Date(log.createdAt) < new Date(startDate)) return false;
    if (endDate && new Date(log.createdAt) > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });

  const handleFilterChange = useCallback((setter: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-3">
        <div className="w-36">
          <Select 
            value={userId} 
            onChange={handleFilterChange(setUserId)} 
            size="sm" 
            options={[{ value: '', label: '全部用户' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} 
          />
        </div>
        <div className="w-28">
          <Select 
            value={status} 
            onChange={handleFilterChange(setStatus)} 
            size="sm" 
            options={STATUS_OPTIONS} 
          />
        </div>
        <div className="w-36">
          <Input 
            type="date" 
            value={startDate} 
            onChange={handleFilterChange(setStartDate)} 
            size="sm" 
            placeholder="开始日期" 
          />
        </div>
        <div className="w-36">
          <Input 
            type="date" 
            value={endDate} 
            onChange={handleFilterChange(setEndDate)} 
            size="sm" 
            placeholder="结束日期" 
          />
        </div>
      </div>

      {/* 日志列表 */}
      <div className="minimal-card overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-neutral-400">加载中...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <svg className="w-12 h-12 mb-3 text-neutral-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">暂无登录记录</span>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {filteredLogs.map((log, index) => {
              const uaInfo = parseUserAgent(log.userAgent);
              return (
                <div key={log.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 20}ms` }}>
                  <div 
                    className="p-4 flex items-center gap-4 hover:bg-neutral-50/50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    {/* 时间 */}
                    <div className="text-xs text-neutral-400 w-32 shrink-0">
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </div>
                    
                    {/* 用户 */}
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <Avatar src={undefined} fallback={log.user.name.charAt(0)} size="xs" />
                      <div className="min-w-0">
                        <span className="text-sm text-neutral-600 truncate block">{log.user.name}</span>
                      </div>
                    </div>
                    
                    {/* 状态 */}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                      log.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {log.success ? '成功' : '失败'}
                    </span>
                    
                    {/* IP */}
                    <span className="text-xs text-neutral-500 w-28 shrink-0 font-mono">
                      {log.ip || '-'}
                    </span>
                    
                    {/* 设备信息摘要 */}
                    <div className="flex items-center gap-2 text-xs text-neutral-400 flex-1 min-w-0">
                      <span className="px-1.5 py-0.5 bg-neutral-100 rounded truncate">{uaInfo.browser}</span>
                      <span className="px-1.5 py-0.5 bg-neutral-100 rounded truncate">{uaInfo.os}</span>
                    </div>
                    
                    {/* 展开箭头 */}
                    <svg 
                      className={`w-4 h-4 text-neutral-400 transition-transform shrink-0 ${expandedId === log.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth="1.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* 展开详情 */}
                  {expandedId === log.id && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-neutral-400 mb-1">邮箱</div>
                          <div className="text-neutral-600 font-mono text-xs">{log.user.email}</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-400 mb-1">浏览器</div>
                          <div className="text-neutral-600">{uaInfo.browser}</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-400 mb-1">操作系统</div>
                          <div className="text-neutral-600">{uaInfo.os}</div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-400 mb-1">设备类型</div>
                          <div className="text-neutral-600">{uaInfo.device}</div>
                        </div>
                        {log.userAgent && (
                          <div className="col-span-2 md:col-span-4">
                            <div className="text-xs text-neutral-400 mb-1">User Agent</div>
                            <div className="text-neutral-500 font-mono text-xs break-all bg-white p-2 rounded border border-neutral-100">
                              {log.userAgent}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* 分页 */}
        <div className="p-4 border-t border-neutral-100 flex justify-between items-center text-sm text-neutral-400">
          <span>第 {page} 页</span>
          <div className="flex gap-2 items-center">
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              disabled={page === 1}
            >
              上一页
            </Button>
            <span className="px-2 text-neutral-500">第 {page} 页</span>
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={() => setPage((p) => p + 1)} 
              disabled={filteredLogs.length < 50}
            >
              下一页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

AdminLoginLog.displayName = 'AdminLoginLog';
