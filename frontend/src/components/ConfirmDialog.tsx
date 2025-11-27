import React, { createContext, useContext, useState, useCallback } from 'react';

interface DialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface DialogContextType {
  confirm: (config: DialogConfig) => Promise<boolean>;
  alert: (config: Omit<DialogConfig, 'cancelText'>) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<(DialogConfig & { resolve: (v: boolean) => void; isAlert?: boolean }) | null>(null);

  const confirm = useCallback((config: DialogConfig) => new Promise<boolean>((resolve) => setDialog({ ...config, resolve })), []);
  const alert = useCallback((config: Omit<DialogConfig, 'cancelText'>) => new Promise<void>((resolve) => setDialog({ ...config, resolve: () => resolve(), isAlert: true })), []);

  const handleClose = (result: boolean) => { dialog?.resolve(result); setDialog(null); };

  const typeStyles = {
    danger: { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', iconBg: 'bg-red-100', iconColor: 'text-red-600', btnBg: 'bg-red-600 hover:bg-red-700' },
    warning: { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', btnBg: 'bg-amber-600 hover:bg-amber-700' },
    info: { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', btnBg: 'bg-indigo-600 hover:bg-indigo-700' },
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${typeStyles[dialog.type || 'info'].iconBg}`}>
                <svg className={`w-6 h-6 ${typeStyles[dialog.type || 'info'].iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={typeStyles[dialog.type || 'info'].icon} /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">{dialog.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{dialog.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              {!dialog.isAlert && <button onClick={() => handleClose(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">{dialog.cancelText || '取消'}</button>}
              <button onClick={() => handleClose(true)} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${typeStyles[dialog.type || 'info'].btnBg}`}>{dialog.confirmText || '确定'}</button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
