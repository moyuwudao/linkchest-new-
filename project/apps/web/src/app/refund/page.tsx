'use client';

import LegalPage from '@/components/LegalPage';
import { useI18n } from '@/lib/i18n';

export default function RefundPage() {
  const { t } = useI18n();
  return (
    <LegalPage
      title={t('refund.title')}
      mdFileEn="refund-policy-en.md"
      mdFileZh="refund-policy-zh.md"
    />
  );
}
