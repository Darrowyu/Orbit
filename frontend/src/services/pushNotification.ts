// 浏览器推送通知服务

const NOTIFICATION_PERMISSION_KEY = 'notification_permission_asked';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  const permission = await Notification.requestPermission();
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
  return permission === 'granted';
};

export const showBrowserNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission !== 'granted') return;
  if (document.hasFocus()) return; // 页面聚焦时不显示桌面通知
  
  const notification = new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: options?.tag || 'orbit-notification',
    ...options,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  // 5秒后自动关闭
  setTimeout(() => notification.close(), 5000);
};

export const canShowNotification = (): boolean => {
  return 'Notification' in window && Notification.permission === 'granted';
};

export const shouldAskPermission = (): boolean => {
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'default') return false;
  return !localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
};
