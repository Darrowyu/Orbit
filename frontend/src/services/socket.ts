import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { useNotificationStore } from '../stores/notificationStore';
import { Task, Notification } from '../types';
import { showBrowserNotification } from './pushNotification';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MAX_RECONNECT_ATTEMPTS = 10;

let socket: Socket | null = null;
let reconnectAttempts = 0;
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
  
  if (socket?.connected) {
    if (teamId) socket.emit('join:team', teamId);
    return;
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
    if (reconnectAttempts > 0) {
      refreshDataAfterReconnect(); // 重连后刷新数据
      if (currentTeamId) socket?.emit('join:team', currentTeamId); // 重新加入团队房间
    }
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') socket?.connect();
  });

  socket.on('connect_error', () => {
    reconnectAttempts++;
  });

  socket.on('reconnect', () => {
    refreshDataAfterReconnect(); // 重连成功后刷新数据
    if (currentTeamId) socket?.emit('join:team', currentTeamId);
  });

  socket.on('task:created', (task: Task) => useTaskStore.getState().addTask(task));
  socket.on('task:updated', (task: Task) => useTaskStore.getState().updateTaskLocal(task));
  socket.on('task:deleted', (id: string) => useTaskStore.getState().removeTask(id));
  socket.on('notification', (n: Notification) => {
    useNotificationStore.getState().addNotification(n);
    showBrowserNotification(n.title, { body: n.message, tag: n.id });
  });
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
  reconnectAttempts = 0;
};

export const switchTeam = (teamId: string) => { // 动态切换团队
  if (socket?.connected) socket.emit('join:team', teamId);
};

export const emitTaskCreate = (task: Task) => socket?.emit('task:create', task);
export const emitTaskUpdate = (task: Task) => socket?.emit('task:update', task);
export const emitTaskDelete = (id: string) => socket?.emit('task:delete', id);

