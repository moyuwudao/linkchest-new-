import { platformNames, PLATFORMS, getContrastTextColor } from '@/lib/platforms';

interface PlatformBadgeProps {
  platform: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

export function PlatformBadge({ platform, size = 'md', className = '' }: PlatformBadgeProps) {
  const platformColor = PLATFORMS.find(p => p.key === platform)?.color || '#6b7280';
  const textColor = getContrastTextColor(platformColor);

  return (
    <span
      className={`inline-block rounded font-medium leading-tight line-clamp-2 break-all ${textColor} ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: platformColor }}
      title={platformNames[platform] || platform}
    >
      {platformNames[platform] || platform}
    </span>
  );
}
