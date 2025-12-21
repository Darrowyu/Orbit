import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus, Priority, User, TeamMember } from './types';
import { TaskCard } from './components/TaskCard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { LoginModal } from './components/LoginModal';
import { TeamSetup } from './components/TeamSetup';
import { TeamSettings } from './components/TeamSettings';
import { OnboardingGuide } from './components/OnboardingGuide';
import { NotificationBell } from './components/NotificationBell';
import { RiskAlert } from './components/RiskAlert';
import { useDialog } from './components/ConfirmDialog';
import { Button } from './components/Button';
import { useAuthStore } from './stores/authStore';
import { useTaskStore } from './stores/taskStore';
import { useTeamStore } from './stores/teamStore';


const COLUMN_CONFIG = [
  { id: TaskStatus.TODO, title: '待处理', color: 'bg-slate-50 border-slate-200' },
  { id: TaskStatus.IN_PROGRESS, title: '进行中', color: 'bg-blue-50 border-blue-100' },
  { id: TaskStatus.REVIEW, title: '审核中', color: 'bg-purple-50 border-purple-100' },
  { id: TaskStatus.DONE, title: '已完成', color: 'bg-green-50 border-green-100' },
];

type SortOption = 'DEFAULT' | 'PRIORITY_DESC' | 'DATE_DESC';

const DependencyLines = React.memo(({ tasks, selectedTaskId, isDragging }: { tasks: Task[]; selectedTaskId: string | null; isDragging: boolean }) => {
  const [paths, setPaths] = useState<React.ReactElement[]>([]);
  const rafRef = React.useRef<number>(0);
  const lastCalcRef = React.useRef<number>(0);

  const taskDeps = React.useMemo(() => { // 预计算依赖关系
    return tasks.filter(t => t.dependsOn?.length).map(t => ({ id: t.id, deps: t.dependsOn }));
  }, [tasks]);

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      if (!isDragging && now - lastCalcRef.current < 16) return; // 非拖拽时节流
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

const App: React.FC = () => {
  const { user, checkAuth, logout, updateUser, isInitialized } = useAuthStore();
  const navigate = useNavigate();
  const { tasks, archivedTasks, fetchTasks, fetchArchivedTasks, createTask, updateTask, deleteTask, moveTask, toggleSubtask, assignSubtask, archiveTask, restoreTask } = useTaskStore();
  const { currentTeam, members, fetchTeams, fetchMembers } = useTeamStore();
  const { confirm, alert } = useDialog();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('DEFAULT');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (user?.currentTeamId) {
      fetchTeams();
      fetchMembers();
      fetchTasks();
      if (user.isFirstLogin) setShowOnboarding(true);
    }
  }, [user?.currentTeamId, fetchTeams, fetchMembers, fetchTasks, user?.isFirstLogin]);

  const handleMove = useCallback(async (taskId: string, newStatus: TaskStatus) => { const result = await moveTask(taskId, newStatus); if (!result.success && result.error) await alert({ title: '无法移动任务', message: result.error, type: 'warning' }); }, [moveTask, alert]);
  const handleDelete = useCallback(async (taskId: string) => { if (await confirm({ title: '删除任务', message: '确定要删除这个任务吗？此操作不可恢复。', type: 'danger', confirmText: '删除' })) await deleteTask(taskId); }, [confirm, deleteTask]);
  const handleArchive = useCallback(async (taskId: string) => { if (await confirm({ title: '归档任务', message: '归档后任务将从看板隐藏，可在归档列表中恢复。', type: 'info', confirmText: '归档' })) await archiveTask(taskId); }, [confirm, archiveTask]);
  const handleRestore = useCallback(async (taskId: string) => { await restoreTask(taskId); }, [restoreTask]);
  const handleShowArchived = useCallback(() => { fetchArchivedTasks(); setShowArchived(true); }, [fetchArchivedTasks]);
  const handleToggle = useCallback(async (taskId: string, subtaskId: string) => { await toggleSubtask(taskId, subtaskId); }, [toggleSubtask]);
  const handleAssign = useCallback(async (taskId: string, subtaskId: string, assigneeId: string) => { await assignSubtask(taskId, subtaskId, assigneeId); }, [assignSubtask]);

  if (!isInitialized) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <LoginModal />;
  if (!user.currentTeamId) return <TeamSetup onComplete={() => { checkAuth(); }} />;

  const handleSaveTask = async (data: Partial<Task>) => {
    if (editingTask) await updateTask(editingTask.id, data);
    else await createTask(data);
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleCreateFromSubtask = async (subtaskTitle: string, parentTaskId: string, parentTitle: string, parentDescription: string) => {
    const { aiApi } = await import('./services/api');
    const { data: aiResult } = await aiApi.generate(subtaskTitle);
    const newTask = await createTask({
      title: `[${parentTitle}] ${subtaskTitle}`,
      description: aiResult.description || `细分自父任务: ${parentDescription}`,
      priority: (aiResult.priority as Priority) || Priority.MEDIUM,
      status: TaskStatus.TODO,
      subtasks: aiResult.subtasks?.map((t: string) => ({ id: Math.random().toString(36).slice(2, 11), title: t, completed: false })) || [],
      dependsOn: [],
    });
    const parentTask = tasks.find((t) => t.id === parentTaskId);
    if (parentTask) await updateTask(parentTaskId, { dependsOn: [...(parentTask.dependsOn || []), newTask.id] });
  };

  const onDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    const { source, destination } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
    const destStatus = destination.droppableId as TaskStatus;
    await moveTask(result.draggableId, destStatus);
  };
  const onDragStart = () => setIsDragging(true);

  const getSorted = (list: Task[]) => {
    if (sortOption === 'DEFAULT') return list;
    return [...list].sort((a, b) => {
      if (sortOption === 'PRIORITY_DESC') { const w = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 }; return w[b.priority] - w[a.priority] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); }
      if (sortOption === 'DATE_DESC') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });
  };

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchAssignee = filterAssignee === 'ALL' || t.assigneeId === filterAssignee;
    return matchSearch && matchAssignee;
  });

  const getRelation = (taskId: string) => {
    if (!selectedTaskId || taskId === selectedTaskId) return 'none';
    const sel = tasks.find((t) => t.id === selectedTaskId);
    if (sel?.dependsOn?.includes(taskId)) return 'dependency';
    const cur = tasks.find((t) => t.id === taskId);
    if (cur?.dependsOn?.includes(selectedTaskId)) return 'dependent';
    return 'none';
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 text-slate-900 ${isDragging ? 'select-none' : ''}`} onClick={() => setSelectedTaskId(null)}>
      {showOnboarding && <OnboardingGuide onComplete={() => { setShowOnboarding(false); updateUser({ isFirstLogin: false }); }} />}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/Orbit_Logo.png" alt="Orbit" className="w-9 h-9 rounded-xl shadow-lg shadow-indigo-200" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-indigo-800 tracking-tight">Orbit</h1>
            {currentTeam && <button onClick={() => setIsTeamSettingsOpen(true)} className="ml-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 flex items-center gap-1 transition-colors"><span>{currentTeam.name}</span><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></button>}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative hidden lg:block"><input type="text" placeholder="搜索任务..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48 xl:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 transition-all" /><svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="appearance-none bg-slate-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 pl-3 pr-8 py-2 cursor-pointer min-w-[120px]"><option value="ALL">所有成员</option>{members.map((m: TeamMember) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="appearance-none bg-slate-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 pl-3 pr-8 py-2 cursor-pointer hidden sm:block min-w-[120px]"><option value="DEFAULT">默认排序</option><option value="PRIORITY_DESC">优先级 (高→低)</option><option value="DATE_DESC">创建时间 (新→旧)</option></select>
            <Button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}><span className="hidden sm:inline">新建任务</span><span className="sm:hidden">新建</span></Button>
            <div className="flex items-center gap-2 border-l pl-4 ml-2">
              <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="仪表盘"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg></button>
              <NotificationBell />
              {user.isSuperAdmin && <button onClick={() => navigate('/admin')} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="管理后台"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>}
              <button onClick={() => navigate('/profile')} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm hover:ring-2 hover:ring-indigo-300 transition-all cursor-pointer overflow-hidden ${user.avatar?.startsWith('/uploads') ? 'bg-gray-100' : user.color}`} title="个人设置">
                {user.avatar?.startsWith('/uploads') ? <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${user.avatar}`} alt="avatar" className="w-full h-full object-cover" /> : user.avatar}
              </button>
              <button onClick={logout} className="text-gray-400 hover:text-gray-600 p-1" title="退出登录"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-x-auto overflow-y-hidden relative" id="kanban-board-container">
        <DependencyLines tasks={tasks} selectedTaskId={selectedTaskId} isDragging={isDragging} />
        <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
          <div className="h-full flex px-4 sm:px-6 lg:px-8 py-8 gap-6 min-w-max">
            {COLUMN_CONFIG.map((col) => {
              const colTasks = getSorted(filtered.filter((t) => t.status === col.id));
              return (
                <div key={col.id} className="w-80 flex-shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2"><h2 className="font-bold text-gray-700">{col.title}</h2><span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{colTasks.length}</span></div>
                    {col.id === TaskStatus.DONE && <button onClick={handleShowArchived} className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1" title="查看归档"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>归档</button>}
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className={`flex-1 rounded-xl p-2 transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-indigo-50/50 ring-2 ring-indigo-100 ring-inset' : 'bg-gray-100/50'} ${col.color.split(' ')[0]} bg-opacity-30`} style={{ minHeight: '150px' }}>
                        <div className="flex flex-col gap-3">
                          {colTasks.map((task, idx) => (
                            <Draggable key={task.id} draggableId={task.id} index={idx} isDragDisabled={sortOption !== 'DEFAULT'}>
                              {(prov, snap) => <TaskCard task={task} onMove={handleMove} onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }} onDelete={handleDelete} onArchive={handleArchive} onToggleSubtask={handleToggle} onAssignSubtask={handleAssign} onCreateFromSubtask={handleCreateFromSubtask} onSelect={setSelectedTaskId} isSelected={selectedTaskId === task.id} dependencyType={getRelation(task.id)} isDragging={snap.isDragging} teamMembers={members as User[]} innerRef={prov.innerRef} draggableProps={prov.draggableProps} dragHandleProps={prov.dragHandleProps} style={prov.draggableProps.style} />}
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
      <CreateTaskModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTask(null); }} onSubmit={handleSaveTask} teamMembers={members as User[]} initialData={editingTask} allTasks={tasks} />
      <TeamSettings isOpen={isTeamSettingsOpen} onClose={() => setIsTeamSettingsOpen(false)} />
      <RiskAlert tasks={tasks} />
      {showArchived && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowArchived(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                <h2 className="text-lg font-bold text-gray-900">已归档任务</h2>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{archivedTasks.length}</span>
              </div>
              <button onClick={() => setShowArchived(false)} className="text-gray-400 hover:text-gray-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {archivedTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无归档任务</div>
              ) : (
                <div className="space-y-3">
                  {archivedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onMove={() => { }} onEdit={() => { }} onDelete={handleDelete} onRestore={handleRestore} onToggleSubtask={() => { }} onAssignSubtask={() => { }} onCreateFromSubtask={async () => { }} teamMembers={members as User[]} isArchiveView />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
