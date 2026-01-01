# 前端设计系统重构 实施计划

**目标：** 建立完整的设计系统，统一优化所有前端页面，提升视觉品质和用户体验

**架构：** 基于现有深海军蓝(#001C3D)品牌色系，建立Design Token系统 → 创建原子组件库 → 逐页重构优化

**技术栈：** React 18 + TypeScript + Tailwind CSS 4 + CSS Variables

---

## 阶段一：设计令牌系统 (Design Tokens)

### 任务 1.1: 扩展CSS变量系统

**文件：**
- 修改: `frontend/src/index.css`

**步骤1: 扩展颜色系统**

在 `:root` 中添加完整的语义化颜色变量：

```css
:root {
  /* 品牌色 - Orbit Navy */
  --color-brand-50: 248 250 252;
  --color-brand-100: 241 245 249;
  --color-brand-500: 15 76 129;
  --color-brand-600: 0 28 61;
  --color-brand-700: 0 22 51;
  --color-brand-800: 0 18 41;
  --color-brand-900: 0 12 26;

  /* 功能色 */
  --color-success-50: 240 253 244;
  --color-success-500: 34 197 94;
  --color-success-600: 22 163 74;
  
  --color-warning-50: 255 251 235;
  --color-warning-500: 245 158 11;
  --color-warning-600: 217 119 6;
  
  --color-danger-50: 254 242 242;
  --color-danger-500: 239 68 68;
  --color-danger-600: 220 38 38;

  /* 间距系统 - 8pt网格 */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* 圆角系统 */
  --radius-none: 0;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.25rem;
  --radius-3xl: 1.5rem;
  --radius-full: 9999px;

  /* 阴影系统 */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
  
  /* 品牌阴影 */
  --shadow-brand: 0 4px 14px 0 rgb(0 28 61 / 0.15);
  --shadow-brand-lg: 0 10px 25px -3px rgb(0 28 61 / 0.2);

  /* 字体大小 */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;

  /* 动画时长 */
  --duration-75: 75ms;
  --duration-100: 100ms;
  --duration-150: 150ms;
  --duration-200: 200ms;
  --duration-300: 300ms;
  --duration-500: 500ms;
  --duration-700: 700ms;

  /* 缓动函数 */
  --ease-linear: linear;
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

**步骤2: 添加新动画**

```css
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInDown {
  from { opacity: 0; transform: translateY(-16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes popIn {
  0% { opacity: 0; transform: scale(0.9); }
  50% { transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.animate-slide-in-up { animation: slideInUp var(--duration-300) var(--ease-out); }
.animate-slide-in-down { animation: slideInDown var(--duration-300) var(--ease-out); }
.animate-slide-in-left { animation: slideInLeft var(--duration-300) var(--ease-out); }
.animate-slide-in-right { animation: slideInRight var(--duration-300) var(--ease-out); }
.animate-pop-in { animation: popIn var(--duration-300) var(--ease-spring); }
.animate-shake { animation: shake var(--duration-300) var(--ease-out); }
.animate-float { animation: float 3s ease-in-out infinite; }
```

**步骤3: 提交**

```bash
git add frontend/src/index.css
git commit -m "feat(ui): 扩展设计令牌系统"
```

---

## 阶段二：原子组件库

### 任务 2.1: 创建UI组件目录结构

**文件：**
- 创建: `frontend/src/components/ui/index.ts`

**步骤1: 创建入口文件**

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Select } from './Select';
export { Card } from './Card';
export { Badge } from './Badge';
export { Modal } from './Modal';
export { Avatar } from './Avatar';
export { Spinner } from './Spinner';
export { IconButton } from './IconButton';
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/index.ts
git commit -m "feat(ui): 创建组件库入口"
```

---

### 任务 2.2: 重构 Button 组件

**文件：**
- 创建: `frontend/src/components/ui/Button.tsx`

**步骤1: 实现新Button组件**

```typescript
import React, { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[rgb(var(--color-brand-600))] text-white hover:bg-[rgb(var(--color-brand-700))] focus-visible:ring-[rgb(var(--color-brand-500))] shadow-[var(--shadow-brand)] hover:shadow-[var(--shadow-brand-lg)]',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400 shadow-[var(--shadow-sm)]',
  outline: 'border-2 border-[rgb(var(--color-brand-600))] text-[rgb(var(--color-brand-600))] hover:bg-[rgb(var(--color-brand-600))]/5 focus-visible:ring-[rgb(var(--color-brand-500))]',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  danger: 'bg-[rgb(var(--color-danger-600))] text-white hover:bg-[rgb(var(--color-danger-500))] focus-visible:ring-[rgb(var(--color-danger-500))] shadow-[var(--shadow-sm)]',
  success: 'bg-[rgb(var(--color-success-600))] text-white hover:bg-[rgb(var(--color-success-500))] focus-visible:ring-[rgb(var(--color-success-500))] shadow-[var(--shadow-sm)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-[var(--radius-md)]',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-[var(--radius-lg)]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--radius-xl)]',
  lg: 'h-11 px-5 text-base gap-2 rounded-[var(--radius-xl)]',
  xl: 'h-12 px-6 text-base gap-2.5 rounded-[var(--radius-2xl)]',
};

const Spinner: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading = false, isFullWidth = false, leftIcon, rightIcon, className = '', disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-[var(--duration-200)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${isFullWidth ? 'w-full' : ''} ${className}`}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? <Spinner /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/Button.tsx
git commit -m "feat(ui): 重构Button组件"
```

---

### 任务 2.3: 创建 Input 组件

**文件：**
- 创建: `frontend/src/components/ui/Input.tsx`

**步骤1: 实现Input组件**

```typescript
import React, { forwardRef } from 'react';

type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  helperText?: string;
  errorText?: string;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-8 text-sm px-3',
  md: 'h-10 text-sm px-4',
  lg: 'h-12 text-base px-4',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', error, leftIcon, rightIcon, label, helperText, errorText, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = error || !!errorText;
    const baseStyles = 'w-full rounded-[var(--radius-lg)] border bg-white transition-all duration-[var(--duration-200)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0';
    const stateStyles = hasError 
      ? 'border-[rgb(var(--color-danger-500))] focus:border-[rgb(var(--color-danger-500))] focus:ring-[rgb(var(--color-danger-500))]/20' 
      : 'border-slate-200 hover:border-slate-300 focus:border-[rgb(var(--color-brand-600))] focus:ring-[rgb(var(--color-brand-600))]/20';

    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
        <div className="relative">
          {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`${baseStyles} ${stateStyles} ${sizeStyles[size]} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightIcon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</span>}
        </div>
        {(helperText || errorText) && (
          <p className={`mt-1.5 text-xs ${hasError ? 'text-[rgb(var(--color-danger-600))]' : 'text-slate-500'}`}>
            {errorText || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/Input.tsx
git commit -m "feat(ui): 创建Input组件"
```

---

### 任务 2.4: 创建 Card 组件

**文件：**
- 创建: `frontend/src/components/ui/Card.tsx`

**步骤1: 实现Card组件**

```typescript
import React from 'react';

type CardVariant = 'default' | 'bordered' | 'elevated' | 'ghost';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-slate-100 shadow-[var(--shadow-sm)]',
  bordered: 'bg-white border border-slate-200',
  elevated: 'bg-white shadow-[var(--shadow-lg)]',
  ghost: 'bg-slate-50',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default', 
  padding = 'md',
  hoverable = false,
  clickable = false,
  className = '', 
  ...props 
}) => {
  const baseStyles = 'rounded-[var(--radius-2xl)] transition-all duration-[var(--duration-200)]';
  const interactiveStyles = hoverable || clickable 
    ? 'hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5' 
    : '';
  const cursorStyles = clickable ? 'cursor-pointer' : '';

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${cursorStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>{children}</div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className = '', ...props }) => (
  <h3 className={`text-lg font-semibold text-slate-900 ${className}`} {...props}>{children}</h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-slate-500 mt-1 ${className}`} {...props}>{children}</p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={className} {...props}>{children}</div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`mt-4 pt-4 border-t border-slate-100 ${className}`} {...props}>{children}</div>
);
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/Card.tsx
git commit -m "feat(ui): 创建Card组件"
```

---

### 任务 2.5: 创建 Badge 组件

**文件：**
- 创建: `frontend/src/components/ui/Badge.tsx`

**步骤1: 实现Badge组件**

```typescript
import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-[rgb(var(--color-brand-600))]/10 text-[rgb(var(--color-brand-600))]',
  success: 'bg-[rgb(var(--color-success-50))] text-[rgb(var(--color-success-600))]',
  warning: 'bg-[rgb(var(--color-warning-50))] text-[rgb(var(--color-warning-600))]',
  danger: 'bg-[rgb(var(--color-danger-50))] text-[rgb(var(--color-danger-600))]',
  info: 'bg-sky-50 text-sky-600',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  primary: 'bg-[rgb(var(--color-brand-600))]',
  success: 'bg-[rgb(var(--color-success-500))]',
  warning: 'bg-[rgb(var(--color-warning-500))]',
  danger: 'bg-[rgb(var(--color-danger-500))]',
  info: 'bg-sky-500',
};

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  dot = false,
  className = '', 
  ...props 
}) => {
  return (
    <span 
      className={`inline-flex items-center gap-1 font-medium rounded-[var(--radius-full)] ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
};
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/Badge.tsx
git commit -m "feat(ui): 创建Badge组件"
```

---

### 任务 2.6: 创建 Modal 组件

**文件：**
- 创建: `frontend/src/components/ui/Modal.tsx`

**步骤1: 实现Modal组件**

```typescript
import React, { useEffect, useCallback } from 'react';

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
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) onClose();
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      
      {/* Content */}
      <div className={`relative w-full ${sizeStyles[size]} bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-2xl)] animate-pop-in`}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-0">
            <div>
              {title && <h2 className="text-xl font-semibold text-slate-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -m-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[var(--radius-lg)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4 -mx-6 -mb-6 px-6 py-4 bg-slate-50 rounded-b-[var(--radius-2xl)] ${className}`}>
    {children}
  </div>
);
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/Modal.tsx
git commit -m "feat(ui): 创建Modal组件"
```

---

### 任务 2.7: 创建 Avatar 组件

**文件：**
- 创建: `frontend/src/components/ui/Avatar.tsx`

**步骤1: 实现Avatar组件**

```typescript
import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  color?: string;
  className?: string;
  onClick?: () => void;
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  fallback = '?',
  size = 'md',
  color = 'bg-slate-100 text-slate-600',
  className = '',
  onClick,
}) => {
  const isImageUrl = src?.startsWith('/uploads') || src?.startsWith('http');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const imageUrl = src?.startsWith('/uploads') ? `${apiUrl}${src}` : src;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${sizeStyles[size]} ${isImageUrl ? 'bg-slate-100' : color} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-[rgb(var(--color-brand-600))]/30 transition-all' : ''} ${className}`}
      onClick={onClick}
      title={alt}
    >
      {isImageUrl ? (
        <img src={imageUrl} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span>{src || fallback}</span>
      )}
    </div>
  );
};

export const AvatarGroup: React.FC<{ children: React.ReactNode; max?: number; size?: AvatarSize }> = ({ 
  children, 
  max = 4,
  size = 'md' 
}) => {
  const items = React.Children.toArray(children);
  const visible = items.slice(0, max);
  const remaining = items.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((child, i) => (
        <div key={i} className="ring-2 ring-white rounded-full">{child}</div>
      ))}
      {remaining > 0 && (
        <div className={`inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-medium ring-2 ring-white ${sizeStyles[size]}`}>
          +{remaining}
        </div>
      )}
    </div>
  );
};
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/Avatar.tsx
git commit -m "feat(ui): 创建Avatar组件"
```

---

### 任务 2.8: 创建 Select 组件

**文件：**
- 创建: `frontend/src/components/ui/Select.tsx`

**步骤1: 实现Select组件**

```typescript
import React, { forwardRef } from 'react';

type SelectSize = 'sm' | 'md' | 'lg';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: SelectSize;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  label?: string;
  helperText?: string;
  errorText?: string;
}

const sizeStyles: Record<SelectSize, string> = {
  sm: 'h-8 text-sm pl-3 pr-8',
  md: 'h-10 text-sm pl-4 pr-10',
  lg: 'h-12 text-base pl-4 pr-10',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = 'md', options, placeholder, error, label, helperText, errorText, className = '', id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = error || !!errorText;
    const baseStyles = 'w-full appearance-none rounded-[var(--radius-lg)] border bg-white transition-all duration-[var(--duration-200)] focus:outline-none focus:ring-2 focus:ring-offset-0 cursor-pointer';
    const stateStyles = hasError
      ? 'border-[rgb(var(--color-danger-500))] focus:border-[rgb(var(--color-danger-500))] focus:ring-[rgb(var(--color-danger-500))]/20'
      : 'border-slate-200 hover:border-slate-300 focus:border-[rgb(var(--color-brand-600))] focus:ring-[rgb(var(--color-brand-600))]/20';

    return (
      <div className="w-full">
        {label && <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`${baseStyles} ${stateStyles} ${sizeStyles[size]} ${className}`}
            {...props}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {(helperText || errorText) && (
          <p className={`mt-1.5 text-xs ${hasError ? 'text-[rgb(var(--color-danger-600))]' : 'text-slate-500'}`}>
            {errorText || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/Select.tsx
git commit -m "feat(ui): 创建Select组件"
```

---

### 任务 2.9: 创建辅助组件

**文件：**
- 创建: `frontend/src/components/ui/Spinner.tsx`
- 创建: `frontend/src/components/ui/IconButton.tsx`

**步骤1: 实现Spinner**

```typescript
import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <svg className={`animate-spin text-current ${sizeStyles[size]} ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);
```

**步骤2: 实现IconButton**

```typescript
import React, { forwardRef } from 'react';

type IconButtonVariant = 'default' | 'ghost' | 'outline';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<IconButtonVariant, string> = {
  default: 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
  outline: 'border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'w-7 h-7 rounded-[var(--radius-md)]',
  md: 'w-9 h-9 rounded-[var(--radius-lg)]',
  lg: 'w-11 h-11 rounded-[var(--radius-xl)]',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, variant = 'ghost', size = 'md', isLoading, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center transition-all duration-[var(--duration-150)] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
```

**步骤3: 提交**

```bash
git add frontend/src/components/ui/Spinner.tsx frontend/src/components/ui/IconButton.tsx
git commit -m "feat(ui): 创建Spinner和IconButton组件"
```

---

### 任务 2.10: 更新组件库入口

**文件：**
- 修改: `frontend/src/components/ui/index.ts`

**步骤1: 导出所有组件**

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Select } from './Select';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
export { Badge } from './Badge';
export { Modal, ModalFooter } from './Modal';
export { Avatar, AvatarGroup } from './Avatar';
export { Spinner } from './Spinner';
export { IconButton } from './IconButton';
```

**步骤2: 提交**

```bash
git add frontend/src/components/ui/index.ts
git commit -m "feat(ui): 完成组件库导出"
```

---

## 阶段三：页面重构

### 任务 3.1: 重构 Header 组件

**文件：**
- 修改: `frontend/src/components/Header.tsx`

**目标：**
- 使用新的 Button, Input, Select, Avatar, IconButton 组件
- 优化视觉层级和间距
- 增强响应式体验

---

### 任务 3.2: 重构 TaskCard 组件

**文件：**
- 修改: `frontend/src/components/TaskCard.tsx`

**目标：**
- 使用新的 Card, Badge, Avatar 组件
- 优化卡片阴影和边框效果
- 增强拖拽视觉反馈

---

### 任务 3.3: 重构 LoginModal 组件

**文件：**
- 修改: `frontend/src/components/LoginModal.tsx`

**目标：**
- 使用新的 Input, Button 组件
- 优化表单布局和动效
- 统一错误提示样式

---

### 任务 3.4: 重构 DashboardPage

**文件：**
- 修改: `frontend/src/pages/DashboardPage.tsx`

**目标：**
- 使用新的 Card, Badge, Avatar 组件
- 优化统计卡片视觉效果
- 增强数据可视化

---

### 任务 3.5: 重构 ProfilePage

**文件：**
- 修改: `frontend/src/pages/ProfilePage.tsx`

**目标：**
- 使用新的 Card, Input, Button, Avatar 组件
- 优化表单布局
- 统一tab切换样式

---

### 任务 3.6: 重构 AdminPage

**文件：**
- 修改: `frontend/src/pages/AdminPage.tsx`

**目标：**
- 使用新的 Card, Badge, Input, Button, Modal 组件
- 优化表格和列表样式
- 统一操作按钮样式

---

### 任务 3.7: 重构 CreateTaskModal

**文件：**
- 修改: `frontend/src/components/CreateTaskModal.tsx`

**目标：**
- 使用新的 Modal, Input, Select, Button 组件
- 优化表单布局
- 增强交互反馈

---

## 执行顺序总结

1. **阶段一** - 设计令牌系统（1个任务）
2. **阶段二** - 原子组件库（10个任务）
3. **阶段三** - 页面重构（7个任务）

**总计：18个任务**

---

## 验证清单

每完成一个阶段后执行：

```bash
cd frontend
npm run build   # 确保构建通过
npm run dev     # 启动开发服务器
```

手动验证：
- [ ] 所有页面正常渲染
- [ ] 响应式布局正常
- [ ] 动画效果流畅
- [ ] 无控制台错误
- [ ] 颜色和间距一致
