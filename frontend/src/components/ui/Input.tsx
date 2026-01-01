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
    const baseStyles = 'w-full rounded-lg border bg-white transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0';
    const stateStyles = hasError 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
      : 'border-slate-200 hover:border-slate-300 focus:border-[#001C3D] focus:ring-[#001C3D]/20';

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
          <p className={`mt-1.5 text-xs ${hasError ? 'text-red-600' : 'text-slate-500'}`}>
            {errorText || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
