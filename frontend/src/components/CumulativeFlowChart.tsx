import { memo } from 'react';
import { Card } from './ui';

interface CumulativeFlowData {
  date: string;
  TODO: number;
  IN_PROGRESS: number;
  REVIEW: number;
  DONE: number;
}

interface CumulativeFlowChartProps {
  data: CumulativeFlowData[];
  loading?: boolean;
}

export const CumulativeFlowChart = memo(function CumulativeFlowChart({
  data,
  loading,
}: CumulativeFlowChartProps) {
  if (loading) {
    return (
      <Card className="h-full" padding="md">
        <div className="text-sm font-medium text-slate-700 mb-2">累积流图</div>
        <div className="flex-1 bg-slate-100 animate-pulse rounded min-h-[120px]" />
      </Card>
    );
  }

  // 计算最大值用于缩放
  const maxValue = data.length > 0
    ? Math.max(...data.map((d) => d.TODO + d.IN_PROGRESS + d.REVIEW + d.DONE))
    : 0;

  return (
    <Card className="h-full flex flex-col" padding="md">
      <div className="text-sm font-medium text-slate-700 mb-2">累积流图</div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm min-h-[120px]">
          暂无数据
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-[120px]">
          {/* 简化版累积流图 - 使用堆叠柱状图 */}
          <div className="flex-1 flex items-end gap-1">
            {data.slice(-14).map((item) => { // 只显示最近14天
              const total = item.TODO + item.IN_PROGRESS + item.REVIEW + item.DONE;
              const heightPercent = maxValue > 0 ? (total / maxValue) * 100 : 0;

              return (
                <div
                  key={item.date}
                  className="flex-1 flex flex-col justify-end group relative"
                  title={`${item.date}: 总计 ${total}`}
                >
                  {/* 悬停提示 */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {item.date}: {total}
                  </div>

                  {/* 堆叠柱 */}
                  <div
                    className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse"
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  >
                    <div className="bg-emerald-400" style={{ height: `${(item.DONE / total) * 100}%` }} />
                    <div className="bg-purple-400" style={{ height: `${(item.REVIEW / total) * 100}%` }} />
                    <div className="bg-blue-400" style={{ height: `${(item.IN_PROGRESS / total) * 100}%` }} />
                    <div className="bg-slate-300" style={{ height: `${(item.TODO / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 图例 */}
          <div className="flex justify-center gap-3 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-300" />待处理</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400" />进行中</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-400" />审核中</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" />已完成</span>
          </div>
        </div>
      )}
    </Card>
  );
});
