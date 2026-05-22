'use client';

import { ReactNode } from 'react';

interface ManageListItemProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function ManageListItem({ children, actions, className = '', onClick }: ManageListItemProps) {
  return (
    <div
      className={`card p-4 flex items-center justify-between transition-colors group ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );
}
