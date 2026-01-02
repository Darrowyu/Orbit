import React, { forwardRef } from 'react';

type IconButtonVariant = 'default' | 'ghost' | 'outline' | 'primary';
type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<IconButtonVariant, string> = {
  default: 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
  outline: 'border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300',
  primary: 'bg-[#001C3D] text-white hover:bg-[#001633] shadow-sm',
};

const sizeStyles: Record<IconButtonSize, string> = {
  xs: 'w-6 h-6 rounded',
  sm: 'w-7 h-7 rounded-md',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-11 h-11 rounded-xl',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, icon, variant = 'ghost', size = 'md', isLoading, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#001C3D]/30 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (icon || children)}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

