import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '../lib/react-query';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';

type BackupResult =
  | { kind: 'success'; count: number; timestamp: number; filename?: string; id?: string }
  | { kind: 'failure'; message: string; isStorageDown: boolean }
  | null;

interface BackupItem {
  id: string;
  source: 'auto' | 'manual';
  format: string;
  filename: string;
  size: number;
  count: number;
  createdAt: string;
}

export default function AutoBackupScreen() {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const navigation = useNavigation<any>();

  const [backupFreq, setBackupFreq] = useState<'off' | 'weekly' | 'monthly'>('off');
  const [backupResult, setBackupResult] = useState<BackupResult>(null);

  const userTier = (user as any)?.userTier || 'medium';
  const canUseBackup = userTier === 'heavy' || userTier === 'super';

  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['user-settings-backup'],
    queryFn: async () => {
      const r = await api.get('/users/settings');
      return (r.data.data || r.data) as Record<string, unknown>;
    },
  });

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
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (userSettings) {
      const freq = userSettings.backupFrequency as 'off' | 'weekly' | 'monthly' | undefined;
      if (freq) setBackupFreq(freq);
    }
  }, [userSettings]);

  const saveBackupMutation = useMutation({
    mutationFn: (data: { backupFrequency: string; backupFormat: string }) =>
      api.put('/users/settings', data),
    onSuccess: () => {
      setBackupResult({
        kind: 'success',
        count: 0,
        timestamp: Date.now(),
      });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      setBackupResult({ kind: 'failure', message: msg, isStorageDown: false });
    },
  });

  const [backingUp, setBackingUp] = useState(false);

  // React Query 客户端实例（用于在立即备份成功后刷新备份目录列表）
  const queryClient = useQueryClient();

  // 正在恢复的备份 ID（用于显示旋转图标）
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleImmediateBackup = async () => {
    setBackingUp(true);
    setBackupResult(null);
    try {
      const response = await api.post('/users/backup');
      const result = response.data?.data;
      setBackupResult({
        kind: 'success',
        count: result?.count || 0,
        timestamp: result?.timestamp || Date.now(),
        filename: result?.filename,
        id: result?.id,
      });
      // 刷新备份目录
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      const status = error?.response?.status;
      const isStorageDown = status === 503 || (typeof msg === 'string' && msg.includes('云端存储暂不可用'));
      setBackupResult({ kind: 'failure', message: msg, isStorageDown });
    } finally {
      setBackingUp(false);
    }
  };

  if (!canUseBackup) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('settings.proRequired')}</Text>
          <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>{t('settings.upgradeHint')}</Text>
        </View>
      </View>
    );
  }

  const options: { value: 'off' | 'weekly' | 'monthly'; label: string; icon: string }[] = [
    { value: 'off', label: t('settings.backupOff'), icon: 'close-circle-outline' },
    { value: 'weekly', label: t('settings.backupWeekly'), icon: 'calendar-outline' },
    { value: 'monthly', label: t('settings.backupMonthly'), icon: 'calendar-clear-outline' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: 16, gap: 16 }}>
        {/* Frequency Selection */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.backupFrequency')}</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionRow,
                  {
                    borderColor: backupFreq === opt.value ? colors.primary : colors.border,
                    backgroundColor: backupFreq === opt.value ? colors.primary + '12' : 'transparent',
                  },
                ]}
                onPress={() => setBackupFreq(opt.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={20}
                  color={backupFreq === opt.value ? colors.primary : colors.textTertiary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    { color: backupFreq === opt.value ? colors.primary : colors.text },
                  ]}
                >
                  {opt.label}
                </Text>
                <Ionicons
                  name={backupFreq === opt.value ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={backupFreq === opt.value ? colors.primary : colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{t('settings.backupAutoFormat')}</Text>
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>{t('settings.backupRetainHint')}</Text>
          </View>
        </View>

        {/* 立即备份到云端 */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>立即备份</Text>
          <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 6 }}>将收藏、分组、标签等数据上传至云端存储</Text>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
            onPress={handleImmediateBackup}
            disabled={backingUp}
            activeOpacity={0.8}
          >
            {backingUp ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>立即备份</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 备份结果内嵌展示（不依赖 Alert，用户不会错过） */}
          {backupResult && (
            <View
              style={[
                styles.resultCard,
                {
                  backgroundColor: backupResult.kind === 'success' ? colors.success + '12' : colors.danger + '12',
                  borderColor: backupResult.kind === 'success' ? colors.success + '40' : colors.danger + '40',
                },
              ]}
            >
              {backupResult.kind === 'success' ? (
                <>
                  <View style={styles.resultHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={[styles.resultTitle, { color: colors.success }]}>
                      {t('settings.backupExportSuccess')}
                    </Text>
                  </View>
                  {backupResult.count > 0 && (
                    <Text style={[styles.resultText, { color: colors.text }]}>
                      {t('settings.backupExportResult', { count: backupResult.count })}
                    </Text>
                  )}
                  <Text style={[styles.resultText, { color: colors.textTertiary }]}>
                    {t('settings.backupExportTime', {
                      time: new Date(backupResult.timestamp).toLocaleString(),
                    })}
                  </Text>
                  <Text style={[styles.resultText, { color: colors.textTertiary, marginTop: 4 }]}>
                    {t('settings.backupViewInSettings')}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.resultHeader}>
                    <Ionicons
                      name={backupResult.isStorageDown ? 'cloud-offline-outline' : 'close-circle'}
                      size={20}
                      color={colors.danger}
                    />
                    <Text style={[styles.resultTitle, { color: colors.danger }]}>
                      {t('settings.backupExportFailed')}
                    </Text>
                  </View>
                  <Text style={[styles.resultText, { color: colors.text }]}>
                    {backupResult.message}
                  </Text>
                  {backupResult.isStorageDown && (
                    <TouchableOpacity
                      style={[styles.resultAction, { borderColor: colors.primary }]}
                      onPress={() => navigation.navigate('Export' as never)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="download-outline" size={16} color={colors.primary} />
                      <Text style={[styles.resultActionText, { color: colors.primary }]}>
                        去导出
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={() =>
            saveBackupMutation.mutate({ backupFrequency: backupFreq, backupFormat: 'json' })
          }
          disabled={saveBackupMutation.isPending || settingsLoading}
          activeOpacity={0.8}
        >
          {saveBackupMutation.isPending || settingsLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 备份目录：自动/手动备份统一列表 */}
      <View style={[styles.card, { backgroundColor: colors.card, marginTop: 16 }]}>
        <View style={styles.backupListHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            {t('settings.backupHistory')}
          </Text>
          <TouchableOpacity
            onPress={() => refetchBackups()}
            activeOpacity={0.6}
            style={{ padding: 4 }}
          >
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {backupsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
        ) : !backups || backups.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Ionicons name="archive-outline" size={36} color={colors.textTertiary} />
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 6 }}>
              {t('settings.backupEmpty')}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 8 }}>
            {backups.map((bk) => (
              <View
                key={bk.id}
                style={[
                  styles.backupItem,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <View style={styles.backupItemIcon}>
                  <Ionicons
                    name={restoringId === bk.id ? 'sync' : bk.source === 'auto' ? 'sync' : 'cloud-upload'}
                    size={20}
                    color={restoringId === bk.id ? colors.primary : bk.source === 'auto' ? colors.primary : colors.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.backupItemName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {bk.filename}
                  </Text>
                  <Text style={[styles.backupItemMeta, { color: colors.textTertiary }]}>
                    {new Date(bk.createdAt).toLocaleString()} ·{' '}
                    {(bk.size / 1024).toFixed(1)} KB · {bk.count}{' '}
                    {t('settings.backupItems')}
                  </Text>
                </View>
                {/* 恢复按钮 - 内嵌可见图标，避免依赖 Alert.alert 造成部分场景闪退 */}
                <TouchableOpacity
                  style={[styles.backupActionBtn, { backgroundColor: colors.primary + '14' }]}
                  onPress={() => {
                    Alert.alert(
                      t('settings.backupRestoreConfirmTitle'),
                      t('settings.backupRestoreConfirmDesc'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('settings.backupActionRestore'),
                          onPress: async () => {
                            try {
                              setRestoringId(bk.id);
                              const r = await api.post(`/backups/${bk.id}/restore`);
                              const s = r.data?.data || {};
                              Alert.alert(
                                t('settings.backupRestoreSuccess'),
                                `${t('settings.backupRestoredTags')}: ${s.tagsCreated || 0}\n${t('settings.backupRestoredLists')}: ${s.listsCreated || 0}\n${t('settings.backupRestoredCollections')}: ${s.collectionsCreated || 0}\n${t('settings.backupSkippedCollections')}: ${s.collectionsSkipped || 0}`
                              );
                              queryClient.invalidateQueries({ queryKey: ['backups'] });
                              queryClient.invalidateQueries({ queryKey: ['collections'] });
                              queryClient.invalidateQueries({ queryKey: ['tags'] });
                              queryClient.invalidateQueries({ queryKey: ['lists'] });
                            } catch (err: any) {
                              const msg =
                                err?.response?.data?.message ||
                                err?.response?.data?.error ||
                                err?.message ||
                                t('common.operationFailed');
                              Alert.alert(t('settings.backupRestoreFailed'), msg);
                            } finally {
                              setRestoringId(null);
                            }
                          },
                        },
                      ]
                    );
                  }}
                  disabled={restoringId === bk.id}
                  activeOpacity={0.6}
                >
                  {restoringId === bk.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
                {/* 下载按钮 - 获取临时下载链接 */}
                <TouchableOpacity
                  style={[styles.backupActionBtn, { backgroundColor: colors.secondaryBg }]}
                  onPress={async () => {
                    try {
                      const r = await api.get(`/backups/${bk.id}/download`);
                      const data = r.data.data;
                      if (data?.url) {
                        const { Linking } = require('react-native');
                        await Linking.openURL(data.url).catch(() => {});
                      }
                    } catch {
                      // 下载失败静默
                    }
                  }}
                  activeOpacity={0.6}
                >
                  <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyCard: {
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  resultAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  backupListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backupActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupItemIcon: {
    width: 32,
    alignItems: 'center',
  },
  backupItemName: {
    fontSize: 13,
    fontWeight: '500',
  },
  backupItemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
});
