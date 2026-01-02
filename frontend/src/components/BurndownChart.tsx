import React, { useState, useEffect, useMemo } from 'react';
import { reportApi, BurndownData } from '../services/api';

interface BurndownChartProps {
  projectId: string;
  startDate: string;
  endDate: string;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({ projectId, startDate, endDate }) => {
  const [data, setData] = useState<BurndownData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: res } = await reportApi.getBurndown(projectId, startDate, endDate);
      setData(res);
    } finally { setLoading(false); }
  };

  const { maxValue, points, idealLine } = useMemo(() => {
    if (data.length === 0) return { maxValue: 10, points: '', idealLine: '' };
    
    const max = Math.max(...data.map(d => d.remaining), 1);
    const width = 600;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const pts = data.map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - (d.remaining / max) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
    
    const idealStart = data[0]?.remaining || 0;
    const ideal = `${padding},${padding + chartHeight - (idealStart / max) * chartHeight} ${padding + chartWidth},${padding + chartHeight}`;
    
    return { maxValue: max, points: pts, idealLine: ideal };
  }, [data]);

  if (loading) return <div className="h-[250px] flex items-center justify-center text-slate-400">加载中...</div>;
  if (data.length === 0) return <div className="h-[250px] flex items-center justify-center text-slate-400">暂无数据</div>;

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">燃尽图</h3>
      <svg viewBox="0 0 600 200" className="w-full">
        <line x1="40" y1="160" x2="560" y2="160" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="40" y1="40" x2="40" y2="160" stroke="#e2e8f0" strokeWidth="1" />
        
        <polyline points={idealLine} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5,5" />
        <polyline points={points} fill="none" stroke="#001C3D" strokeWidth="2" />
        
        {data.map((d, i) => {
          const x = 40 + (i / (data.length - 1 || 1)) * 520;
          const y = 40 + 120 - (d.remaining / maxValue) * 120;
          return <circle key={i} cx={x} cy={y} r="4" fill="#001C3D" />;
        })}
        
        <text x="40" y="175" fontSize="10" fill="#64748b">{data[0]?.date?.split('-').slice(1).join('/')}</text>
        <text x="560" y="175" fontSize="10" fill="#64748b" textAnchor="end">{data[data.length - 1]?.date?.split('-').slice(1).join('/')}</text>
        <text x="30" y="45" fontSize="10" fill="#64748b" textAnchor="end">{maxValue}</text>
        <text x="30" y="165" fontSize="10" fill="#64748b" textAnchor="end">0</text>
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#001C3D]" /> 实际</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-400" style={{ borderTop: '2px dashed' }} /> 理想</span>
      </div>
    </div>
  );
};
