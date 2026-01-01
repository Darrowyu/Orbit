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
  const baseStyles = 'rounded-2xl transition-all duration-200';
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
