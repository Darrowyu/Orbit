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
    const baseStyles = 'w-full appearance-none rounded-lg border bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 cursor-pointer';
    const stateStyles = hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-200 hover:border-slate-300 focus:border-[#001C3D] focus:ring-[#001C3D]/20';

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
          <p className={`mt-1.5 text-xs ${hasError ? 'text-red-600' : 'text-slate-500'}`}>
            {errorText || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
