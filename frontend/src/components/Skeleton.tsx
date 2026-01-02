import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rectangular' | 'circular';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'text', width, height, animation = 'pulse' }) => {
    const baseClass = 'bg-gray-200';
    const animationClass = animation === 'pulse' ? 'animate-pulse' : animation === 'wave' ? 'animate-shimmer' : '';
    const variantClass = variant === 'circular' ? 'rounded-full' : variant === 'rectangular' ? 'rounded-lg' : 'rounded';
    const style: React.CSSProperties = { width: width || (variant === 'text' ? '100%' : undefined), height: height || (variant === 'text' ? '1em' : undefined) };
    return <div className={`${baseClass} ${animationClass} ${variantClass} ${className}`} style={style} />;
};

export const TaskCardSkeleton: React.FC = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 animate-pulse">
        <div className="flex justify-between items-start">
            <Skeleton variant="rectangular" width={40} height={20} animation="none" />
            <div className="flex gap-1">
                <Skeleton variant="circular" width={24} height={24} animation="none" />
                <Skeleton variant="circular" width={24} height={24} animation="none" />
            </div>
        </div>
        <div className="space-y-2">
            <Skeleton variant="text" height={18} animation="none" />
            <Skeleton variant="text" width="75%" height={12} animation="none" />
        </div>
        <div className="space-y-1">
            <Skeleton variant="rectangular" height={6} animation="none" />
            {[1, 2].map((n) => (
                <div key={`subtask-skeleton-${n}`} className="flex items-center gap-2">
                    <Skeleton variant="rectangular" width={14} height={14} animation="none" />
                    <Skeleton variant="text" width="60%" height={12} animation="none" />
                </div>
            ))}
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
            <div className="flex items-center gap-2">
                <Skeleton variant="circular" width={24} height={24} animation="none" />
                <Skeleton variant="text" width={40} height={10} animation="none" />
            </div>
        </div>
    </div>
);

export const KanbanColumnSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center gap-2 mb-4 px-1">
            <Skeleton variant="text" width={60} height={20} />
            <Skeleton variant="circular" width={24} height={20} />
        </div>
        <div className="flex-1 rounded-xl p-2 bg-gray-100/50 space-y-3">
            {Array.from({ length: count }).map((_, i) => <TaskCardSkeleton key={`task-skeleton-${i}`} />)}
        </div>
    </div>
);

export default Skeleton;
