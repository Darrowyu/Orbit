import { create } from 'zustand';
import { Notification } from '../types';
import { notificationApi } from '../services/api';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data } = await notificationApi.getAll();
      set({ notifications: data, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await notificationApi.getUnreadCount();
      set({ unreadCount: data });
    } catch {}
  },

  markAsRead: async (id) => {
    await notificationApi.markAsRead(id);
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await notificationApi.markAllAsRead();
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification) => {
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }));
  },
}));
