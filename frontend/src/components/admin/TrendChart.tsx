import React, { memo } from 'react';

interface TrendChartProps {
  title: string;
  data: number[];
  dates: string[];
  color?: string;
}

export const TrendChart: React.FC<TrendChartProps> = memo(({ title, data, dates, color = '#6366f1' }) => {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({ x: (i / (data.length - 1 || 1)) * 100, y: 100 - (v / max) * 100 }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className="minimal-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-neutral-600">{title}</span>
        <span className="text-lg font-semibold text-neutral-900">{data[data.length - 1] || 0}</span>
      </div>
      <div className="h-16 relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={`grad-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#grad-${title})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-neutral-400">
        <span>{dates[0]?.slice(5)}</span>
        <span>{dates[dates.length - 1]?.slice(5)}</span>
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';
