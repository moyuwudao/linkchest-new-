'use client';

import { Suspense } from 'react';
import CollectionList from '@/components/CollectionList';
import { useI18n } from '@/lib/i18n';

export default function CollectionsPage() {
  const { t } = useI18n();
  return (
    <main className="flex-1 overflow-hidden flex flex-col animate-fade-in">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-taupe/60">{t('common.loading')}</div>}>
        <CollectionList />
      </Suspense>
    </main>
  );
}
