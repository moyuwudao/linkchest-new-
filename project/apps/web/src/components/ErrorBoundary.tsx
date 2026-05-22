'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到错误:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-paper dark:bg-ink">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-rust/10 dark:bg-rust/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={28} className="text-rust" />
        </div>
        <h2 className="text-lg font-bold text-charcoal dark:text-parchment mb-2">
          {t('error.pageTitle')}
        </h2>
        <p className="text-sm text-taupe dark:text-parchment/60 mb-6 leading-relaxed">
          {t('error.pageDesc')}
        </p>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-chest-500 dark:bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-chest-600 dark:hover:bg-amber-600 transition-colors cursor-pointer"
        >
          <RefreshCw size={16} />
          {t('error.refresh')}
        </button>
      </div>
    </div>
  );
}
