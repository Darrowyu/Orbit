import { memo } from 'react';
import { Card } from './ui';

interface SimpleBurndownChartProps {
    data: { date: string; remaining: number; completed: number }[];
    loading?: boolean;
}

// 简化版燃尽图组件 - 接受 data prop
export const SimpleBurndownChart = memo(function SimpleBurndownChart({ data, loading }: SimpleBurndownChartProps) {
    if (loading) {
        return (
            <Card className="h-full" padding="md">
                <div className="text-sm font-medium text-slate-700 mb-2">燃尽图</div>
                <div className="flex-1 bg-slate-100 animate-pulse rounded min-h-[120px]" />
            </Card>
        );
    }

    // 计算SVG路径点
    const calculatePoints = () => {
        if (data.length === 0) return { actualPoints: '', idealPoints: '' };

        const maxRemaining = Math.max(...data.map(d => d.remaining), 1);
        const width = 100; // 百分比宽度
        const height = 100; // 百分比高度
        const padding = 10;

        const actualPoints = data.map((d, i) => {
            const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
            const y = padding + (height - padding * 2) - (d.remaining / maxRemaining) * (height - padding * 2);
            return `${x},${y}`;
        }).join(' ');

        // 理想线：从第一个remaining到0
        const idealStart = data[0]?.remaining || 0;
        const idealPoints = `${padding},${padding + (height - padding * 2) - (idealStart / maxRemaining) * (height - padding * 2)} ${width - padding},${height - padding}`;

        return { actualPoints, idealPoints, maxRemaining };
    };

    const { actualPoints, idealPoints } = calculatePoints();

    return (
        <Card className="h-full flex flex-col" padding="md">
            <div className="text-sm font-medium text-slate-700 mb-2">燃尽图</div>

            {data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm min-h-[120px]">
                    暂无数据
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-[120px]">
                    <svg viewBox="0 0 100 100" className="w-full flex-1" preserveAspectRatio="none">
                        {/* 网格线 */}
                        <line x1="10" y1="90" x2="90" y2="90" stroke="#e2e8f0" strokeWidth="0.5" />
                        <line x1="10" y1="10" x2="10" y2="90" stroke="#e2e8f0" strokeWidth="0.5" />

                        {/* 理想线 */}
                        <polyline points={idealPoints} fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />

                        {/* 实际线 */}
                        <polyline points={actualPoints} fill="none" stroke="#001C3D" strokeWidth="1.5" />

                        {/* 数据点 */}
                        {data.map((d, i) => {
                            const x = 10 + (i / (data.length - 1 || 1)) * 80;
                            const y = 10 + 80 - (d.remaining / maxRemaining) * 80;
                            return <circle key={i} cx={x} cy={y} r="1.5" fill="#001C3D" />;
                        })}
                    </svg>

                    {/* 图例 */}
                    <div className="flex justify-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#001C3D]" /> 实际</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-400" style={{ borderTop: '1px dashed' }} /> 理想</span>
                    </div>
                </div>
            )}
        </Card>
    );
});
