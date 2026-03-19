import { memo, useEffect, useState } from 'react';
import { Card, Avatar } from './ui';
import { reportApi } from '../services/api';

interface TeamWorkload {
  user: { id: string; name: string; avatar: string; color: string };
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

interface TeamWorkloadChartProps {
  data?: TeamWorkload[];
  loading?: boolean;
}

function TeamWorkloadChartContent({
  data,
  loading,
}: {
  data: TeamWorkload[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <>
        <div className="text-sm font-medium text-slate-700 mb-2">团队负载</div>
        <div className="flex-1 bg-slate-100 animate-pulse rounded min-h-[120px]" />
      </>
    );
  }

  // 按总任务数排序
  const sortedData = [...data].sort((a, b) => b.total - a.total);

  return (
    <>
      <div className="text-sm font-medium text-slate-700 mb-2">团队负载</div>

      {sortedData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm min-h-[120px]">
          暂无数据
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto min-h-[120px]">
          {sortedData.map((item) => {
            const inProgress = item.byStatus.IN_PROGRESS || 0;
            const review = item.byStatus.REVIEW || 0;
            const todo = item.byStatus.TODO || 0;
            const done = item.byStatus.DONE || 0;
            const active = inProgress + review;

            return (
              <div key={item.user.id} className="flex items-center gap-2">
                <Avatar
                  name={item.user.name}
                  src={item.user.avatar?.startsWith('http') ? item.user.avatar : undefined}
                  size="xs"
                  color={item.user.color}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-slate-700 truncate">{item.user.name}</span>
                    <span className="text-slate-500">{item.total} 任务</span>
                  </div>
                  {/* 进度条 */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    {item.total > 0 && (
                      <>
                        <div
                          className="bg-blue-400 h-full"
                          style={{ width: `${(inProgress / item.total) * 100}%` }}
                          title={`进行中: ${inProgress}`}
                        />
                        <div
                          className="bg-purple-400 h-full"
                          style={{ width: `${(review / item.total) * 100}%` }}
                          title={`审核中: ${review}`}
                        />
                        <div
                          className="bg-slate-300 h-full"
                          style={{ width: `${(todo / item.total) * 100}%` }}
                          title={`待处理: ${todo}`}
                        />
                        <div
                          className="bg-emerald-400 h-full"
                          style={{ width: `${(done / item.total) * 100}%` }}
                          title={`已完成: ${done}`}
                        />
                      </>
                    )}
                  </div>
                  {active > 3 && (
                    <div className="text-xs text-amber-600 mt-0.5">负载较高 ({active} 进行中)</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export const TeamWorkloadChart = memo(function TeamWorkloadChart({
  data: propData,
  loading: propLoading,
}: TeamWorkloadChartProps) {
  const [fetchedData, setFetchedData] = useState<TeamWorkload[]>([]);
  const [fetchedLoading, setFetchedLoading] = useState(false);

  // 如果没有提供 data，则自己获取
  useEffect(() => {
    if (propData !== undefined) return; // 提供了 data，不需要获取

    let cancelled = false;
    const loadData = async () => {
      setFetchedLoading(true);
      try {
        const { data } = await reportApi.getTeamWorkload();
        if (!cancelled) setFetchedData(data);
      } finally {
        if (!cancelled) setFetchedLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [propData]);

  // 使用传入的 data 或自己获取的 data
  const data = propData !== undefined ? propData : fetchedData;
  const loading = propData !== undefined ? propLoading : fetchedLoading;

  return (
    <Card className="h-full flex flex-col" padding="md">
      <TeamWorkloadChartContent data={data} loading={loading} />
    </Card>
  );
});
