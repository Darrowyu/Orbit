import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, TaskStatus, Priority, User, Project } from './types';
import { SlimHeader, IconRail, MainContent } from './components/layout';
import { FilterBar } from './components/FilterBar';
import { KanbanBoard } from './components/KanbanBoard';
import { ArchivedTasksModal } from './components/ArchivedTasksModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { LoginModal } from './components/LoginModal';
import { TeamSetup } from './components/TeamSetup';
import { TeamSettings } from './components/TeamSettings';
import { OnboardingGuide } from './components/OnboardingGuide';
import { useOnboardingStore } from './stores/onboardingStore';
import { RiskAlert } from './components/RiskAlert';
import { useDialog } from './components/ConfirmDialog';
import { useAuthStore } from './stores/authStore';
import { useTaskStore } from './stores/taskStore';
import { useTeamStore } from './stores/teamStore';
import { useProjectStore } from './stores/projectStore';
import { ProjectDashboard } from './components/ProjectDashboard';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProjectMemberModal } from './components/ProjectMemberModal';
import { CalendarView } from './components/CalendarView';
import { GanttChart } from './components/GanttChart';

type SortOption = 'DEFAULT' | 'PRIORITY_DESC' | 'DATE_DESC';
type ViewMode = 'kanban' | 'calendar' | 'gantt';

const App: React.FC = () => {
  const { user, checkAuth, logout, updateUser, isInitialized } = useAuthStore();
  const { tasks, archivedTasks, fetchTasks, fetchArchivedTasks, createTask, updateTask, deleteTask, moveTask, toggleSubtask, assignSubtask, archiveTask, restoreTask } = useTaskStore();
  const { members, currentTeam, fetchTeams, fetchMembers } = useTeamStore();
  const { projects, currentProject, fetchProjects, fetchArchivedProjects, setCurrentProject, createProject, updateProject, archiveProject, restoreProject, deleteProject, addMember, updateMember, removeMember } = useProjectStore();
  const { isRunning: showOnboardingTour } = useOnboardingStore();
  const { confirm, alert } = useDialog();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('DEFAULT');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [showProjectDashboard, setShowProjectDashboard] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (user?.currentTeamId) {
      fetchTeams();
      fetchMembers();
      fetchTasks();
      fetchProjects();
      fetchArchivedProjects();
      if (user.isFirstLogin) setShowOnboarding(true);
    }
  }, [user?.currentTeamId, fetchTeams, fetchMembers, fetchTasks, fetchProjects, fetchArchivedProjects, user?.isFirstLogin]);

  const filteredTasks = useMemo(() => {
    if (!currentProject) return tasks;
    return tasks.filter(t => t.projectId === currentProject.id);
  }, [tasks, currentProject]);

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
    const parentTask = tasks.find((t) => t.id === parentTaskId);
    const newTask = await createTask({
      title: `[${parentTitle}] ${subtaskTitle}`,
      description: aiResult.description || `细分自父任务: ${parentDescription}`,
      priority: (aiResult.priority as Priority) || Priority.MEDIUM,
      status: TaskStatus.TODO,
      subtasks: aiResult.subtasks?.map((t: string) => ({ id: Math.random().toString(36).slice(2, 11), title: t, completed: false })) || [],
      dependsOn: [],
      projectId: parentTask?.projectId,
    });
    if (parentTask) await updateTask(parentTaskId, { dependsOn: [...(parentTask.dependsOn || []), newTask.id] });
  }, [createTask, updateTask, tasks]);

  const handleSaveTask = useCallback(async (data: Partial<Task>) => {
    try {
      if (editingTask) await updateTask(editingTask.id, data);
      else await createTask(data);
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      const { getErrorMessage } = await import('./utils/error');
      await alert({ title: '保存失败', message: getErrorMessage(err), type: 'danger' });
    }
  }, [editingTask, updateTask, createTask, alert]);

  const handleEdit = useCallback((task: Task) => { setEditingTask(task); setIsModalOpen(true); }, []);

  const handleNewTask = useCallback(() => { setEditingTask(null); setIsModalOpen(true); }, []);

  const handleCreateProject = useCallback(() => { setEditingProject(null); setIsProjectModalOpen(true); }, []);

  const handleEditProject = useCallback((project: Project) => { setEditingProject(project); setIsProjectModalOpen(true); }, []);

  const handleSaveProject = useCallback(async (data: { name: string; description?: string; color?: string; startDate?: string; endDate?: string }) => {
    if (editingProject) {
      await updateProject(editingProject.id, data);
    } else {
      const project = await createProject(data);
      setCurrentProject(project);
    }
  }, [editingProject, createProject, updateProject, setCurrentProject]);

  // 保留项目操作函数供后续使用
  void archiveProject; void restoreProject; void deleteProject;

  const handleSelectProject = useCallback((project: Project | null) => {
    setCurrentProject(project);
    setShowProjectDashboard(false);
  }, [setCurrentProject]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-8 h-8 border-4 border-[#001C3D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginModal />;

  if (!user.currentTeamId) return <TeamSetup onComplete={() => { checkAuth(); }} />;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-slate-900">
      {(showOnboarding || showOnboardingTour) && <OnboardingGuide onComplete={() => { setShowOnboarding(false); updateUser({ isFirstLogin: false }); }} />}

      <SlimHeader
        user={user}
        currentProject={currentProject}
        projects={projects}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSelectProject={handleSelectProject}
        onLogout={logout}
      />

      <div className="flex-1 flex overflow-hidden">
        <IconRail
          projects={projects}
          currentProject={currentProject}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onSettings={() => setIsTeamSettingsOpen(true)}
        />

        <MainContent>
          {currentProject && showProjectDashboard ? (
            <div className="h-full overflow-y-auto p-8">
              <ProjectDashboard
                project={currentProject}
                teamMembers={members}
                onEditProject={() => handleEditProject(currentProject)}
                onManageMembers={() => setIsMemberModalOpen(true)}
                onTaskClick={handleEdit}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* 顶部工具栏 - 视图切换 */}
              <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentProject ? (
                    <>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentProject.color }} />
                      <h2 className="font-semibold text-slate-800">{currentProject.name}</h2>
                      <span className="text-sm text-slate-500">({filteredTasks.length} 任务)</span>
                    </>
                  ) : (
                    <>
                      <h2 className="font-semibold text-slate-800">所有任务</h2>
                      <span className="text-sm text-slate-500">({filteredTasks.length} 任务)</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 视图切换 */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button onClick={() => setViewMode('kanban')} className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white text-[#001C3D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>看板</button>
                    <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white text-[#001C3D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>日历</button>
                    <button onClick={() => setViewMode('gantt')} className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'gantt' ? 'bg-white text-[#001C3D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>甘特图</button>
                  </div>
                  {currentProject && (
                    <>
                      <button
                        onClick={() => setShowProjectDashboard(true)}
                        className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        项目概览
                      </button>
                      <button onClick={() => setIsMemberModalOpen(true)} className="p-1.5 text-slate-400 hover:text-[#001C3D] hover:bg-slate-100 rounded-lg transition-colors" title="管理成员">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {viewMode === 'kanban' && (
                <>
                  <FilterBar
                    members={members as User[]}
                    filterAssignee={filterAssignee}
                    setFilterAssignee={setFilterAssignee}
                    sortOption={sortOption}
                    setSortOption={(s) => setSortOption(s as SortOption)}
                    onNewTask={handleNewTask}
                  />
                  <KanbanBoard
                    tasks={filteredTasks}
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
                </>
              )}

              {viewMode === 'calendar' && (
                <div className="flex-1 p-6 overflow-auto">
                  <CalendarView tasks={filteredTasks} onTaskClick={handleEdit} onDateChange={(taskId, newDate) => updateTask(taskId, { dueDate: newDate })} />
                </div>
              )}

              {viewMode === 'gantt' && (
                <div className="flex-1 p-6 overflow-auto">
                  <GanttChart tasks={filteredTasks} onTaskClick={handleEdit} />
                </div>
              )}
            </div>
          )}
        </MainContent>
      </div>

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSubmit={handleSaveTask}
        teamMembers={members as User[]}
        initialData={editingTask}
        allTasks={tasks}
        projects={projects}
        currentProjectId={currentProject?.id}
        myRole={currentTeam?.members.find(m => m.user.id === user?.id)?.role}
      />

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }}
        onSubmit={handleSaveProject}
        initialData={editingProject}
        teamMembers={members}
      />

      {currentProject && (
        <ProjectMemberModal
          isOpen={isMemberModalOpen}
          onClose={() => setIsMemberModalOpen(false)}
          project={currentProject}
          teamMembers={members}
          onAddMember={(userId, role) => addMember(currentProject.id, userId, role)}
          onUpdateMember={(memberId, role) => updateMember(currentProject.id, memberId, role)}
          onRemoveMember={(memberId) => removeMember(currentProject.id, memberId)}
        />
      )}

      <TeamSettings isOpen={isTeamSettingsOpen} onClose={() => setIsTeamSettingsOpen(false)} />

      <RiskAlert tasks={filteredTasks} />

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
