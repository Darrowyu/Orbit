import React from 'react';

interface AvatarProps {
  avatar?: string;
  color?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  fallback?: React.ReactNode;
}

const sizeMap = { xs: 'w-5 h-5 text-[10px]', sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-lg' };

export const Avatar: React.FC<AvatarProps> = ({ avatar, color, name, size = 'md', className = '', fallback }) => {
  const isUpload = avatar?.startsWith('/uploads');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  return (
    <div className={`rounded-full flex items-center justify-center overflow-hidden ${sizeMap[size]} ${isUpload ? 'bg-gray-100' : color || 'bg-gray-100'} ${className}`} title={name}>
      {isUpload ? <img src={`${baseUrl}${avatar}`} alt="avatar" className="w-full h-full object-cover" /> : avatar || fallback || '?'}
    </div>
  );
};
