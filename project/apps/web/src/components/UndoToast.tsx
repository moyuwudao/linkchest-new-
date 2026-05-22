'use client';

import { useEffect } from 'react';
import { Undo2, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onClose: () => void;
}

export default function UndoToast({ message, onUndo, onClose }: UndoToastProps) {
  const { t } = useI18n();
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast">
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onUndo}
        className="text-amber-300 hover:text-amber-200 font-semibold text-sm flex items-center gap-1 transition-colors"
      >
        <Undo2 size={14} />
        {t('common.undo')}
      </button>
      <button onClick={onClose} className="text-parchment/60 hover:text-parchment ml-1 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}
