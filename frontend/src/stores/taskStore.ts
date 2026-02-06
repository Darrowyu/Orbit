import { create } from 'zustand';
import { Task, TaskStatus } from '../types';
import { taskApi } from '../services/api';
import { emitTaskUpdate, emitTaskDelete } from '../services/socket';
import { getErrorMessage } from '../utils/error';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TaskStore {
  tasks: Task[];
  archivedTasks: Task[];
  isLoading: boolean;
  pagination: Pagination | null;
  fetchTasks: (page?: number, limit?: number) => Promise<void>;
  fetchArchivedTasks: () => Promise<void>;
  addTask: (task: Task) => void;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  updateTaskLocal: (task: Task) => void;
  deleteTask: (id: string) => Promise<void>;
  removeTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => Promise<{ success: boolean; error: string }>;
  validateDependencies: (task: Task, status: TaskStatus) => string | null;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  assignSubtask: (taskId: string, subtaskId: string, assigneeId: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  archivedTasks: [],
  isLoading: false,
  pagination: null,

  fetchTasks: async (page = 1, limit = 100) => {
    set({ isLoading: true });
    try {
      const { data } = await taskApi.getAll({ page, limit });
      set({ tasks: data.data, pagination: data.pagination, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchArchivedTasks: async () => {
    try {
      const { data } = await taskApi.getArchived();
      set({ archivedTasks: data });
    } catch {
      // Silently ignore errors
    }
  },

  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

  createTask: async (data) => {
    const { data: task } = await taskApi.create(data);
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (id, data) => {
    const previousTasks = get().tasks;
    const task = previousTasks.find(t => t.id === id);
    if (!task) return;
    
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)) }));
    
    try {
      const { data: updated } = await taskApi.update(id, data);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
      emitTaskUpdate(updated);
    } catch (error) {
      set({ tasks: previousTasks });
      throw error;
    }
  },

  updateTaskLocal: (task) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),

  deleteTask: async (id) => {
    const previousTasks = get().tasks;
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    try {
      await taskApi.delete(id);
      emitTaskDelete(id);
    } catch (error) {
      set({ tasks: previousTasks });
      throw error;
    }
  },

  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  moveTask: async (id, status) => {
    const previousTasks = get().tasks;
    const task = previousTasks.find((t) => t.id === id);
    if (!task) return { success: false, error: '任务不存在' };
    
    const error = get().validateDependencies(task, status);
    if (error) return { success: false, error };
    
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
    try {
      const { data: updated } = await taskApi.update(id, { status });
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
      emitTaskUpdate(updated);
      return { success: true, error: '' };
    } catch (error) {
      set({ tasks: previousTasks });
      return { success: false, error: getErrorMessage(error) };
    }
  },

  validateDependencies: (task, status) => {
    const restricted = [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];
    if (!restricted.includes(status) || !task.dependsOn?.length) return null;
    const incomplete = get().tasks.filter((t) => task.dependsOn.includes(t.id) && t.status !== TaskStatus.DONE);
    return incomplete.length ? `依赖的前置任务未完成：${incomplete.map((t) => t.title).join('、')}` : null;
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    
    const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
    const updates: Partial<Task> = { subtasks };
    
    const newStatus = get().deriveStatusFromSubtasks(task, subtasks);
    if (newStatus) updates.status = newStatus;
    
    await get().updateTask(taskId, updates);
  },

  deriveStatusFromSubtasks: (task, subtasks) => {
    if (task.status !== TaskStatus.TODO) return null;
    if (!subtasks.some((s) => s.completed)) return null;
    
    const deps = task.dependsOn || [];
    if (deps.length > 0) {
      const incomplete = get().tasks.filter((t) => deps.includes(t.id) && t.status !== TaskStatus.DONE);
      if (incomplete.length > 0) return null;
    }
    return TaskStatus.IN_PROGRESS;
  },

  assignSubtask: async (taskId, subtaskId, assigneeId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, assigneeId: assigneeId || undefined } : s));
    await get().updateTask(taskId, { subtasks });
  },

  archiveTask: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    await get().performArchiveOperation(id, task, true);
  },

  restoreTask: async (id) => {
    const task = get().archivedTasks.find(t => t.id === id);
    if (!task) return;
    await get().performArchiveOperation(id, task, false);
  },

  performArchiveOperation: async (id: string, task: Task, isArchiving: boolean) => {
    const previousTasks = get().tasks;
    const previousArchived = get().archivedTasks;
    const archivedAt = isArchiving ? new Date().toISOString() : null;
    const updatedTask = { ...task, isArchived: isArchiving, archivedAt };
    
    if (isArchiving) {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), archivedTasks: [updatedTask, ...s.archivedTasks] }));
    } else {
      set((s) => ({ archivedTasks: s.archivedTasks.filter((t) => t.id !== id), tasks: [updatedTask, ...s.tasks] }));
    }
    
    try {
      const { data } = isArchiving ? await taskApi.archive(id) : await taskApi.restore(id);
      set((s) => ({ [isArchiving ? 'archivedTasks' : 'tasks']: s[isArchiving ? 'archivedTasks' : 'tasks'].map(t => t.id === id ? data : t) }));
    } catch (error) {
      set({ tasks: previousTasks, archivedTasks: previousArchived });
      throw error;
    }
  },
}));

if (import.meta.hot) {
  import.meta.hot.accept();
}
