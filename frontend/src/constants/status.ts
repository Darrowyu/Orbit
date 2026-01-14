export const STATUS_LABELS: Record<string, string> = {
  TODO: '待办', IN_PROGRESS: '进行中', REVIEW: '审核', DONE: '完成',
};

export const STATUS_COLORS_HEX: Record<string, string> = {
  TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', REVIEW: '#f59e0b', DONE: '#22c55e',
};

export const STATUS_BADGE_VARIANTS: Record<string, 'default' | 'primary' | 'warning' | 'success'> = {
  TODO: 'default', IN_PROGRESS: 'primary', REVIEW: 'warning', DONE: 'success',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: '低', MEDIUM: '中', HIGH: '高',
};
