import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[], enabled = true): void => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return; // 输入框中不触发快捷键

    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

// 预定义快捷键列表
export const SHORTCUT_KEYS = {
  NEW_TASK: { key: 'n', ctrl: true, description: '新建任务 (Ctrl+N)' },
  SEARCH: { key: 'k', ctrl: true, description: '搜索 (Ctrl+K)' },
  DASHBOARD: { key: 'd', ctrl: true, shift: true, description: '仪表盘 (Ctrl+Shift+D)' },
  HELP: { key: '/', description: '显示快捷键帮助 (/)' },
  ESCAPE: { key: 'Escape', description: '关闭弹窗 (Esc)' },
} as const;

export default useKeyboardShortcuts;
