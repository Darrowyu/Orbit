import React from 'react';
import { Task } from '../types';
import { Card, Badge } from './ui';

interface RiskAlertPanelProps {
  overdue: Task[];           // 逾期任务列表
  highPriority: Task[];      // 高优先级未开始任务列表
  blocked: Task[];           // 被阻塞任务列表
  onTaskClick?: (task: Task) => void;  // 任务点击回调
  loading?: boolean;         // 加载状态
}

// 风险预警面板组件 - 显示项目中的风险任务
export const RiskAlertPanel: React.FC<RiskAlertPanelProps> = ({
  overdue,
  highPriority,
  blocked,
  onTaskClick,
  loading,
}) => {
  // 加载状态显示骨架屏
  if (loading) {
    return (
      <Card variant="ghost" className="bg-slate-50 border border-slate-100">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-20 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 rounded w-full animate-pulse" />
            <div className="h-3 bg-slate-200 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }
  // 计算总风险数
  const totalRisks = overdue.length + highPriority.length + blocked.length;

  // 无风险时显示"项目状态良好"
  if (totalRisks === 0) {
    return (
      <Card variant="ghost" className="bg-emerald-50 border border-emerald-100">
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-emerald-800">项目状态良好</p>
            <p className="text-sm text-emerald-600">暂无风险任务</p>
          </div>
        </div>
      </Card>
    );
  }

  // 渲染风险任务列表
  const renderTaskList = (
    tasks: Task[],
    title: string,
    badgeVariant: 'danger' | 'warning' | 'info',
    textColor: string
  ): React.ReactNode => {
    if (tasks.length === 0) return null;

    const displayTasks = tasks.slice(0, 3);     // 最多显示3个任务
    const remainingCount = tasks.length - 3;    // 剩余任务数

    return (
      <div className="mb-4 last:mb-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className={`text-sm font-medium ${textColor}`}>{title}</h4>
          <Badge variant={badgeVariant} size="sm">{tasks.length}</Badge>
        </div>
        <ul className="space-y-1.5">
          {displayTasks.map((task) => (
            <li
              key={task.id}
              className={`text-sm ${textColor} ${onTaskClick ? 'cursor-pointer hover:underline' : ''} truncate`}
              onClick={() => onTaskClick?.(task)}
            >
              {task.title}
            </li>
          ))}
          {remainingCount > 0 && (
            <li className={`text-xs ${textColor} opacity-70`}>
              还有 {remainingCount} 个...
            </li>
          )}
        </ul>
      </div>
    );
  };

  // 有风险时显示风险列表
  return (
    <Card variant="default" className="border-red-100">
      {/* 风险预警标题 + 数量徽章 */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="font-semibold text-slate-900">风险预警</h3>
        <Badge variant="danger" size="sm" dot>{totalRisks}</Badge>
      </div>

      {/* 三个风险区域: 逾期/高优先级/被阻塞 */}
      {renderTaskList(
        overdue,
        '已逾期',
        'danger',
        'text-red-600'
      )}
      {renderTaskList(
        highPriority,
        '高优先级未开始',
        'warning',
        'text-amber-600'
      )}
      {renderTaskList(
        blocked,
        '被阻塞',
        'info',
        'text-purple-600'
      )}
    </Card>
  );
};
