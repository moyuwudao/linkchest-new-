'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', showCloseButton = true }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${maxWidth}`} onClick={e => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h3 className="text-lg font-bold text-charcoal dark:text-parchment">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-parchment/10 dark:hover:bg-charcoal/30 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} className="text-taupe dark:text-parchment/60" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
