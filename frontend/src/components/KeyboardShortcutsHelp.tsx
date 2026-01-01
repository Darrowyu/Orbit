import React, { memo } from 'react';

interface ShortcutItem { keys: string; description: string; }

const SHORTCUTS: ShortcutItem[] = [
  { keys: 'Ctrl + N', description: '新建任务' },
  { keys: 'Ctrl + K', description: '搜索任务' },
  { keys: 'Ctrl + Shift + D', description: '打开仪表盘' },
  { keys: '/', description: '显示快捷键帮助' },
  { keys: 'Esc', description: '关闭弹窗' },
];

interface Props { isOpen: boolean; onClose: () => void; }

export const KeyboardShortcutsHelp: React.FC<Props> = memo(({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <h2 className="text-lg font-bold text-gray-900">键盘快捷键</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.keys} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded border border-gray-200">{shortcut.keys}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

KeyboardShortcutsHelp.displayName = 'KeyboardShortcutsHelp';
export default KeyboardShortcutsHelp;
