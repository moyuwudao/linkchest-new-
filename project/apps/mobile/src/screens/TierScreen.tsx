import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';

interface TierData {
  tier: string;
  planNameZh: string;
  planNameEn: string;
  subscription: { status: string; expiresAt: string | null; source: string | null } | null;
  limits: Record<string, number>;
  usage: Record<string, number>;
  benefits: string[];
  allTiers: Array<{
    key: string; nameZh: string; nameEn: string; description?: string;
    limits: Record<string, number>; pricing: any; benefits: string[];
  }>;
}

const limitIcons: Record<string, string> = {
  collections: 'bookmark-outline',
  tags: 'pricetag-outline',
  lists: 'folder-outline',
  shares: 'share-social-outline',
  shareItems: 'link-outline',
  coverImages: 'image-outline',
  maxItemsPerShare: 'cube-outline',
  dailyImportLimit: 'download-outline',
};
const limitKeyMap: Record<string, string> = {
  collections: 'tier.collections',
  tags: 'tier.tags',
  lists: 'tier.lists',
  shares: 'tier.shares',
  shareItems: 'tier.shareItems',
  coverImages: 'tier.coverImages',
  maxItemsPerShare: 'tier.maxItemsPerShare',
  dailyImportLimit: 'tier.dailyImportLimit',
};

function getLimitKeys(allTiers: Array<{ limits?: Record<string, number> }>) {
  const keys = Array.from(new Set(allTiers.flatMap(t => Object.keys(t.limits || {}))));
  // v3.0: 当前套餐页展示所有配额（含使用情况）
  const priority = ['collections', 'tags', 'lists', 'shares', 'shareItems', 'coverImages', 'maxItemsPerShare', 'dailyImportLimit'];
  const prioritySet = new Set(priority);
  return [
    ...priority.filter(k => keys.includes(k)),
    ...keys.filter(k => !prioritySet.has(k)),
  ];
}

export default function TierScreen() {
  const navigation = useNavigation();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const [data, setData] = useState<TierData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api.get('/tiers/me');
      setData(res.data?.data || res.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  const usage: Record<string, number> = data?.usage || {};
  const tierName = locale === 'zh' ? data?.planNameZh : data?.planNameEn;
  const tierColor = (k: string) => ({ medium: '#E5E7EB', heavy: '#1B2A4A', super: '#C8956C' }[k] || colors.primary);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (!data) return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ color: colors.textTertiary }}>{t('common.noData')}</Text>
      <TouchableOpacity onPress={loadData} style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primaryBg, borderRadius: 8 }}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );

  const limitKeys = getLimitKeys(data.allTiers);
  const currentTier = data.allTiers.find(t => t.key === data.tier);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ margin: 12, padding: 18, borderRadius: 12, backgroundColor: colors.card, borderWidth: 2, borderColor: tierColor(data.tier) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: tierColor(data.tier), justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="trophy-outline" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{tierName}</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.warning + '30' }}>
                <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '600' }}>{t('tier.current')}</Text>
              </View>
            </View>
            {data.subscription?.expiresAt && (
              <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>
                {new Date(data.subscription.expiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')} {t('tier.expires')}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('TierUpgrade' as any)}
          style={{ marginTop: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Ionicons name="flash" size={18} color={colors.headerText} />
          <Text style={{ color: colors.headerText, fontSize: 15, fontWeight: '600' }}>{t('tier.upgrade')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ margin: 12, marginTop: 4, borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 13, color: colors.textTertiary, fontWeight: '600' }}>{t('tier.limits')}</Text>
        </View>
        {limitKeys.map(key => {
          const limit = data.limits?.[key] ?? 0;
          const used = usage[key] || 0;
          const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
          return (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Ionicons name={limitIcons[key] as any} size={18} color={colors.textTertiary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, color: colors.text }}>{t(limitKeyMap[key])}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{used} / {limit === -1 || limit === 999999 ? '∞' : limit}</Text>
                </View>
                <View style={{ height: 4, backgroundColor: colors.borderLight, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.warning, borderRadius: 2 }} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {currentTier?.benefits && currentTier.benefits.length > 0 && (
        <View style={{ margin: 12, marginTop: 4, borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 13, color: colors.textTertiary, fontWeight: '600' }}>{t('tier.benefits')}</Text>
          </View>
          {currentTier.benefits.map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i < currentTier.benefits.length - 1 ? 1 : 0, borderBottomColor: colors.border, gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={{ fontSize: 14, color: colors.text }}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ margin: 12, marginTop: 4, borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 13, color: colors.textTertiary, fontWeight: '600' }}>{t('tier.comparePlans')}</Text>
        </View>
        {data.allTiers.filter(t => t.key !== data.tier).map((tier, idx, arr) => (
          <TouchableOpacity key={tier.key} onPress={() => navigation.navigate('TierUpgrade' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: tierColor(tier.key), justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name="trophy-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{locale === 'zh' ? tier.nameZh : tier.nameEn}</Text>
              {tier.description ? <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>{tier.description}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
