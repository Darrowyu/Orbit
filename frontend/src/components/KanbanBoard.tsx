import React, { memo, useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus, Priority, User } from '../types';
import { TaskCard } from './TaskCard';
import { Badge, IconButton } from './ui';

const COLUMN_ICONS = {
  [TaskStatus.TODO]: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  [TaskStatus.IN_PROGRESS]: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  [TaskStatus.REVIEW]: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  [TaskStatus.DONE]: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const COLUMN_CONFIG = [
  { id: TaskStatus.TODO, title: '待处理', color: 'bg-slate-50/70' },
  { id: TaskStatus.IN_PROGRESS, title: '进行中', color: 'bg-blue-50/70' },
  { id: TaskStatus.REVIEW, title: '审核中', color: 'bg-purple-50/70' },
  { id: TaskStatus.DONE, title: '已完成', color: 'bg-emerald-50/70' },
];

interface KanbanBoardProps {
  tasks: Task[];
  members: User[];
  sortOption: string;
  searchQuery: string;
  filterAssignee: string;
  onMove: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  onArchive: (taskId: string) => Promise<void>;
  onToggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  onAssignSubtask: (taskId: string, subtaskId: string, assigneeId: string) => Promise<void>;
  onCreateFromSubtask: (subtaskTitle: string, parentTaskId: string, parentTitle: string, parentDescription: string) => Promise<void>;
  onShowArchived: () => void;
}

// 依赖连线组件
const DependencyLines = memo(({ tasks, selectedTaskId, isDragging }: { tasks: Task[]; selectedTaskId: string | null; isDragging: boolean }) => {
  const [paths, setPaths] = useState<React.ReactElement[]>([]);
  const rafRef = React.useRef<number>(0);
  const lastCalcRef = React.useRef<number>(0);

  const taskDeps = React.useMemo(() => tasks.filter(t => t.dependsOn?.length).map(t => ({ id: t.id, deps: t.dependsOn })), [tasks]);

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      if (!isDragging && now - lastCalcRef.current < 16) return;
      lastCalcRef.current = now;
      const newPaths: React.ReactElement[] = [];
      const container = document.getElementById('kanban-board-container');
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      taskDeps.forEach(({ id: taskId, deps }) => {
        const endEl = document.getElementById(`task-${taskId}`);
        if (!endEl) return;
        const endRect = endEl.getBoundingClientRect();
        deps.forEach((depId) => {
          const startEl = document.getElementById(`task-${depId}`);
          if (!startEl) return;
          const startRect = startEl.getBoundingClientRect();
          const startX = startRect.right - cRect.left + container.scrollLeft;
          const startY = startRect.top + startRect.height / 2 - cRect.top;
          const endX = endRect.left - cRect.left + container.scrollLeft;
          const endY = endRect.top + endRect.height / 2 - cRect.top;
          let color = '#E2E8F0', strokeWidth = 2, opacity = 0.4, markerId = 'arrow-gray';
          if (selectedTaskId) {
            if (selectedTaskId === taskId) { color = '#F59E0B'; strokeWidth = 3; opacity = 1; markerId = 'arrow-amber'; }
            else if (selectedTaskId === depId) { color = '#A855F7'; strokeWidth = 3; opacity = 1; markerId = 'arrow-purple'; }
            else { opacity = 0.1; }
          }
          const cpX = (startX + endX) / 2;
          newPaths.push(<path key={`${depId}-${taskId}`} d={`M ${startX} ${startY} C ${cpX} ${startY}, ${cpX} ${endY}, ${endX} ${endY}`} stroke={color} strokeWidth={strokeWidth} fill="none" opacity={opacity} markerEnd={`url(#${markerId})`} style={{ transition: isDragging ? 'none' : 'all 0.3s ease' }} />);
        });
      });
      setPaths(newPaths);
    };

    const loop = () => { calc(); if (isDragging) rafRef.current = requestAnimationFrame(loop); };
    calc();
    if (isDragging) rafRef.current = requestAnimationFrame(loop);
    window.addEventListener('resize', calc);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', calc); };
  }, [taskDeps, selectedTaskId, isDragging]);

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ minWidth: '100%', minHeight: '100%' }}>
      <defs>
        <marker id="arrow-gray" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#E2E8F0" /></marker>
        <marker id="arrow-amber" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" /></marker>
        <marker id="arrow-purple" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#A855F7" /></marker>
      </defs>
      {paths}
    </svg>
  );
});
DependencyLines.displayName = 'DependencyLines';

export const KanbanBoard: React.FC<KanbanBoardProps> = memo(({
  tasks, members, sortOption, searchQuery, filterAssignee,
  onMove, onEdit, onDelete, onArchive, onToggleSubtask, onAssignSubtask, onCreateFromSubtask, onShowArchived
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDragEnd = useCallback(async (result: DropResult) => {
    setIsDragging(false);
    const { source, destination } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
    await onMove(result.draggableId, destination.droppableId as TaskStatus);
  }, [onMove]);

  const onDragStart = useCallback(() => setIsDragging(true), []);

  const getSorted = useCallback((list: Task[]) => {
    if (sortOption === 'DEFAULT') return list;
    return [...list].sort((a, b) => {
      if (sortOption === 'PRIORITY_DESC') {
        const w = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
        return w[b.priority] - w[a.priority] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOption === 'DATE_DESC') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });
  }, [sortOption]);

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchAssignee = filterAssignee === 'ALL' || t.assigneeId === filterAssignee;
    return matchSearch && matchAssignee;
  });

  const getRelation = useCallback((taskId: string) => {
    if (!selectedTaskId || taskId === selectedTaskId) return 'none';
    const sel = tasks.find((t) => t.id === selectedTaskId);
    if (sel?.dependsOn?.includes(taskId)) return 'dependency';
    const cur = tasks.find((t) => t.id === taskId);
    if (cur?.dependsOn?.includes(selectedTaskId)) return 'dependent';
    return 'none';
  }, [selectedTaskId, tasks]);

  return (
    <main className={`flex-1 overflow-x-auto overflow-y-hidden relative ${isDragging ? 'select-none' : ''}`} id="kanban-board-container" onClick={() => setSelectedTaskId(null)}>
      <DependencyLines tasks={tasks} selectedTaskId={selectedTaskId} isDragging={isDragging} />
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        <div className="h-full flex px-4 sm:px-6 lg:px-8 py-8 gap-6 min-w-max">
          {COLUMN_CONFIG.map((col) => {
            const colTasks = getSorted(filtered.filter((t) => t.status === col.id));
            return (
              <div key={col.id} className="w-80 flex-shrink-0 flex flex-col">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{COLUMN_ICONS[col.id]}</span>
                    <h2 className="font-bold text-slate-700">{col.title}</h2>
                    <Badge variant="default" size="sm">{colTasks.length}</Badge>
                  </div>
                  {col.id === TaskStatus.DONE && (
                    <button onClick={onShowArchived} className="text-xs text-slate-400 hover:text-[#001C3D] flex items-center gap-1 transition-colors" title="查看归档">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>归档
                    </button>
                  )}
                </div>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className={`flex-1 rounded-2xl p-3 transition-all duration-200 ${snapshot.isDraggingOver ? 'bg-[#001C3D]/5 ring-2 ring-[#001C3D]/20 ring-inset' : col.color}`} style={{ minHeight: '150px' }}>
                      <div className="flex flex-col gap-3">
                        {colTasks.map((task, idx) => (
                          <Draggable key={task.id} draggableId={task.id} index={idx} isDragDisabled={sortOption !== 'DEFAULT'}>
                            {(prov, snap) => (
                              <TaskCard
                                task={task}
                                onMove={onMove}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onArchive={onArchive}
                                onToggleSubtask={onToggleSubtask}
                                onAssignSubtask={onAssignSubtask}
                                onCreateFromSubtask={onCreateFromSubtask}
                                onSelect={setSelectedTaskId}
                                isSelected={selectedTaskId === task.id}
                                dependencyType={getRelation(task.id)}
                                isDragging={snap.isDragging}
                                teamMembers={members}
                                innerRef={prov.innerRef}
                                draggableProps={prov.draggableProps}
                                dragHandleProps={prov.dragHandleProps}
                                style={prov.draggableProps.style}
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </main>
  );
});

KanbanBoard.displayName = 'KanbanBoard';
export default KanbanBoard;
