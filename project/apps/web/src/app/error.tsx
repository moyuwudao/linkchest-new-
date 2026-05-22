'use client';

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-4xl font-bold text-destructive mb-4">{t('error.pageTitle')}</h1>
      <h2 className="text-xl font-semibold text-foreground mb-2">{t('error.appError')}</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        {t('error.pageDesc')}
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('error.retry')}
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          {t('error.backHome')}
        </a>
      </div>
    </div>
  );
}
