import { create } from 'zustand';
import { Task, TaskStatus } from '../types';
import { taskApi } from '../services/api';
import { emitTaskUpdate, emitTaskDelete } from '../services/socket';

interface TaskStore {
  tasks: Task[];
  archivedTasks: Task[];
  isLoading: boolean;
  fetchTasks: () => Promise<void>;
  fetchArchivedTasks: () => Promise<void>;
  addTask: (task: Task) => void;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  updateTaskLocal: (task: Task) => void;
  deleteTask: (id: string) => Promise<void>;
  removeTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => Promise<{ success: boolean; error: string }>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  assignSubtask: (taskId: string, subtaskId: string, assigneeId: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  archivedTasks: [],
  isLoading: false,

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const { data } = await taskApi.getAll();
      set({ tasks: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchArchivedTasks: async () => {
    try {
      const { data } = await taskApi.getArchived();
      set({ archivedTasks: data });
    } catch (e) { console.error('Failed to fetch archived tasks:', e); }
  },

  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

  createTask: async (data) => {
    const { data: task } = await taskApi.create(data);
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (id, data) => {
    const { data: updated } = await taskApi.update(id, data);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    emitTaskUpdate(updated);
  },

  updateTaskLocal: (task) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),

  deleteTask: async (id) => {
    await taskApi.delete(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    emitTaskDelete(id);
  },

  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  moveTask: async (id, status) => { // 移动任务并校验依赖
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return { success: false, error: '' };
    const restricted = [TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];
    if (restricted.includes(status) && task.dependsOn?.length) {
      const incomplete = get().tasks.filter((t) => task.dependsOn.includes(t.id) && t.status !== TaskStatus.DONE);
      if (incomplete.length) return { success: false, error: `依赖的前置任务未完成：${incomplete.map((t) => t.title).join('、')}` };
    }
    await get().updateTask(id, { status });
    return { success: true, error: '' };
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
    const updates: Partial<Task> = { subtasks };
    // 待处理状态下，只要有任何子任务完成就自动移到进行中
    const statusStr = String(task.status); // 确保字符串比较
    const isTodo = statusStr === 'TODO';
    const hasCompleted = subtasks.some((s) => s.completed);
    if (isTodo && hasCompleted) {
      const deps = task.dependsOn || [];
      const incomplete = deps.length > 0 ? get().tasks.filter((t) => deps.includes(t.id) && String(t.status) !== 'DONE') : [];
      if (incomplete.length === 0) updates.status = TaskStatus.IN_PROGRESS;
    }
    await get().updateTask(taskId, updates);
  },

  assignSubtask: async (taskId, subtaskId, assigneeId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, assigneeId: assigneeId || undefined } : s));
    await get().updateTask(taskId, { subtasks });
  },

  archiveTask: async (id) => {
    const { data: archived } = await taskApi.archive(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), archivedTasks: [archived, ...s.archivedTasks] }));
  },

  restoreTask: async (id) => {
    const { data: restored } = await taskApi.restore(id);
    set((s) => ({ archivedTasks: s.archivedTasks.filter((t) => t.id !== id), tasks: [restored, ...s.tasks] }));
  },
}));
