'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type ToastMode = 'toast' | 'alert';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  mode: ToastMode;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showAlert: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, mode: 'toast' }]);
  }, []);

  const showAlert = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, mode: 'alert' }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showAlert }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: number) => void }) {
  const alerts = toasts.filter(t => t.mode === 'alert');
  const toastItems = toasts.filter(t => t.mode === 'toast');

  return (
    <>
      {/* Alert 模式 - 全屏模态弹窗 */}
      {alerts.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col gap-3 max-w-sm w-full mx-4">
            {alerts.map(toast => (
              <AlertItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Toast 模式 - 底部轻提醒 */}
      {toastItems.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
          {toastItems.map(toast => (
            <ToastItemComponent key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>
      )}
    </>
  );
}

const icons = {
  success: <CheckCircle size={20} className="text-sage flex-shrink-0" />,
  error: <AlertCircle size={20} className="text-rust flex-shrink-0" />,
  info: <Info size={20} className="text-chest-500 dark:text-amber-400 flex-shrink-0" />,
};

const bgColors = {
  success: 'border-sage/20 dark:border-sage/30 bg-sage/10 dark:bg-sage/20',
  error: 'border-rust/20 dark:border-rust/30 bg-rust/10 dark:bg-rust/20',
  info: 'border-chest-500/15 dark:border-amber-400/20 bg-chest-500/5 dark:bg-amber-400/10',
};

function AlertItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 px-5 py-4 bg-white dark:bg-chest-800/90 rounded-2xl shadow-2xl border ${bgColors[toast.type]} animate-scale-in pointer-events-auto`}
    >
      {icons[toast.type]}
      <p className="flex-1 text-base font-medium text-charcoal dark:text-parchment">{toast.message}</p>
      <button onClick={onClose} className="p-1.5 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded-lg transition-colors cursor-pointer">
        <X size={18} className="text-taupe" />
      </button>
    </div>
  );
}

function ToastItemComponent({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className={`flex items-center gap-3 px-5 py-3 bg-white dark:bg-chest-800/95 rounded-xl shadow-floating border ${bgColors[toast.type]} animate-slide-up pointer-events-auto cursor-pointer min-w-[280px] max-w-md`}
    >
      {icons[toast.type]}
      <p className="flex-1 text-base font-medium text-charcoal dark:text-parchment">{toast.message}</p>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded-lg transition-colors cursor-pointer"
      >
        <X size={18} className="text-taupe" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (message: string, type?: ToastType) => {
        alert(message);
      },
      showAlert: (message: string, type?: ToastType) => {
        alert(message);
      },
    };
  }
  return context;
}
