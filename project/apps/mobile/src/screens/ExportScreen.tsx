import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { api, getPublicBaseUrl } from '../lib/api';

type ExportFormat = 'json' | 'csv' | 'html';

interface FormatOption {
  key: ExportFormat;
  icon: string;
  ext: string;
  mimeType: string;
}

interface DownloadLimitStatus {
  currentCount: number;
  limit: number;
  remaining: number;
  reached: boolean;
  isLastChance: boolean;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { key: 'json', icon: 'code-slash-outline', ext: 'json', mimeType: 'application/json' },
  { key: 'csv', icon: 'grid-outline', ext: 'csv', mimeType: 'text/csv' },
  { key: 'html', icon: 'globe-outline', ext: 'html', mimeType: 'text/html' },
];

export default function ExportScreen() {
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [limitStatus, setLimitStatus] = useState<DownloadLimitStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 加载下载限制状态
  const loadLimitStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api.get('/collections/export-status');
      setLimitStatus(response.data);
    } catch (err) {
      // 静默失败，保留上一次状态
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 页面加载时获取限制状态
  useEffect(() => {
    loadLimitStatus();
  }, [loadLimitStatus]);

  // 移动端导出策略：先获取一次性下载 token，再用 FileSystem.downloadAsync 下载到本地
  // 解决 Linking.openURL 在 Android 上无法触发浏览器下载的问题
  const handleExport = async (format: ExportFormat) => {
    const opt = FORMAT_OPTIONS.find(o => o.key === format)!;
    setExporting(format);
    try {
      // 1. 向后端请求短期下载 token（同时返回当前下载限制状态）
      const response = await api.post(`/collections/export-token?format=${format}`);
      const { token, currentCount, limit, remaining, isLastChance } = response.data || {};
      if (!token) {
        throw new Error('Failed to get download token');
      }

      // 2. 拼接公开下载 URL
      const baseUrl = getPublicBaseUrl();
      const downloadUrl = `${baseUrl}/api/collections/export-download?token=${encodeURIComponent(token)}&format=${format}`;

      // 3. 第 4 次下载时弹出友好提示
      if (isLastChance) {
        await new Promise<void>((resolve, reject) => {
          Alert.alert(
            t('export.lastChanceTitle') || '提示',
            t('export.lastChanceMsg') || `今日下载次数超过4次，今天还剩 ${remaining} 次下载机会，是否继续？`,
            [
              { text: t('common.cancel') || '取消', style: 'cancel', onPress: () => { resolve(); return; } },
              {
                text: t('common.confirm') || '继续下载',
                onPress: () => resolve(),
              },
            ]
          );
        });
      }

      // 4. 使用 FileSystem.downloadAsync 下载到本地
      const fileName = `linkchest-export.${opt.ext}`;
      const localUri = FileSystem.documentDirectory + fileName;

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // 5. 用系统默认应用打开下载的文件（触发"分享/打开"菜单）
      const canOpen = await Linking.canOpenURL(downloadResult.uri);
      if (canOpen) {
        await Linking.openURL(downloadResult.uri);
      }

      Alert.alert(
        t('common.success'),
        t('export.successMsg') || '导出成功'
      );

      // 6. 更新本地限制状态（乐观更新：消耗一次机会）
      setLimitStatus((prev) => {
        if (!prev) return prev;
        const next = prev.currentCount + 1;
        return {
          currentCount: next,
          limit: prev.limit,
          remaining: Math.max(0, prev.limit - next),
          reached: next >= prev.limit,
          isLastChance: next === prev.limit - 1,
        };
      });
    } catch (error: any) {
      // HTTP 429: 达到下载上限
      if (error?.response?.status === 429) {
        const data = error.response.data || {};
        Alert.alert(
          t('export.limitReachedTitle') || '已达今日下载上限',
          data.message || t('export.limitReachedMsg') || '今日下载次数已达上限，请明天再试',
          [{ text: t('common.confirm') || '我知道了' }]
        );
        // 刷新限制状态
        setLimitStatus((prev) => prev ? { ...prev, reached: true, remaining: 0 } : prev);
        return;
      }
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setExporting(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadLimitStatus} tintColor={colors.primary} />
      }
    >
      <View style={{ padding: 16, gap: 16 }}>
        {/* 下载限制提示卡片 */}
        <View
          style={{
            backgroundColor: limitStatus?.reached
              ? colors.error + '15'
              : limitStatus?.isLastChance
                ? colors.warning + '15'
                : colors.primary + '10',
            borderColor: limitStatus?.reached
              ? colors.error + '40'
              : limitStatus?.isLastChance
                ? colors.warning + '40'
                : colors.primary + '30',
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Ionicons
            name={limitStatus?.reached ? 'lock-closed-outline' : 'cloud-download-outline'}
            size={20}
            color={limitStatus?.reached ? colors.error : limitStatus?.isLastChance ? colors.warning : colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
              {limitStatus?.reached
                ? t('export.limitReachedTitle') || '今日已达下载上限'
                : limitStatus?.isLastChance
                  ? t('export.lastChanceTitle') || '今日下载次数超过 4 次'
                  : t('export.dailyLimitTitle') || '每日下载限制'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
              {t('export.dailyLimitDesc', {
                current: limitStatus?.currentCount ?? 0,
                limit: limitStatus?.limit ?? 5,
                remaining: limitStatus?.remaining ?? 5,
              }) || `今日已下载 ${limitStatus?.currentCount ?? 0}/${limitStatus?.limit ?? 5} 次，剩余 ${limitStatus?.remaining ?? 5} 次`}
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('export.formatGroupA')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
            {t('export.formatGroupADesc')}
          </Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <FormatButton
              icon={FORMAT_OPTIONS[0].icon}
              title="JSON"
              desc={t('export.jsonDesc')}
              loading={exporting === 'json'}
              disabled={limitStatus?.reached}
              colors={colors}
              onPress={() => handleExport('json')}
            />
            <FormatButton
              icon={FORMAT_OPTIONS[2].icon}
              title="HTML"
              desc={t('export.htmlDesc')}
              loading={exporting === 'html'}
              disabled={limitStatus?.reached}
              colors={colors}
              onPress={() => handleExport('html')}
            />
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('export.formatGroupB')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
            {t('export.formatGroupBDesc')}
          </Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <FormatButton
              icon={FORMAT_OPTIONS[1].icon}
              title="CSV"
              desc={t('export.csvDesc')}
              loading={exporting === 'csv'}
              disabled={limitStatus?.reached}
              colors={colors}
              onPress={() => handleExport('csv')}
            />
          </View>
        </View>

        <View style={{ backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>{t('export.hintTitle')}</Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>{t('export.hintDesc')}</Text>
            <Text style={{ fontSize: 12, color: colors.warning, marginTop: 8 }}>{t('export.importHint')}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function FormatButton({ icon, title, desc, loading, disabled, colors, onPress }: {
  icon: string;
  title: string;
  desc: string;
  loading: boolean;
  disabled?: boolean;
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: disabled ? colors.border + '60' : colors.border,
        backgroundColor: 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.7}
    >
      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{desc}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name={disabled ? 'lock-closed-outline' : 'download-outline'} size={22} color={disabled ? colors.textTertiary : colors.primary} />
      )}
    </TouchableOpacity>
  );
}
