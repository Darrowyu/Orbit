import { create } from 'zustand';
import { Notification } from '../types';
import { notificationApi } from '../services/api';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  page: number;
  totalPages: number;
  hasMore: boolean;
  fetchNotifications: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  page: 1,
  totalPages: 1,
  hasMore: false,

  fetchNotifications: async (page = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await notificationApi.getAll(page);
      set({ 
        notifications: page === 1 ? data.notifications : [...get().notifications, ...data.notifications],
        page: data.page,
        totalPages: data.totalPages,
        hasMore: data.page < data.totalPages,
        isLoading: false 
      });
    } catch { set({ isLoading: false }); }
  },

  loadMore: async () => {
    const { page, hasMore } = get();
    if (hasMore) await get().fetchNotifications(page + 1);
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await notificationApi.getUnreadCount();
      set({ unreadCount: data });
    } catch { }
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

  deleteNotification: async (id) => {
    await notificationApi.delete(id);
    set((s) => {
      const n = s.notifications.find((n) => n.id === id);
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: n && !n.read ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    });
  },

  deleteAllNotifications: async () => {
    await notificationApi.deleteAll();
    set({ notifications: [], unreadCount: 0 });
  },
}));

if (import.meta.hot) {
  import.meta.hot.accept();
}
