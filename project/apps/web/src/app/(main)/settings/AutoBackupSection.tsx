'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, ChevronDown, Download, RefreshCw, UploadCloud, Archive, History } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';

interface AutoBackupSectionProps {
  userTier: string;
}

interface BackupItem {
  id: string;
  source: 'auto' | 'manual';
  format: string;
  filename: string;
  size: number;
  count: number;
  createdAt: string;
}

export default function AutoBackupSection({ userTier }: AutoBackupSectionProps) {
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const queryClient = useQueryClient();
  const [backupFreq, setBackupFreq] = useState<'off' | 'weekly' | 'monthly'>('off');
  const [expanded, setExpanded] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const canUseBackup = userTier === 'heavy' || userTier === 'super';

  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['user-settings-backup'],
    queryFn: async () => {
      const r = await api.get('/users/settings');
      return (r.data.data || r.data) as Record<string, unknown>;
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (userSettings) {
      const freq = userSettings.backupFrequency as 'off' | 'weekly' | 'monthly' | undefined;
      if (freq) setBackupFreq(freq);
    }
  }, [userSettings]);

  // 备份目录列表
  const {
    data: backups,
    isLoading: backupsLoading,
    refetch: refetchBackups,
  } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const r = await api.get('/backups');
      return (r.data.data || []) as BackupItem[];
    },
    enabled: expanded && canUseBackup,
    staleTime: 30 * 1000,
  });

  const saveBackupMutation = useMutation({
    mutationFn: (data: { backupFrequency: string; backupFormat: string }) => api.put('/users/settings', data),
    onSuccess: () => {
      showToast(t('settings.backupSaved'), 'success');
    },
    onError: () => {
      showAlert(t('common.operationFailed'), 'error');
    },
  });

  // 立即备份
  const handleImmediateBackup = async () => {
    setBackingUp(true);
    try {
      const res = await api.post('/users/backup');
      const d = res.data.data;
      showToast(
        `${t('settings.backupExportSuccess')} · ${d.count} ${t('settings.backupItems')}`,
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.response?.data?.error || t('common.operationFailed');
      if (status === 503) {
        showAlert(msg || '云端存储暂不可用', 'error');
      } else {
        showAlert(msg, 'error');
      }
    } finally {
      setBackingUp(false);
    }
  };

  // 下载备份
  const handleDownload = async (backupId: string) => {
    try {
      const r = await api.get(`/backups/${backupId}/download`);
      const data = r.data.data;
      if (data?.url) {
        // WEB 端直接 window.open
        window.open(data.url, '_blank');
      }
    } catch {
      showAlert('下载失败', 'error');
    }
  };

  // 恢复备份（只增不删 — 现有数据保留）
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const handleRestore = async (backupId: string, filename: string) => {
    if (!confirm(t('settings.backupRestoreConfirmDesc'))) return;
    setRestoringId(backupId);
    try {
      const r = await api.post(`/backups/${backupId}/restore`);
      const s = r.data.data || {};
      showToast(
        `${t('settings.backupRestoreSuccess')} · ${t('settings.backupRestoredCollections')}: ${s.collectionsCreated || 0} · ${t('settings.backupSkippedCollections')}: ${s.collectionsSkipped || 0}`,
        'success'
      );
      // 刷新可能受影响的查询
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.response?.data?.error || t('common.operationFailed');
      if (status === 502) {
        showAlert(msg || '云端存储暂不可用，恢复失败', 'error');
      } else if (status === 404) {
        showAlert(t('settings.backupNotFound'), 'error');
      } else {
        showAlert(msg, 'error');
      }
    } finally {
      setRestoringId(null);
    }
  };

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

              <div className="flex justify-between items-center">
                <button
                  onClick={handleImmediateBackup}
                  disabled={backingUp}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-chest-500 text-white rounded-lg hover:bg-chest-600 disabled:bg-taupe/20 text-sm transition-colors cursor-pointer"
                >
                  {backingUp ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                  {t('settings.backupExportNow')}
                </button>
                <button
                  onClick={() => saveBackupMutation.mutate({ backupFrequency: backupFreq, backupFormat: 'json' })}
                  disabled={saveBackupMutation.isPending || settingsLoading}
                  className="px-5 py-2.5 border border-chest-500 text-chest-500 dark:text-amber-400 rounded-lg hover:bg-chest-500/5 disabled:opacity-50 text-sm transition-colors cursor-pointer"
                >
                  {saveBackupMutation.isPending ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                  {t('common.save')}
                </button>
              </div>

              {/* 备份目录 */}
              <div className="pt-3 border-t border-chest-100 dark:border-chest-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Archive size={16} className="text-chest-400" />
                    <h4 className="text-sm font-medium text-taupe dark:text-parchment/60">
                      {t('settings.backupHistory')}
                    </h4>
                  </div>
                  <button
                    onClick={() => refetchBackups()}
                    className="text-chest-500 dark:text-amber-400 hover:bg-chest-500/10 rounded p-1 transition-colors"
                    aria-label="refresh"
                  >
                    <RefreshCw size={14} className={backupsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                {backupsLoading ? (
                  <div className="text-center py-6 text-sm text-taupe/60 dark:text-parchment/40">
                    <Loader2 size={20} className="animate-spin inline mr-2" />
                    {t('common.loading')}
                  </div>
                ) : !backups || backups.length === 0 ? (
                  <div className="text-center py-6 text-sm text-taupe/60 dark:text-parchment/40">
                    {t('settings.backupEmpty')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {backups.map((bk) => (
                      <div
                        key={bk.id}
                        className="flex items-center gap-3 p-3 bg-parchment/5 dark:bg-chest-700/20 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/30 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {bk.source === 'auto' ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              <Clock size={14} />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                              <UploadCloud size={14} />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-charcoal dark:text-parchment truncate">
                            {bk.filename}
                          </div>
                          <div className="text-xs text-taupe/60 dark:text-parchment/40 mt-0.5">
                            {new Date(bk.createdAt).toLocaleString()} ·{' '}
                            {(bk.size / 1024).toFixed(1)} KB · {bk.count}{' '}
                            {t('settings.backupItems')} ·{' '}
                            <span className={bk.source === 'auto' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}>
                              {bk.source === 'auto' ? t('settings.backupSourceAuto') : t('settings.backupSourceManual')}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1">
                          <button
                            onClick={() => handleRestore(bk.id, bk.filename)}
                            disabled={restoringId === bk.id}
                            className="text-chest-500 dark:text-amber-400 hover:bg-chest-500/10 disabled:opacity-50 rounded p-1.5 transition-colors"
                            aria-label="restore"
                            title={t('settings.backupActionRestore')}
                          >
                            {restoringId === bk.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <History size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDownload(bk.id)}
                            className="text-chest-500 dark:text-amber-400 hover:bg-chest-500/10 rounded p-1.5 transition-colors"
                            aria-label="download"
                            title={t('settings.backupActionDownload')}
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
