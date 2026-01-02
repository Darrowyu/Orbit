import React from 'react';

interface TagProps {
  color: string;
  children: React.ReactNode;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const Tag: React.FC<TagProps> = ({ color, children, onRemove, size = 'sm', className = '' }) => {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium transition-all ${sizeStyles} ${className}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate max-w-[80px]">{children}</span>
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="ml-0.5 hover:opacity-70 transition-opacity shrink-0">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};
