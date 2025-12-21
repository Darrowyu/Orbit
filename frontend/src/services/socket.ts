import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { useNotificationStore } from '../stores/notificationStore';
import { Task, Notification } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const getSocket = () => socket;

export const connectSocket = (teamId?: string) => { // 建立 WebSocket 连接
  const token = useAuthStore.getState().token;
  if (!token) return;
  if (socket?.connected) { // 已连接，仅切换团队
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
    console.log('Socket connected');
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') socket?.connect(); // 服务端主动断开时尝试重连
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) console.warn('Socket max reconnect attempts reached');
  });

  socket.on('reconnect', (attempt) => console.log('Socket reconnected after', attempt, 'attempts'));

  socket.on('task:created', (task: Task) => useTaskStore.getState().addTask(task));
  socket.on('task:updated', (task: Task) => useTaskStore.getState().updateTaskLocal(task));
  socket.on('task:deleted', (id: string) => useTaskStore.getState().removeTask(id));
  socket.on('notification', (n: Notification) => useNotificationStore.getState().addNotification(n));
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

