import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
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
  name,
  fallback = '?',
  size = 'md',
  color = 'bg-slate-100 text-slate-600',
  className = '',
  onClick,
}) => {
  const isImageUrl = src?.startsWith('/uploads') || src?.startsWith('http');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const imageUrl = src?.startsWith('/uploads') ? `${apiUrl}${src}` : src;
  const displayFallback = name ? name.charAt(0).toUpperCase() : fallback;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 ${sizeStyles[size]} ${isImageUrl ? 'bg-slate-100' : color} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-[#001C3D]/30 transition-all' : ''} ${className}`}
      onClick={onClick}
      title={name || alt}
    >
      {isImageUrl ? (
        <img src={imageUrl} alt={name || alt} className="w-full h-full object-cover" />
      ) : (
        <span>{src || displayFallback}</span>
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
        <div key={`avatar-${i}-${React.isValidElement(child) ? child.key : i}`} className="ring-2 ring-white rounded-full">{child}</div>
      ))}
      {remaining > 0 && (
        <div className={`inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-medium ring-2 ring-white ${sizeStyles[size]}`}>
          +{remaining}
        </div>
      )}
    </div>
  );
};
