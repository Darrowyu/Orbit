import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useCommentStore } from '../stores/commentStore';
import { Task, Notification } from '../types';
import { Comment } from './api';
import { showBrowserNotification } from './pushNotification';

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin); // 与 api.ts 回退策略一致：生产同源
const MAX_RECONNECT_ATTEMPTS = 10;

let socket: Socket | null = null;
let hasConnected = false; // 是否完成过首次连接（用于区分重连）
let currentTeamId: string | undefined;

export const getSocket = () => socket;

// 重连后刷新数据，确保状态同步
const refreshDataAfterReconnect = (): void => {
  const taskStore = useTaskStore.getState();
  if (taskStore.fetchTasks) taskStore.fetchTasks();
};

export const connectSocket = (teamId?: string): void => {
  const token = useAuthStore.getState().token;
  if (!token) return;

  currentTeamId = teamId; // 保存当前团队ID用于重连

  if (socket) {
    if (socket.connected) {
      if (teamId) socket.emit('join:team', teamId);
      return;
    }
    socket.disconnect(); // 丢弃断线中的旧实例，避免重复实例并存
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    query: teamId ? { teamId } : {},
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
  });

  socket.on('connect', () => {
    if (hasConnected) { // 重连（非首次连接）：刷新数据并重新入房
      refreshDataAfterReconnect();
      if (currentTeamId) socket?.emit('join:team', currentTeamId);
    }
    hasConnected = true;
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') socket?.connect();
  });

  socket.on('task:created', (task: Task) => useTaskStore.getState().addTask(task));
  socket.on('task:updated', (task: Task) => useTaskStore.getState().updateTaskLocal(task));
  socket.on('task:deleted', (id: string) => useTaskStore.getState().removeTask(id));
  // 评论实时事件：写入 commentStore，仅当抽屉打开对应任务时生效（store 内按 taskId 过滤、按 id 幂等）
  socket.on('comment:created', (comment: Comment) => useCommentStore.getState().addComment(comment));
  socket.on('comment:deleted', (id: string) => useCommentStore.getState().removeComment(id));
  socket.on('notification', (n: Notification) => {
    useNotificationStore.getState().addNotification(n);
    showBrowserNotification(n.title, { body: n.message, tag: n.id });
  });
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
  hasConnected = false;
};

export const switchTeam = (teamId: string) => { // 动态切换团队
  currentTeamId = teamId; // 同步更新，断线期间切团队后重连能用新 teamId 入房
  if (socket?.connected) socket.emit('join:team', teamId);
};

