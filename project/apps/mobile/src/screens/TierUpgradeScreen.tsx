import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, getBaseDomain } from '../lib/api';
import { isChinaMarket } from '../lib/market';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';

interface TierConfig {
  key: string; nameZh: string; nameEn: string; description?: string;
  limits: Record<string, number | boolean>; pricing: any; benefits: string[];
  isActive?: boolean;
  sortOrder?: number;
}

interface TierData {
  tier: string;
  planNameZh: string;
  planNameEn: string;
  heavyExpiresAt: string | null;
  superExpiresAt: string | null;
  subscription: {
    status: string;
    expiresAt: string | null;
    source: string | null;
  } | null;
  allTiers: TierConfig[];
}

const limitKeyMap: Record<string, string> = {
  collections: 'tier.collections',
  tags: 'tier.tags',
  lists: 'tier.lists',
  shares: 'tier.shares',
  shareItems: 'tier.shareItems',
  coverImages: 'tier.coverImages',
  coverImagesDaily: 'tier.coverImagesDaily',
  maxItemsPerShare: 'tier.maxItemsPerShare',
  dailyImportLimit: 'tier.dailyImportLimit',
  metadataDailyLimit: 'tier.metadataDailyLimit',
  trashRetentionDays: 'tier.trashRetentionDays',
};

function getLimitKeys(allTiers: Array<{ limits?: Record<string, number | boolean> }>) {
  const keys = Array.from(new Set(allTiers.flatMap(t => Object.keys(t.limits || {}))));
  // v3.0: 只展示有区分度的数值配额项，过滤掉 boolean 功能开关和功能性无限项
  const distinctKeys = keys.filter(k => {
    const values = allTiers.map(t => t.limits?.[k]).filter(v => v !== undefined);
    // 排除 boolean 类型的功能开关字段
    if (values.some(v => typeof v === 'boolean')) return false;
    const uniqueValues = new Set(values);
    return uniqueValues.size > 1;
  });
  const priority = ['shares', 'maxItemsPerShare', 'dailyImportLimit', 'coverImagesDaily', 'metadataDailyLimit', 'trashRetentionDays'];
  const prioritySet = new Set(priority);
  return [
    ...priority.filter(k => distinctKeys.includes(k)),
    ...distinctKeys.filter(k => !prioritySet.has(k)),
  ];
}

const featureFlagKeys = ['sharePassword', 'shareStats', 'shareRating', 'shareViews'];

function getFeatureFlags(tier: TierConfig) {
  return featureFlagKeys.map(key => ({
    key,
    enabled: !!tier.limits?.[key],
    labelKey: `tier.${key}`,
  }));
}

const benefitI18nMap: Record<string, string> = {
  batchops: 'tier.benefitBatchOps',
  '批量操作': 'tier.benefitBatchOps',
  exportpdf: 'tier.benefitExportPdf',
  '导出pdf': 'tier.benefitExportPdf',
  sharestats: 'tier.shareStats',
  '分享访问统计': 'tier.shareStats',
  earlyaccess: 'tier.benefitEarlyAccess',
  '新功能优先体验': 'tier.benefitEarlyAccess',
  sharelayout: 'tier.benefitShareLayout',
  '分享布局': 'tier.benefitShareLayout',
  sharepassword: 'tier.sharePassword',
  '分享密码保护': 'tier.sharePassword',
  prioritysupport: 'tier.benefitPrioritySupport',
  '优先技术支持': 'tier.benefitPrioritySupport',
  customsharecover: 'tier.benefitCustomShareCover',
  '自定义分享封面': 'tier.benefitCustomShareCover',
};

const hiddenBenefitKeys = ['batchops', 'exportpdf', 'sharestats', 'earlyaccess', 'sharelayout', 'sharepassword', 'prioritysupport', 'customsharecover'];

export default function TierUpgradeScreen({ navigation }: { navigation?: any }) {
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const [data, setData] = useState<TierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paying, setPaying] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try { setLoading(true); const r = await api.get('/tiers/me'); setData(r.data?.data || r.data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }

  const tierColor = (k: string) => ({ medium: '#E5E7EB', heavy: '#1B2A4A', super: '#C8956C' }[k] || colors.primary);

  function fmtPrice(tier: TierConfig) {
    const p = tier.pricing || {};
    const isChina = isChinaMarket();
    const yearlyConfig = p.yearly || {};
    const monthlyConfig = p.monthly || {};

    if (isChina) {
      // 国内市场：读取 cny（人民币分），需要除以 100 转为元
      if (cycle === 'yearly') {
        const cnyPrice = yearlyConfig.cny;
        if (typeof cnyPrice === 'number' && cnyPrice > 0) {
          const yuan = cnyPrice / 100;
          return { amt: Number.isInteger(yuan) ? yuan.toString() : yuan.toFixed(2), symbol: '¥', per: t('tier.perYear') };
        }
      }
      const cnyPrice = monthlyConfig.cny;
      if (typeof cnyPrice === 'number' && cnyPrice > 0) {
        const yuan = cnyPrice / 100;
        return { amt: Number.isInteger(yuan) ? yuan.toString() : yuan.toFixed(2), symbol: '¥', per: t('tier.perMonth') };
      }
      // cny 缺失时不显示（避免显示美元或 0）
      return null;
    } else {
      // 海外市场：读取 usd（美分）
      if (cycle === 'yearly' && yearlyConfig.usd) {
        return { amt: (yearlyConfig.usd / 100).toFixed(2), symbol: '$', per: t('tier.perYear') };
      }
      if (monthlyConfig.usd) {
        return { amt: (monthlyConfig.usd / 100).toFixed(2), symbol: '$', per: t('tier.perMonth') };
      }
    }
    return null;
  }

  function getCurrentTierExpiresAt() {
    if (!data) return null;
    if (data.tier === 'super' && data.superExpiresAt) return data.superExpiresAt;
    if (data.tier === 'heavy' && data.heavyExpiresAt) return data.heavyExpiresAt;
    if (data.subscription?.expiresAt) return data.subscription.expiresAt;
    return null;
  }

  async function handleUpgrade(tierKey: string) {
    // 跳转到原生支付宝支付页（替代 WebView 跳转）
    if (navigation?.navigate) {
      const formattedPrice = fmtPrice(
        (data?.allTiers || []).find((x: any) => x.key === tierKey) || ({ pricing: {} } as any)
      );
      navigation.navigate('AlipayPay', {
        tier: tierKey,
        billingCycle: cycle,
        tierName: tierKey, // 由 AlipayPayScreen 根据 i18n 翻译
        price: formattedPrice,
      });
      return;
    }
    setPaying(true);
    try {
      const baseDomain = getBaseDomain();
      const upgradeUrl = `https://${baseDomain}/tier/upgrade?cycle=${cycle}`;
      const { openBrowserAsync } = await import('expo-web-browser');
      await openBrowserAsync(upgradeUrl);
    } catch {
      Alert.alert(t('common.error'), t('payment.checkoutFailed'));
    } finally {
      setPaying(false);
    }
  }

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
  const sorted = [...data.allTiers]
    .filter(t => t.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, margin: 16 }}>
        {(['monthly', 'yearly'] as const).map(c => (
          <TouchableOpacity key={c} onPress={() => setCycle(c)}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: cycle === c ? colors.primary : colors.secondaryBg }}>
            <Text style={{ color: cycle === c ? colors.headerText : colors.text, fontWeight: '600' }}>{t(`tier.${c}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {sorted.map(tier => {
        const isCurrent = tier.key === data.tier;
        const price = fmtPrice(tier);
        const canUpgrade = tier.key !== 'medium' && !isCurrent;
        const expiresAt = isCurrent ? getCurrentTierExpiresAt() : null;
        return (
          <View key={tier.key} style={{ margin: 12, marginTop: 0, padding: 16, borderRadius: 12, backgroundColor: colors.card, borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? colors.warning : colors.border }}>
            {isCurrent && (
              <View style={{ position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.warning }}>
                <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>{t('tier.current')}</Text>
              </View>
            )}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: tierColor(tier.key), justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="trophy-outline" size={28} color="#fff" />
              </View>
              <Text style={{ marginTop: 10, fontSize: 18, fontWeight: 'bold', color: colors.text }}>{locale === 'zh' ? tier.nameZh : tier.nameEn}</Text>
              {tier.description ? <Text style={{ marginTop: 4, fontSize: 13, color: colors.textTertiary }}>{tier.description}</Text> : null}
              {price ? (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>{price.symbol}{price.amt}</Text>
                  <Text style={{ fontSize: 13, color: colors.textTertiary, marginLeft: 4 }}>{price.per}</Text>
                </View>
              ) : (
                <Text style={{ marginTop: 8, fontSize: 20, fontWeight: 'bold', color: colors.text }}>{t('tier.free')}</Text>
              )}
              {expiresAt && (
                <Text style={{ marginTop: 4, fontSize: 12, color: colors.warning }}>
                  {t('tier.expiresAt', { date: new Date(expiresAt).toLocaleDateString() })}
                </Text>
              )}
            </View>

            {limitKeys.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                {limitKeys.map(key => {
                  const val = tier.limits?.[key] ?? '-';
                  const label = limitKeyMap[key];
                  if (!label) return null;
                  return (
                    <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t(label)}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{val === -1 || val === 999999 ? '∞' : val}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {getFeatureFlags(tier).length > 0 && (
              <View style={{ marginBottom: 12 }}>
                {getFeatureFlags(tier).map((feature) => {
                  const featureLabel = t(feature.labelKey);
                  if (featureLabel === feature.labelKey) return null;
                  return (
                    <View key={feature.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      {feature.enabled ? (
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      ) : (
                        <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                      )}
                      <Text style={{ fontSize: 13, color: feature.enabled ? colors.textSecondary : colors.textTertiary }}>
                        {featureLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {((tier.benefits || []).filter(b => !hiddenBenefitKeys.some(h => b.toLowerCase().includes(h))).length > 0) && (
              <View style={{ marginBottom: 16 }}>
                {(tier.benefits || []).filter(b => !hiddenBenefitKeys.some(h => b.toLowerCase().includes(h))).map((b, i) => {
                  const i18nKey = benefitI18nMap[b] || benefitI18nMap[b.toLowerCase()];
                  const displayText = i18nKey ? t(i18nKey) : b;
                  if (!displayText || displayText.trim() === '') return null;
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{displayText}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {isCurrent ? (
              <View style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: colors.secondaryBg, alignItems: 'center' }}>
                <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>{t('tier.current')}</Text>
              </View>
            ) : canUpgrade ? (
              <TouchableOpacity
                onPress={() => handleUpgrade(tier.key)}
                disabled={paying}
                style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: paying ? 0.6 : 1 }}>
                <Ionicons name="flash" size={16} color={colors.headerText} />
                <Text style={{ color: colors.headerText, fontWeight: '600' }}>{paying ? t('payment.processing') : t('tier.upgrade')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: colors.secondaryBg, alignItems: 'center' }}>
                <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>{t('tier.free')}</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
