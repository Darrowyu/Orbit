import React from 'react';
import { ProjectActivity } from '../types';
import { Card, Avatar } from './ui';

interface ProjectActivityFeedProps {
  activities: ProjectActivity[];
  loading?: boolean;
}

type ActionType = `${ProjectActivity['action']}:${ProjectActivity['entityType']}`;

const actionTextMap: Record<string, string> = {
  'CREATE:TASK': '创建了任务',
  'UPDATE:TASK': '更新了任务',
  'DELETE:TASK': '删除了任务',
  'ARCHIVE:TASK': '归档了任务',
  'RESTORE:TASK': '恢复了任务',
  'ASSIGN:TASK': '指派了任务',
  'CREATE:PROJECT': '创建了项目',
  'UPDATE:PROJECT': '更新了项目',
  'DELETE:PROJECT': '删除了项目',
  'ARCHIVE:PROJECT': '归档了项目',
  'RESTORE:PROJECT': '恢复了项目',
  'ASSIGN:PROJECT': '指派了项目',
  'CREATE:SUBTASK': '创建了子任务',
  'UPDATE:SUBTASK': '更新了子任务',
  'DELETE:SUBTASK': '删除了子任务',
  'ARCHIVE:SUBTASK': '归档了子任务',
  'RESTORE:SUBTASK': '恢复了子任务',
  'ASSIGN:SUBTASK': '指派了子任务',
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN');
}

function getActionText(action: ProjectActivity['action'], entityType: ProjectActivity['entityType']): string {
  const key: ActionType = `${action}:${entityType}`;
  return actionTextMap[key] || '操作了';
}

const ActivitySkeleton: React.FC = () => (
  <div className="flex items-start gap-3 p-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" /> {/* 头像骨架 */}
    <div className="flex-1 min-w-0">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" /> {/* 文本骨架 */}
      <div className="h-3 bg-slate-200 rounded w-1/4" /> {/* 时间骨架 */}
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
    <svg
      className="w-12 h-12 mb-3 text-slate-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span className="text-sm">暂无活动记录</span>
  </div>
);

const ActivityItem: React.FC<{ activity: ProjectActivity }> = ({ activity }) => {
  const actionText = getActionText(activity.action, activity.entityType);
  const timeAgo = formatTimeAgo(activity.createdAt);

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
      <Avatar
        src={activity.user.avatar}
        name={activity.user.name}
        size="sm"
        color={activity.user.color}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-relaxed">
          <span className="font-medium text-slate-900">{activity.user.name}</span>
          <span className="mx-1">{actionText}</span>
          {activity.entityName && (
            <span className="font-medium text-slate-900 truncate">{activity.entityName}</span>
          )}
        </p>
        <p className="text-xs text-slate-400 mt-1">{timeAgo}</p>
      </div>
    </div>
  );
};

export const ProjectActivityFeed: React.FC<ProjectActivityFeedProps> = ({
  activities,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card variant="ghost" padding="sm" className="max-h-[320px] overflow-hidden">
        <div className="space-y-1">
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card variant="ghost" padding="sm">
        <EmptyState />
      </Card>
    );
  }

  return (
    <Card variant="ghost" padding="sm" className="max-h-[320px] overflow-y-auto">
      <div className="space-y-1">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </Card>
  );
};
