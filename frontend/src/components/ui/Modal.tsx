import React, { useEffect, useCallback, useRef } from 'react';

// 模块级栈：嵌套弹窗时只有最顶层的 Modal 响应 Escape（抽屉等浮层也注册进来统一分发）
export const openModalStack: symbol[] = [];

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol('modal');

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape && openModalStack[openModalStack.length - 1] === idRef.current) onClose();
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      openModalStack.push(idRef.current as symbol);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      const idx = openModalStack.indexOf(idRef.current as symbol);
      if (idx !== -1) openModalStack.splice(idx, 1);
      document.removeEventListener('keydown', handleEscape);
      if (openModalStack.length === 0) document.body.style.overflow = ''; // 内层弹窗关闭时，仅当栈已空才恢复滚动
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      
      <div className={`relative w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl animate-pop-in`}>
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-0 shrink-0">
            <div>
              {title && <h2 className="text-xl font-semibold text-slate-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -m-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        <div className="flex-1 min-h-0 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

export const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4 -mx-6 -mb-6 px-6 py-4 bg-slate-50 rounded-b-2xl ${className}`}>
    {children}
  </div>
);
