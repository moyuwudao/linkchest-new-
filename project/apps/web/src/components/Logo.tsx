'use client';

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'dark' | 'light';
}

export default function Logo({ size = 40, className = '', variant = 'dark' }: LogoProps) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`
        relative inline-flex items-center justify-center shrink-0
        rounded-xl overflow-hidden
        ${isDark
          ? 'shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-1 ring-white/10'
          : 'shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5'
        }
        ${className}
      `}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.png"
        alt="LinkChest"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}
