import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, Priority, User } from './types';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { ArchivedTasksModal } from './components/ArchivedTasksModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { LoginModal } from './components/LoginModal';
import { TeamSetup } from './components/TeamSetup';
import { TeamSettings } from './components/TeamSettings';
import { OnboardingGuide } from './components/OnboardingGuide';
import { RiskAlert } from './components/RiskAlert';
import { useDialog } from './components/ConfirmDialog';
import { useAuthStore } from './stores/authStore';
import { useTaskStore } from './stores/taskStore';
import { useTeamStore } from './stores/teamStore';

type SortOption = 'DEFAULT' | 'PRIORITY_DESC' | 'DATE_DESC';

const App: React.FC = () => {
  const { user, checkAuth, logout, updateUser, isInitialized } = useAuthStore();
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

  const handleMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const result = await moveTask(taskId, newStatus);
    if (!result.success && result.error) await alert({ title: '无法移动任务', message: result.error, type: 'warning' });
  }, [moveTask, alert]);

  const handleDelete = useCallback(async (taskId: string) => {
    if (await confirm({ title: '删除任务', message: '确定要删除这个任务吗？此操作不可恢复。', type: 'danger', confirmText: '删除' })) {
      await deleteTask(taskId);
    }
  }, [confirm, deleteTask]);

  const handleArchive = useCallback(async (taskId: string) => {
    if (await confirm({ title: '归档任务', message: '归档后任务将从看板隐藏，可在归档列表中恢复。', type: 'info', confirmText: '归档' })) {
      await archiveTask(taskId);
    }
  }, [confirm, archiveTask]);

  const handleRestore = useCallback(async (taskId: string) => { await restoreTask(taskId); }, [restoreTask]);

  const handleShowArchived = useCallback(() => { fetchArchivedTasks(); setShowArchived(true); }, [fetchArchivedTasks]);

  const handleToggle = useCallback(async (taskId: string, subtaskId: string) => { await toggleSubtask(taskId, subtaskId); }, [toggleSubtask]);

  const handleAssign = useCallback(async (taskId: string, subtaskId: string, assigneeId: string) => { await assignSubtask(taskId, subtaskId, assigneeId); }, [assignSubtask]);

  const handleCreateFromSubtask = useCallback(async (subtaskTitle: string, parentTaskId: string, parentTitle: string, parentDescription: string) => {
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
  }, [createTask, updateTask, tasks]);

  const handleSaveTask = useCallback(async (data: Partial<Task>) => {
    if (editingTask) await updateTask(editingTask.id, data);
    else await createTask(data);
    setIsModalOpen(false);
    setEditingTask(null);
  }, [editingTask, updateTask, createTask]);

  const handleEdit = useCallback((task: Task) => { setEditingTask(task); setIsModalOpen(true); }, []);

  const handleNewTask = useCallback(() => { setEditingTask(null); setIsModalOpen(true); }, []);

  // 加载状态
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 未登录
  if (!user) return <LoginModal />;

  // 未加入团队
  if (!user.currentTeamId) return <TeamSetup onComplete={() => { checkAuth(); }} />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {showOnboarding && <OnboardingGuide onComplete={() => { setShowOnboarding(false); updateUser({ isFirstLogin: false }); }} />}
      
      <Header
        user={user}
        currentTeam={currentTeam}
        members={members}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterAssignee={filterAssignee}
        setFilterAssignee={setFilterAssignee}
        sortOption={sortOption}
        setSortOption={(s) => setSortOption(s as SortOption)}
        onNewTask={handleNewTask}
        onTeamSettings={() => setIsTeamSettingsOpen(true)}
        onLogout={logout}
      />

      <KanbanBoard
        tasks={tasks}
        members={members as User[]}
        sortOption={sortOption}
        searchQuery={searchQuery}
        filterAssignee={filterAssignee}
        onMove={handleMove}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onArchive={handleArchive}
        onToggleSubtask={handleToggle}
        onAssignSubtask={handleAssign}
        onCreateFromSubtask={handleCreateFromSubtask}
        onShowArchived={handleShowArchived}
      />

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSubmit={handleSaveTask}
        teamMembers={members as User[]}
        initialData={editingTask}
        allTasks={tasks}
      />

      <TeamSettings isOpen={isTeamSettingsOpen} onClose={() => setIsTeamSettingsOpen(false)} />

      <RiskAlert tasks={tasks} />

      <ArchivedTasksModal
        isOpen={showArchived}
        onClose={() => setShowArchived(false)}
        archivedTasks={archivedTasks}
        teamMembers={members as User[]}
        onDelete={handleDelete}
        onRestore={handleRestore}
      />
    </div>
  );
};

export default App;
