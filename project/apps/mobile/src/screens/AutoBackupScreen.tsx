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
import { useMutation, useQuery } from '../lib/react-query';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';

export default function AutoBackupScreen() {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const { t } = useI18n();

  const [backupFreq, setBackupFreq] = useState<'off' | 'weekly' | 'monthly'>('off');

  const userTier = (user as any)?.userTier || 'medium';
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
    mutationFn: (data: { backupFrequency: string; backupFormat: string }) =>
      api.put('/users/settings', data),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('settings.backupSaved'));
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      Alert.alert(t('common.error'), msg);
    },
  });

  const [backingUp, setBackingUp] = useState(false);

  const handleImmediateBackup = async () => {
    setBackingUp(true);
    try {
      const response = await api.post('/users/backup');
      const result = response.data?.data;
      Alert.alert(
        t('common.success'),
        `备份成功！\n共备份 ${result?.count || 0} 条收藏\n时间：${new Date(result?.timestamp || Date.now()).toLocaleString()}`
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      const status = error?.response?.status;
      if (status === 503 || msg.includes('云端存储暂不可用')) {
        Alert.alert(
          t('common.hint'),
          '云端备份功能暂不可用，服务器存储服务未配置。请使用「数据导出」功能手动导出数据到本地。',
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: '去导出', onPress: () => {
              const { useNavigation } = require('@react-navigation/native');
              const nav = useNavigation();
              nav.navigate('Export' as never);
            }},
          ]
        );
      } else {
        Alert.alert(t('common.error'), msg);
      }
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
});
