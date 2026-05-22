'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Clock, Loader2, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';

interface AutoBackupSectionProps {
  userTier: string;
}

export default function AutoBackupSection({ userTier }: AutoBackupSectionProps) {
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [backupFreq, setBackupFreq] = useState<'off' | 'weekly' | 'monthly'>('off');
  const [expanded, setExpanded] = useState(false);

  const canUseBackup = userTier === 'heavy' || userTier === 'super';

  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['user-settings-backup'],
    queryFn: async () => {
      const r = await api.get('/users/settings');
      return (r.data.data || r.data) as Record<string, unknown>;
    },
  });

  useEffect(() => {
    if (userSettings) {
      const freq = userSettings.backupFrequency as 'off' | 'weekly' | 'monthly' | undefined;
      if (freq) setBackupFreq(freq);
    }
  }, [userSettings]);

  const saveBackupMutation = useMutation({
    mutationFn: (data: { backupFrequency: string; backupFormat: string }) => api.put('/users/settings', data),
    onSuccess: () => {
      showToast(t('settings.backupSaved'), 'success');
    },
    onError: () => {
      showAlert(t('common.operationFailed'), 'error');
    },
  });

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-parchment/5 dark:hover:bg-chest-700/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-chest-400" />
          <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('settings.autoBackup')}</h3>
        </div>
        <div className="flex items-center gap-2">
          {!canUseBackup && (
            <span className="text-xs px-2 py-1 rounded bg-chest-500/10 text-chest-500 dark:text-amber-400">{t('settings.proRequired')}</span>
          )}
          <ChevronDown size={18} className={`text-taupe dark:text-parchment/60 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-5 py-4 space-y-5 border-t border-chest-100 dark:border-chest-700/50">
          {!canUseBackup ? (
            <div className="text-sm text-taupe/70 dark:text-parchment/50 text-center py-2">
              {t('settings.upgradeHint')}
            </div>
          ) : (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-sm text-taupe dark:text-parchment/60 mb-2">
                  {t('settings.backupFrequency')}
                </label>
                <div className="flex gap-2">
                  {([
                    { value: 'off' as const, label: t('settings.backupOff') },
                    { value: 'weekly' as const, label: t('settings.backupWeekly') },
                    { value: 'monthly' as const, label: t('settings.backupMonthly') },
                  ]).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setBackupFreq(option.value)}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                        backupFreq === option.value
                          ? 'border-chest-500 bg-chest-500/5 dark:bg-amber-400/10 text-chest-500 dark:text-amber-400'
                          : 'border-parchment/40 dark:border-charcoal/40 text-charcoal/70 dark:text-parchment/70 hover:border-parchment/60 dark:hover:border-charcoal/60'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t('settings.backupAutoFormat')}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t('settings.backupRetainHint')}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => saveBackupMutation.mutate({ backupFrequency: backupFreq, backupFormat: 'json' })}
                  disabled={saveBackupMutation.isPending || settingsLoading}
                  className="px-5 py-2.5 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-taupe/20 text-sm transition-colors cursor-pointer"
                >
                  {saveBackupMutation.isPending ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                  {t('common.save')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
