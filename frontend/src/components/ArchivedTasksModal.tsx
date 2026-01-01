import React, { memo } from 'react';
import { Task, User } from '../types';
import { TaskCard } from './TaskCard';
import { IconButton } from './ui';

interface ArchivedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedTasks: Task[];
  teamMembers: User[];
  onDelete: (taskId: string) => Promise<void>;
  onRestore: (taskId: string) => Promise<void>;
}

export const ArchivedTasksModal: React.FC<ArchivedTasksModalProps> = memo(({
  isOpen, onClose, archivedTasks, teamMembers, onDelete, onRestore
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h2 className="text-lg font-bold text-gray-900">已归档任务</h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{archivedTasks.length}</span>
          </div>
          <IconButton variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {archivedTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">暂无归档任务</div>
          ) : (
            <div className="space-y-3">
              {archivedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMove={() => {}}
                  onEdit={() => {}}
                  onDelete={onDelete}
                  onRestore={onRestore}
                  onToggleSubtask={() => {}}
                  onAssignSubtask={() => {}}
                  onCreateFromSubtask={async () => {}}
                  teamMembers={teamMembers}
                  isArchiveView
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ArchivedTasksModal.displayName = 'ArchivedTasksModal';
export default ArchivedTasksModal;
