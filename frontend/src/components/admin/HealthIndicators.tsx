import React, { memo } from 'react';

interface HealthIndicatorsProps {
  overdueTasks: number;
  inactiveUsers: number;
  unassignedTasks: number;
  storageSize: number;
  fileCount: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const HealthIndicators: React.FC<HealthIndicatorsProps> = memo(({ overdueTasks, inactiveUsers, unassignedTasks, storageSize, fileCount }) => {
  const indicators = [
    { label: '逾期任务', value: overdueTasks, warn: overdueTasks > 10, danger: overdueTasks > 20 },
    { label: '7日未登录', value: inactiveUsers, warn: false, danger: false },
    { label: '无负责人', value: unassignedTasks, warn: unassignedTasks > 5, danger: unassignedTasks > 15 },
    { label: '存储占用', value: formatBytes(storageSize), sub: `${fileCount} 文件`, warn: false, danger: false },
  ];

  return (
    <div className="minimal-card p-5">
      <h3 className="text-sm font-medium text-neutral-500 mb-4">系统健康</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {indicators.map((ind) => (
          <div key={ind.label} className="text-center">
            <div className={`text-xl font-semibold mb-1 ${ind.danger ? 'text-red-500' : ind.warn ? 'text-amber-500' : 'text-neutral-900'}`}>
              {ind.value}
            </div>
            <div className="text-xs text-neutral-400">{ind.label}</div>
            {ind.sub && <div className="text-[10px] text-neutral-300 mt-0.5">{ind.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
});

HealthIndicators.displayName = 'HealthIndicators';
