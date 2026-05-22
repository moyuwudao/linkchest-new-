import React, { useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { usePressableScale } from '../lib/animations';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { getPlatformName, getPlatformColor, getPlatformIcon, getPlatformConfig, buildDeepLink } from '../lib/platforms';
import { useThemeStore } from '../store/theme';
import { useI18n, getListPathDisplayName } from '../lib/i18n';
import { CollectionDetailSkeleton } from '../components/SkeletonComponents';
import { logEvent } from '../lib/analytics';
import LazyImage from '../components/LazyImage';
import StarRating from '../components/StarRating';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function ScaleButton({ children, style, onPress, disabled, activeOpacity = 0.85 }: { children: React.ReactNode; style?: any; onPress?: () => void; disabled?: boolean; activeOpacity?: number }) {
  const { scaleValue, onPressIn, onPressOut } = usePressableScale(1, 0.97);
  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[{ transform: [{ scale: scaleValue }] }, style]}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
}

interface Collection {
  id: string;
  url: string;
  title: string;
  coverImage: string | null;
  coverStrategy?: string | null;
  platform: string;
  note: string | null;
  tags?: { id: string; name: string }[];
  lists?: { id: string; name: string }[];
  createdAt: string;
  rating?: number | null;
  pageType?: string | null;
}

// 页面类型图标映射 - 与编辑页保持一致
const PAGE_TYPE_ICONS: Record<string, string> = {
  home: 'home-outline',
  detail: 'document-text-outline',
  list: 'list-outline',
  search: 'search-outline',
  navigation: 'compass-outline',
  document: 'book-outline',
  download: 'download-outline',
  other: 'ellipsis-horizontal-outline',
};

// 页面类型名称映射 - 与编辑页保持一致
const PAGE_TYPE_NAMES: Record<string, string> = {
  home: '主页',
  detail: '详情页',
  list: '列表页',
  search: '搜索页',
  navigation: '导航页',
  document: '文档页',
  download: '下载页',
  other: '其他',
};

export default function CollectionDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();
  const { id } = route.params as { id: string };

  // 收藏详情页保留返回按钮
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.text]);

  useFocusEffect(useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['collection', id] });
  }, [queryClient, id]));

  const { data: collection, isLoading, error } = useQuery({
    queryKey: ['collection', id],
    queryFn: async () => {
      const response = await api.get(`/collections/${id}`);
      const data = response.data.data || response.data;
      return data as Collection;
    },
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/collections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      logEvent('delete_collection');
      Alert.alert(t('common.success'), t('collection.detail.deleted'));
      navigation.goBack();
    },
  });

  const ratingMutation = useMutation({
    mutationFn: (rating: number | null) => api.patch(`/collections/${id}`, { rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] });
    },
  });

  const handleRatingChange = (rating: number | null) => {
    ratingMutation.mutate(rating);
  };

  const openUrl = async () => {
    if (collection?.url) {
      const platformConfig = getPlatformConfig(collection.platform);

      if (platformConfig?.appSchemes && platformConfig.appSchemes.length > 0) {
        const deepLink = buildDeepLink(collection.url, collection.platform);
        if (deepLink) {
          try {
            const supported = await Linking.canOpenURL(deepLink);
            if (supported) {
              await Linking.openURL(deepLink);
              return;
            }
          } catch {
            // Deep Link 不可用，fallback 到网页
          }
        }
      }

      try {
        await Linking.openURL(collection.url);
        logEvent('open_link', { platform: collection.platform });
      } catch {
        Alert.alert(t('common.hint'), t('share.view.openFailed'));
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(t('common.confirm'), t('collection.detail.deleteConfirm', { title: collection?.title || '' }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('EditCollection' as never, { id, mode: 'edit' } as never);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <CollectionDetailSkeleton colors={colors} />
      </View>
    );
  }

  if (error || !collection) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.dangerBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
        </View>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 6, textAlign: 'center' }}>
          {t('common.error')}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
          {error ? t('collection.loadFailed') : t('collection.notExist')}
        </Text>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{t('collection.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const platformColor = getPlatformColor(collection.platform);
  const pageType = collection.pageType || 'detail';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 封面 */}
      <LazyImage
        uri={collection.coverStrategy === 'brand' ? null : collection.coverImage}
        style={{ width: '100%', aspectRatio: 16 / 9 }}
        fallbackPlatform={collection.platform}
        showGradientFallback={collection.coverStrategy === 'brand'}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}>
        {/* 标题 */}
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 }} numberOfLines={2}>{collection.title}</Text>

        {/* 平台 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name={getPlatformIcon(collection.platform) as any} size={16} color={platformColor} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: platformColor + '15' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: platformColor }}>
              {getPlatformName(collection.platform)}
            </Text>
          </View>
        </View>

        {/* 链接 */}
        <TouchableOpacity onPress={openUrl} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, color: colors.textSecondary }} numberOfLines={1}>{collection.url}</Text>
        </TouchableOpacity>

        {/* 页面类型 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name={PAGE_TYPE_ICONS[pageType] as any} size={16} color={colors.primary} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.primaryBg }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
              {PAGE_TYPE_NAMES[pageType] || '其他'}
            </Text>
          </View>
        </View>

        {/* 评分 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name="star-outline" size={16} color={colors.textTertiary} />
          <StarRating
            value={collection.rating || null}
            onChange={handleRatingChange}
            size={20}
          />
        </View>

        {/* 标签 */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
          <Ionicons name="pricetag-outline" size={16} color={colors.textTertiary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {(collection.tags?.length ?? 0) > 0 ? (
              <>
                {(collection.tags || []).slice(0, 5).map((tag) => (
                  <View key={tag.id} style={{ backgroundColor: colors.tagBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: colors.tagText, fontSize: 12 }}>#{tag.name}</Text>
                  </View>
                ))}
                {(collection.tags || []).length > 5 && (
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>+{(collection.tags || []).length - 5}</Text>
                )}
              </>
            ) : (
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>-</Text>
            )}
          </View>
        </View>

        {/* 分组 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name="folder-open-outline" size={16} color={colors.textTertiary} />
          <Text style={{ fontSize: 13, color: colors.textSecondary }} numberOfLines={1}>
            {(collection.lists?.length ?? 0) > 0
              ? `${getListPathDisplayName(collection.lists![0] as any, t)}${(collection.lists || []).length > 1 ? ` +${(collection.lists || []).length - 1}` : ''}`
              : '-'
            }
          </Text>
        </View>

        {/* 添加时间 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>
            {new Date(collection.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* 备注 */}
        {collection.note && (
          <View style={{ backgroundColor: colors.secondaryBg, padding: 10, borderRadius: 6, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }} numberOfLines={3}>{collection.note}</Text>
          </View>
        )}

        {/* 打开链接按钮 */}
        <ScaleButton style={{ backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, gap: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }} onPress={openUrl}>
          <Ionicons name="open-outline" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{t('collection.detail.openLink')}</Text>
        </ScaleButton>

        {/* 编辑/删除按钮 */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <ScaleButton
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, borderWidth: 1, gap: 5, borderColor: colors.primary, backgroundColor: colors.primaryBg }}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '500' }}>{t('collection.detail.edit')}</Text>
          </ScaleButton>

          <ScaleButton
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, borderWidth: 1, gap: 5, borderColor: colors.danger, backgroundColor: colors.dangerBg }}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '500' }}>{t('collection.detail.delete')}</Text>
          </ScaleButton>
        </View>
      </ScrollView>
    </View>
  );
}
