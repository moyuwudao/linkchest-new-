import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share as RNShare,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';

type ExportFormat = 'json' | 'csv' | 'html';

interface FormatOption {
  key: ExportFormat;
  icon: string;
  ext: string;
  mimeType: string;
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

  const handleExport = async (format: ExportFormat) => {
    const opt = FORMAT_OPTIONS.find(o => o.key === format)!;
    setExporting(format);
    try {
      const response = await api.get(`/collections/export?format=${format}`, {
        responseType: format === 'json' ? 'json' : 'text',
      });

      let content: string;
      if (format === 'json') {
        // 如果后端返回了包装对象，提取 data 字段；否则直接使用
        const exportData = response.data?.data || response.data;
        content = JSON.stringify(exportData, null, 2);
      } else {
        content = typeof response.data === 'string' ? response.data : String(response.data);
      }

      const filename = `linkchest-export.${opt.ext}`;
      const filePath = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await RNShare.share({
          message: format === 'csv' ? content : content.substring(0, 60000),
          title: t('export.shareTitle'),
        });

        Alert.alert(
          t('common.success'),
          t('export.successMsg') + '\n\n' + t('export.filePath') + filePath
        );
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setExporting(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, gap: 16 }}>
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
              colors={colors}
              onPress={() => handleExport('json')}
            />
            <FormatButton
              icon={FORMAT_OPTIONS[2].icon}
              title="HTML"
              desc={t('export.htmlDesc')}
              loading={exporting === 'html'}
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
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function FormatButton({ icon, title, desc, loading, colors, onPress }: {
  icon: string;
  title: string;
  desc: string;
  loading: boolean;
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
        borderColor: colors.border,
        backgroundColor: 'transparent',
      }}
      onPress={onPress}
      disabled={loading}
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
        <Ionicons name="download-outline" size={22} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}
