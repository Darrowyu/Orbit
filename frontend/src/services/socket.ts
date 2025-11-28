import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';
import { useNotificationStore } from '../stores/notificationStore';
import { Task, Notification } from '../types';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export const getSocket = () => socket;

export const connectSocket = () => { // 建立 WebSocket 连接
  const token = useAuthStore.getState().token;
  if (!token || socket) return; // 已有连接实例则跳过

  socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 1000 });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', (reason) => { if (reason === 'io server disconnect' || reason === 'io client disconnect') console.log('Socket disconnected'); });

  socket.on('task:created', (task: Task) => useTaskStore.getState().addTask(task));
  socket.on('task:updated', (task: Task) => useTaskStore.getState().updateTaskLocal(task));
  socket.on('task:deleted', (id: string) => useTaskStore.getState().removeTask(id));
  socket.on('notification', (n: Notification) => useNotificationStore.getState().addNotification(n));
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const emitTaskCreate = (task: Task) => socket?.emit('task:create', task);
export const emitTaskUpdate = (task: Task) => socket?.emit('task:update', task);
export const emitTaskDelete = (id: string) => socket?.emit('task:delete', id);
