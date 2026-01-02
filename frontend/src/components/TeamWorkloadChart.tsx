import React, { useState, useEffect } from 'react';
import { reportApi, TeamWorkload } from '../services/api';
import { Avatar } from './ui/Avatar';

export const TeamWorkloadChart: React.FC = () => {
  const [data, setData] = useState<TeamWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: res } = await reportApi.getTeamWorkload();
      setData(res);
    } finally { setLoading(false); }
  };

  if (loading) return <div className="h-[200px] flex items-center justify-center text-slate-400">加载中...</div>;
  if (data.length === 0) return <div className="h-[200px] flex items-center justify-center text-slate-400">暂无数据</div>;

  const maxTotal = Math.max(...data.map(d => d.total), 1);
  const statusColors = { TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', REVIEW: '#f59e0b', DONE: '#22c55e' };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">团队工作量</h3>
      <div className="space-y-3">
        {data.map(w => (
          <div key={w.user.id} className="flex items-center gap-3">
            <Avatar src={w.user.avatar} fallback={w.user.avatar} size="sm" color={w.user.color} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 truncate">{w.user.name}</span>
                <span className="text-xs text-slate-500">{w.total} 任务</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                {Object.entries(w.byStatus).map(([status, count]) => {
                  if (count === 0) return null;
                  const width = (count / w.total) * 100;
                  return (
                    <div key={status} style={{ width: `${width}%`, backgroundColor: statusColors[status as keyof typeof statusColors] }} title={`${status}: ${count}`} />
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 mt-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> 待办</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> 进行中</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 审核</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 完成</span>
      </div>
    </div>
  );
};
