import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '../lib/react-query';
import { api } from '../lib/api';
import { getPlatformIcon, PLATFORMS } from '../lib/platforms';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { StatsSkeleton } from '../components/SkeletonComponents';

interface PlatformStat {
  platform: string;
  name: string;
  color: string;
  count: number;
}

export default function PlatformStatsScreen() {
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['platformStats'],
    queryFn: async () => {
      const response = await api.get('/stats/platforms');
      return response.data.data as PlatformStat[];
    },
  });

  const totalCount = stats?.reduce((sum, s) => sum + s.count, 0) || 0;
  const maxCount = stats?.length ? stats[0].count : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginLeft: 12, marginBottom: 8 }}>{t('platform.distribution')}</Text>
      <View style={{ backgroundColor: colors.card, marginHorizontal: 12, marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <StatsSkeleton colors={colors} />
        ) : stats && stats.length > 0 ? (
          stats.map((stat, index) => {
            const percentage = totalCount > 0 ? (stat.count / totalCount * 100) : 0;
            const barWidth = maxCount > 0 ? (stat.count / maxCount * 100) : 0;
            return (
              <View key={stat.platform} style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: index < stats.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Ionicons
                      name={getPlatformIcon(stat.platform) as any}
                      size={20}
                      color={stat.color}
                    />
                    <Text style={{ fontSize: 15, color: colors.text, fontWeight: '500' }} numberOfLines={1}>{stat.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{stat.count}</Text>
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>{percentage.toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={{ height: 8, backgroundColor: colors.secondaryBg, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${barWidth}%`, height: '100%', borderRadius: 4, backgroundColor: stat.color }} />
                </View>
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="stats-chart-outline" size={32} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('platform.noData')}</Text>
            <Text style={{ fontSize: 14, color: colors.textTertiary }}>开始收集收藏后即可查看平台分布</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
