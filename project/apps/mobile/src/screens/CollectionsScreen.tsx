import React, { useState, useCallback, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Platform,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Animated,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { getPlatformName, getPlatformIcon, getPlatformColor, getPlatformConfig, buildDeepLink, PLATFORMS } from '../lib/platforms';

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

function getPageTypeInfo(pageType: string | undefined) {
  const pt = pageType || 'detail';
  const icon = PAGE_TYPE_ICONS[pt] || PAGE_TYPE_ICONS.other;
  const name = PAGE_TYPE_NAMES[pt] || PAGE_TYPE_NAMES.other;
  return { icon, name };
}
import { useThemeStore } from '../store/theme';
import { useI18n, getListDisplayName, getListPathDisplayName } from '../lib/i18n';
import { CollectionCardSkeleton, CollectionRowSkeleton } from '../components/SkeletonComponents';
import { usePressableScale } from '../lib/animations';
import LazyImage from '../components/LazyImage';
import StarRating from '../components/StarRating';
import type { DisplayFieldKey, CollectionViews } from '../lib/collectionViewsStorage';
import { useCollectionViews } from '../lib/collectionViewsContext';

// 获取排序后的字段配置
function getSortedFields(views: CollectionViews | undefined, mode: 'mobileGrid' | 'mobileList'): { key: DisplayFieldKey; enabled: boolean }[] {
  if (!views?.[mode]?.fields) {
    return [
      { key: 'cover', enabled: true },
      { key: 'title', enabled: true },
      { key: 'platform', enabled: true },
      { key: 'rating', enabled: true },
      { key: 'pageType', enabled: false },
      { key: 'tags', enabled: true },
      { key: 'lists', enabled: true },
      { key: 'note', enabled: true },
      { key: 'createdAt', enabled: false },
    ];
  }
  return [...views[mode].fields]
    .sort((a, b) => a.order - b.order)
    .map(f => ({ key: f.key, enabled: f.enabled }));
}

type RootStackParamList = {
  Main: undefined;
  Collections: { tagId?: string; listId?: string; tagName?: string; listName?: string };
  CollectionDetail: { id: string };
  AddCollection: { mode?: string };
  EditCollection: { id: string; mode?: string };
};

export type CollectionsRouteProp = RouteProp<RootStackParamList, 'Collections'>;
export type CollectionsNavigationProp = NavigationProp<RootStackParamList>;

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  coverStrategy?: string | null;
  platform: string;
  note: string | null;
  tags?: { id: string; name: string }[];
  lists?: { id: string; name: string }[];
  url: string;
  createdAt: string;
  rating?: number | null;
  pageType?: string;
}

interface List {
  id: string;
  name: string;
}

// Platform badge component: brand color dot with first character
function PlatformDot({ platform }: { platform: string }) {
  const color = getPlatformColor(platform);
  const name = getPlatformName(platform);
  const initial = name ? name.charAt(0) : '?';
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' }}>{initial}</Text>
    </View>
  );
}

interface CollectionItemProps {
  item: Collection;
  colors: any;
  editMode: boolean;
  selected: boolean;
  onPress: () => void;
  onImagePress: () => void;
  onLongPress: () => void;
  t?: any;
  enabledFields?: Set<string>;
}

const CardItem = React.memo(function CardItem({ item, colors, editMode, selected, onPress, onImagePress, onLongPress, t, enabledFields }: CollectionItemProps) {
  const { scaleValue, onPressIn, onPressOut } = usePressableScale(1, 0.97);
  if (item.id === '__placeholder__') {
    return <View style={{ flex: 1, margin: 4 }} />;
  }
  const ef = enabledFields || new Set(['cover', 'title', 'platform', 'rating', 'tags', 'lists', 'note']);
  return (
    <Animated.View style={{ flex: 1, margin: 4, transform: [{ scale: scaleValue }] }}>
      <View
        style={{ backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', borderWidth: editMode && selected ? 2 : 0, borderColor: editMode && selected ? colors.primary : 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
      >
        {editMode && (
          <TouchableOpacity
            style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, backgroundColor: colors.card + 'CC', borderRadius: 12 }}
            onPress={onPress}
          >
            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
        )}
        {ef.has('cover') && (
          <TouchableOpacity onPress={onImagePress} onLongPress={onLongPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9}>
            <LazyImage
              uri={item.coverStrategy === 'brand' ? null : item.coverImage}
              style={{ width: '100%', aspectRatio: 1 }}
              fallbackPlatform={item.platform}
              showGradientFallback={item.coverStrategy === 'brand'}
            />
          </TouchableOpacity>
        )}
        <View style={{ padding: 10, gap: 4 }}>
          <TouchableOpacity onPress={onPress} onLongPress={onLongPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9} style={{ flex: 1 }}>
            {ef.has('title') && (
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, lineHeight: 17 }} numberOfLines={2}>{item.title}</Text>
            )}
            {(ef.has('platform') || ef.has('rating')) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                {ef.has('platform') && (
                  <>
                    <Ionicons name={getPlatformIcon(item.platform) as any} size={11} color={getPlatformColor(item.platform)} />
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>{getPlatformName(item.platform)}</Text>
                  </>
                )}
                {ef.has('rating') && item.rating !== undefined && item.rating !== null && (
                  <StarRating value={item.rating} readonly size={11} />
                )}
              </View>
            )}
            {ef.has('note') && item.note && (
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>{item.note}</Text>
            )}
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
            {ef.has('pageType') && (() => {
              const ptInfo = getPageTypeInfo(item.pageType);
              return (
                <View style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Ionicons name={ptInfo.icon as any} size={8} color={colors.primary} />
                  <Text style={{ fontSize: 8, color: colors.primary }}>{ptInfo.name}</Text>
                </View>
              );
            })()}
            {ef.has('tags') && item.tags?.slice(0, 2).map((tag) => (
              <View key={tag.id} style={{ backgroundColor: colors.tagBg, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3 }}>
                <Text style={{ fontSize: 8, color: colors.tagText }}>#{tag.name}</Text>
              </View>
            ))}
            {ef.has('lists') && item.lists?.slice(0, 1).map((list) => (
              <View key={list.id} style={{ backgroundColor: colors.listTagBg, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Ionicons name="folder-outline" size={7} color={colors.listTagText} />
                <Text style={{ fontSize: 8, color: colors.listTagText }}>{getListDisplayName(list, t)}</Text>
              </View>
            ))}
            {ef.has('createdAt') && item.createdAt && (
              <Text style={{ fontSize: 8, color: colors.textTertiary }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const GridItem = React.memo(function GridItem({ item, colors, editMode, selected, onPress, onImagePress, onLongPress, t, enabledFields }: CollectionItemProps) {
  const { scaleValue, onPressIn, onPressOut } = usePressableScale(1, 0.98);
  const ef = enabledFields || new Set(['cover', 'title', 'platform', 'rating', 'tags', 'lists', 'note']);
  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <View
        style={{ backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, borderWidth: editMode && selected ? 2 : 0, borderColor: editMode && selected ? colors.primary : 'transparent' }}
      >
        {editMode && (
          <TouchableOpacity
            style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, backgroundColor: colors.card + 'CC', borderRadius: 12 }}
            onPress={onPress}
          >
            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={selected ? colors.primary : colors.textTertiary} />
          </TouchableOpacity>
        )}
        {ef.has('cover') && (
          <TouchableOpacity onPress={onImagePress} onLongPress={onLongPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9}>
            <LazyImage
              uri={item.coverStrategy === 'brand' ? null : item.coverImage}
              style={{ width: 120, height: 100 }}
              fallbackPlatform={item.platform}
              showGradientFallback={item.coverStrategy === 'brand'}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onPress} onLongPress={onLongPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9} style={{ flex: 1, padding: 12, flexDirection: 'column', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {ef.has('platform') && <PlatformDot platform={item.platform} />}
            {ef.has('title') && (
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 18 }} numberOfLines={2}>{item.title}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {ef.has('rating') && item.rating !== undefined && item.rating !== null && (
              <StarRating value={item.rating} readonly size={12} />
            )}
            {ef.has('pageType') && (() => {
              const ptInfo = getPageTypeInfo(item.pageType);
              return (
                <View style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name={ptInfo.icon as any} size={10} color={colors.primary} />
                  <Text style={{ fontSize: 10, color: colors.primary }}>{ptInfo.name}</Text>
                </View>
              );
            })()}
            {ef.has('tags') && item.tags?.slice(0, 3).map((tag) => (
              <View key={tag.id} style={{ backgroundColor: colors.tagBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 10, color: colors.tagText }}>#{tag.name}</Text></View>
            ))}
            {ef.has('lists') && item.lists?.slice(0, 2).map((list) => (
              <View key={list.id} style={{ backgroundColor: colors.listTagBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="folder-outline" size={10} color={colors.listTagText} />
                <Text style={{ fontSize: 10, color: colors.listTagText }}>{getListDisplayName(list, t)}</Text>
              </View>
            ))}
            {ef.has('createdAt') && item.createdAt && (
              <Text style={{ fontSize: 10, color: colors.textTertiary }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            )}
          </View>
          {ef.has('note') && item.note ? <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{item.note}</Text> : null}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

export default function CollectionsScreen() {
  const navigation = useNavigation<CollectionsNavigationProp>();
  const route = useRoute<CollectionsRouteProp>();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  // 彻底隐藏收藏页标题栏返回键，添加日志按钮
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerBackVisible: false,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Logs' as never)}
          style={{ marginRight: 16, padding: 4 }}
        >
          <Ionicons name="bug-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.primary]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [filterType, setFilterType] = useState<'tag' | 'list' | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'card'>('card');
  const [sortMode, setSortMode] = useState<'createdAt' | 'rating'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // 视图配置（Context 全局状态）
  const { views: collectionViews } = useCollectionViews();

  const viewConfig = getSortedFields(collectionViews || undefined, viewMode === 'card' ? 'mobileGrid' : 'mobileList');
  const enabledFields = new Set(viewConfig.filter(f => f.enabled).map(f => f.key));
  const [filterPlatforms, setFilterPlatforms] = useState<Set<string>>(new Set());
  const [filterListId, setFilterListId] = useState<string>('');
  const [filterTagId, setFilterTagId] = useState<string>('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<'list' | 'tag'>('list');

  const flatListRef = useRef<FlatList>(null);
  const scrollPositionRef = useRef({ x: 0, y: 0 });

  // 分页状态
  const [page, setPage] = useState(1);
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  // 添加收藏模态框
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSourceListId, setModalSourceListId] = useState<string>('');
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set());

  // 用户已有收藏的平台（用于筛选仅展示已有平台）
  const userPlatforms = useMemo(() => {
    const keys = new Set(allCollections.map(c => c.platform));
    return PLATFORMS.filter(p => keys.has(p.key));
  }, [allCollections]);

  useEffect(() => {
    if (route.params?.tagId) {
      setSelectedTag(route.params.tagId as string);
      setSelectedList(null);
      setFilterLabel(`#${route.params.tagName || t('collection.tag')}`);
      setFilterType('tag');
    } else if (route.params?.listId) {
      setSelectedList(route.params.listId as string);
      setSelectedTag(null);
      setFilterLabel(route.params.listName || t('nav.groups'));
      setFilterType('list');
    }
  }, [route.params]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  const clearFilter = () => {
    setSelectedTag(null);
    setSelectedList(null);
    setFilterLabel('');
    setFilterType(null);
    setFilterPlatforms(new Set());
    setFilterListId('');
    setFilterTagId('');
    setEditMode(false);
    setSelectedIds(new Set());
    setPage(1);
    setAllCollections([]);
  };

  // 重置分页：数据变更后必须回到第1页，避免多页数据重复/残留
  const resetPagination = () => {
    setPage(1);
    setAllCollections([]);
    setHasMore(true);
  };

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['collections', debouncedSearch, selectedTag, selectedList, Array.from(filterPlatforms).sort().join(','), filterListId, filterTagId, sortMode, sortOrder, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedTag) params.append('tagId', selectedTag);
      if (selectedList) params.append('listId', selectedList);
      if (filterListId && !selectedList) params.append('listId', filterListId);
      if (filterTagId && !selectedTag) params.append('tagId', filterTagId);
      params.append('sortBy', sortMode);
      params.append('sortOrder', sortOrder);
      params.append('page', String(page));
      params.append('limit', String(PAGE_SIZE));
      const response = await api.get(`/collections?${params.toString()}`);
      return response.data;
    },
    staleTime: 5000,
    cacheTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  // 分页数据累加 — 基于函数式更新避免 stale 闭包
  useEffect(() => {
    if (!data) return;
    const newCollections = (data.data || []) as Collection[];
    const total = data.pagination?.total || 0;

    if (page === 1) {
      setAllCollections(newCollections);
      setHasMore(newCollections.length < total);
    } else {
      setAllCollections(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const uniqueNew = newCollections.filter(c => !existingIds.has(c.id));
        const merged = [...prev, ...uniqueNew];
        setHasMore(merged.length < total);
        return merged;
      });
    }
  }, [data, page]);

  // 筛选/搜索/排序变化时重置分页
  useEffect(() => {
    setPage(1);
    setAllCollections([]);
    setHasMore(true);
  }, [debouncedSearch, selectedTag, selectedList, filterPlatforms, filterListId, filterTagId, sortMode, sortOrder]);

  // Client-side platform filter (multi-select)
  const collections = filterPlatforms.size > 0
    ? allCollections.filter(c => filterPlatforms.has(c.platform))
    : allCollections;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/collections/${id}`),
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      Alert.alert(t('common.success'), t('collection.detail.deleted'));
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/collections/batch-delete', { ids }),
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setSelectedIds(new Set());
      setEditMode(false);
      Alert.alert(t('common.success'), t('collection.detail.deleted'));
    },
  });

  const removeFromTagMutation = useMutation({
    mutationFn: async ({ collectionId, tagIds }: { collectionId: string; tagIds: string[] }) => {
      const newTagIds = tagIds.filter(tid => tid !== selectedTag);
      await api.put(`/collections/${collectionId}`, { tagIds: newTagIds });
    },
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const removeFromListMutation = useMutation({
    mutationFn: async ({ collectionId, listIds }: { collectionId: string; listIds: string[] }) => {
      const newListIds = listIds.filter(lid => lid !== selectedList);
      if (newListIds.length === 0) {
        const listsRes = await api.get('/lists');
        const lists = listsRes.data.data || listsRes.data;
        let defaultList = lists?.find((l: any) => l.isDefault);
        if (!defaultList) {
          const createRes = await api.post('/lists', { name: t('nav.collections'), description: t('group.management'), isDefault: true });
          defaultList = createRes.data.data || createRes.data;
        }
        newListIds.push(defaultList.id);
      }
      await api.put(`/collections/${collectionId}`, { listIds: newListIds });
    },
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  // 添加到标签
  const addToTagMutation = useMutation({
    mutationFn: async (collectionIds: string[]) => {
      const items = (modalCollections || []) as Collection[];
      await Promise.all(
        collectionIds.map(async cid => {
          const item = items.find(c => c.id === cid);
          if (!item) return;
          const newTagIds = [...(item.tags || []).map(t => t.id), selectedTag!];
          await api.put(`/collections/${cid}`, { tagIds: newTagIds });
        })
      );
    },
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setShowAddModal(false);
      setModalSelectedIds(new Set());
    },
  });

  // 移到分组
  const moveToListMutation = useMutation({
    mutationFn: async (collectionIds: string[]) => {
      await Promise.all(
        collectionIds.map(cid => api.put(`/collections/${cid}`, { listIds: [selectedList!] }))
      );
    },
    onSuccess: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setShowAddModal(false);
      setModalSelectedIds(new Set());
    },
  });

  // 获取模态框中的分组
  // 获取模态框中的分组（仅在需要时请求）
  const { data: modalLists } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      return (response.data.data || response.data) as any[];
    },
    enabled: showFilterModal || showMoveModal || showAddModal,
  });

  // 获取模态框中的标签（仅在需要时请求）
  const { data: modalTags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      return (response.data.data || response.data) as any[];
    },
    enabled: showFilterModal || showMoveModal || showAddModal,
  });

  // 获取模态框中的收藏（根据选择的来源分组）
  const { data: modalCollections } = useQuery({
    queryKey: ['modalCollections', modalSourceListId, selectedTag, selectedList],
    queryFn: async () => {
      if (!modalSourceListId) return [];
      const response = await api.get(`/collections?listId=${modalSourceListId}&limit=100`);
      const items = (response.data.data || response.data) as Collection[];
      if (filterType === 'tag' && selectedTag) {
        return items.filter(c => !(c.tags || []).some(t => t.id === selectedTag));
      }
      if (filterType === 'list' && selectedList) {
        return items.filter(c => !(c.lists || []).some(l => l.id === selectedList));
      }
      return items;
    },
    enabled: showAddModal && !!modalSourceListId,
  });

  useFocusEffect(useCallback(() => {
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'collections' });
    if (scrollPositionRef.current.y > 0 && flatListRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({
          offset: scrollPositionRef.current.y,
          animated: false,
        });
      });
    }
  }, [queryClient]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['collections', debouncedSearch, selectedTag, selectedList, Array.from(filterPlatforms).sort().join(','), filterListId, filterTagId, sortMode, sortOrder, 1],
        queryFn: async () => {
          const params = new URLSearchParams();
          if (debouncedSearch) params.append('search', debouncedSearch);
          if (selectedTag) params.append('tagId', selectedTag);
          if (selectedList) params.append('listId', selectedList);
          if (filterListId && !selectedList) params.append('listId', filterListId);
          if (filterTagId && !selectedTag) params.append('tagId', filterTagId);
          params.append('sortBy', sortMode);
          params.append('sortOrder', sortOrder);
          params.append('page', '1');
          params.append('limit', String(PAGE_SIZE));
          const response = await api.get(`/collections?${params.toString()}`);
          return response.data;
        },
      });
      const newCollections = (result?.data || []) as Collection[];
      const total = result?.pagination?.total || 0;
      setAllCollections(newCollections);
      setHasMore(newCollections.length < total);
      setPage(1);
    } catch {}
    setRefreshing(false);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(t('collection.confirmDelete'), t('collection.deleteConfirm', { title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => { setSelectedIds(new Set(collections.map(c => c.id))); };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(t('collection.batchManage'), t('collection.batchDeleteConfirm', { count: selectedIds.size }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => batchDeleteMutation.mutate(Array.from(selectedIds)) },
    ]);
  };

  const handleBatchRemoveFromTag = () => {
    const activeTagId = selectedTag || filterTagId;
    if (selectedIds.size === 0 || !activeTagId) return;
    Alert.alert(t('collection.removeFromGroup'), t('collection.removeFromTagConfirm', { count: selectedIds.size }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('collection.removeTag'), onPress: () => {
        const items = Array.from(selectedIds).map(id => {
          const item = allCollections.find(c => c.id === id);
          return { collectionId: id, tagIds: item?.tags?.map(t => t.id) || [activeTagId] };
        });
        Promise.all(items.map(item => removeFromTagMutation.mutateAsync({ ...item, tagIds: item.tagIds.filter(tid => tid !== activeTagId) }))).then(() => {
          setSelectedIds(new Set()); setEditMode(false);
        });
      }},
    ]);
  };

  const handleBatchRemoveFromList = () => {
    const activeListId = selectedList || filterListId;
    if (selectedIds.size === 0 || !activeListId) return;
    Alert.alert(t('collection.removeFromGroup'), t('collection.removeFromGroupConfirm', { count: selectedIds.size }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('collection.removeTag'), onPress: () => {
        const items = Array.from(selectedIds).map(id => {
          const item = allCollections.find(c => c.id === id);
          return { collectionId: id, listIds: item?.lists?.map(l => l.id) || [activeListId] };
        });
        Promise.all(items.map(item => removeFromListMutation.mutateAsync({ ...item, listIds: item.listIds.filter(lid => lid !== activeListId) }))).then(() => {
          setSelectedIds(new Set()); setEditMode(false);
        });
      }},
    ]);
  };

  const openAddModal = () => {
    setModalSelectedIds(new Set());
    if (modalLists && modalLists.length > 0) {
      const defaultList = modalLists.find(l => (l as any).isDefault);
      setModalSourceListId(defaultList?.id || modalLists[0].id);
    }
    setShowAddModal(true);
  };

  const handleModalConfirm = () => {
    if (modalSelectedIds.size === 0) return;
    const ids = Array.from(modalSelectedIds);
    if (filterType === 'tag') {
      addToTagMutation.mutate(ids);
    } else if (filterType === 'list') {
      moveToListMutation.mutate(ids);
    }
  };

  const openUrl = async (url: string, platform?: string) => {
    const platformConfig = platform ? getPlatformConfig(platform) : undefined;
    if (platformConfig?.appSchemes && platformConfig.appSchemes.length > 0) {
      const deepLink = buildDeepLink(url, platform!);
      if (deepLink) {
        try {
          const supported = await Linking.canOpenURL(deepLink);
          if (supported) {
            await Linking.openURL(deepLink);
            return;
          }
        } catch {}
      }
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.hint'), t('share.view.openFailed'));
    }
  };

  const renderItem = useCallback(({ item }: { item: Collection }) => {
    const selected = selectedIds.has(item.id);
    const onPress = () => {
      if (editMode) toggleSelect(item.id);
      else navigation.navigate('CollectionDetail', { id: item.id });
    };
    const onImagePress = () => {
      if (editMode) toggleSelect(item.id);
      else if (item.url) openUrl(item.url, item.platform);
    };
    const onLongPress = () => {
      if (!editMode) handleDelete(item.id, item.title);
    };
    if (viewMode === 'card') {
      return <CardItem item={item} colors={colors} editMode={editMode} selected={selected} onPress={onPress} onImagePress={onImagePress} onLongPress={onLongPress} t={t} enabledFields={enabledFields} />;
    }
    return <GridItem item={item} colors={colors} editMode={editMode} selected={selected} onPress={onPress} onImagePress={onImagePress} onLongPress={onLongPress} t={t} enabledFields={enabledFields} />;
  }, [viewMode, colors, editMode, selectedIds, toggleSelect, handleDelete, navigation, t, enabledFields]);

  const getItemLayout = useCallback((_data: any, index: number) => {
    return { length: 132, offset: 132 * index, index };
  }, []);

  // 模态框中的收藏项
  const renderModalItem = ({ item }: { item: Collection }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: modalSelectedIds.has(item.id) ? colors.selectedBg : colors.card, borderRadius: 8, padding: 12, gap: 10, borderWidth: modalSelectedIds.has(item.id) ? 1 : 0, borderColor: modalSelectedIds.has(item.id) ? colors.primary : 'transparent' }}
      onPress={() => {
        const newSet = new Set(modalSelectedIds);
        if (newSet.has(item.id)) newSet.delete(item.id); else newSet.add(item.id);
        setModalSelectedIds(newSet);
      }}
      activeOpacity={0.7}
    >
      <Ionicons name={modalSelectedIds.has(item.id) ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={modalSelectedIds.has(item.id) ? colors.primary : colors.textTertiary} />
      <LazyImage
        uri={item.coverStrategy === 'brand' ? null : item.coverImage}
        style={{ width: 60, height: 40, borderRadius: 4 }}
        fallbackPlatform={item.platform}
        showGradientFallback={item.coverStrategy === 'brand'}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }} numberOfLines={2}>{item.title}</Text>
      </View>
    </TouchableOpacity>
  );

  const modalTitle = filterType === 'tag' ? t('collection.addToTag', { name: route.params?.tagName || t('collection.tag') }) : t('collection.moveToGroupName', { name: route.params?.listName || t('nav.groups') });
  const modalConfirmText = filterType === 'tag' ? t('collection.addToTagBtn') : t('collection.moveToGroupBtn');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 搜索行 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginTop: 12 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, shadowColor: colors.glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 8 }}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, fontSize: 15, color: colors.text }}
            placeholder={t('collection.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: (filterPlatforms.size > 0 || filterLabel || filterListId || filterTagId) ? colors.primaryBg : colors.card, borderRadius: 8, borderWidth: 1, borderColor: (filterPlatforms.size > 0 || filterLabel || filterListId || filterTagId) ? colors.primary : colors.border }}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="funnel-outline" size={18} color={(filterPlatforms.size > 0 || filterLabel || filterListId || filterTagId) ? colors.primary : colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={18} color={colors.primary} />
        </TouchableOpacity>
        {!editMode && collections.length > 0 && (
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
            onPress={() => setEditMode(true)}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
          onPress={() => setViewMode(viewMode === 'card' ? 'grid' : 'card')}
        >
          <Ionicons name={viewMode === 'card' ? 'grid-outline' : 'list-outline'} size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 筛选条 */}
      {(filterLabel || filterPlatforms.size > 0 || filterListId || filterTagId) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.batchBg, marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 }}>
          <Ionicons name="filter" size={16} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 14, color: colors.batchText, fontWeight: '500' }}>
            {t('collection.filterLabel', { label: filterLabel })}{filterPlatforms.size > 0 ? (filterLabel ? ' · ' : '') + Array.from(filterPlatforms).map(p => getPlatformName(p)).join(', ') : ''}{filterListId && !filterLabel ? (filterPlatforms.size > 0 ? ' · ' : '') + t('collection.filterGroupLabel', { name: modalLists?.find((l: any) => l.id === filterListId)?.name || '' }) : ''}{filterTagId && !filterLabel ? ((filterPlatforms.size > 0 || filterListId) ? ' · ' : '') + '#' + (modalTags?.find((tt: any) => tt.id === filterTagId)?.name || '') : ''}
          </Text>
          <TouchableOpacity onPress={() => { clearFilter(); }} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 批量管理按钮 / 批量操作栏 */}
      {editMode ? (
        <View style={{ backgroundColor: colors.batchBg, marginHorizontal: 12, marginBottom: 8, borderRadius: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }} onPress={() => { setEditMode(false); setSelectedIds(new Set()); }}>
                <Ionicons name="close" size={18} color={colors.primary} />
                <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primaryBg, borderRadius: 6 }} onPress={selectedIds.size === collections.length ? () => setSelectedIds(new Set()) : selectAll}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '500' }}>{selectedIds.size === collections.length ? t('collection.deselectAll') : t('collection.selectAll')}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t('collection.selectedCount', { count: selectedIds.size })}</Text>
            </View>
          </View>
          {selectedIds.size > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 10 }}>
              <TouchableOpacity onPress={() => { setMoveType('list'); setShowMoveModal(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.filterChipBg, borderRadius: 6 }}>
                <Ionicons name="folder-outline" size={14} color={colors.warning} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.warning }}>{t('collection.moveToGroup')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setMoveType('tag'); setShowMoveModal(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.filterChipBg, borderRadius: 6 }}>
                <Ionicons name="pricetag-outline" size={14} color={colors.listTagText} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.listTagText }}>{t('collection.addTag')}</Text>
              </TouchableOpacity>
              {(filterType === 'tag' || filterTagId) ? (
                <TouchableOpacity onPress={handleBatchRemoveFromTag} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.filterChipBg, borderRadius: 6 }}>
                  <Ionicons name="remove-circle-outline" size={14} color={colors.warning} />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.warning }}>{t('collection.removeTag')}</Text>
                </TouchableOpacity>
              ) : null}
              {(filterType === 'list' || filterListId) ? (
                <TouchableOpacity onPress={handleBatchRemoveFromList} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.filterChipBg, borderRadius: 6 }}>
                  <Ionicons name="remove-circle-outline" size={14} color={colors.warning} />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.warning }}>{t('collection.removeFromGroup')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={handleBatchDelete} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.filterChipBg, borderRadius: 6 }}>
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.danger }}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}

      {/* 收藏列表 */}
      <FlatList
        ref={flatListRef}
        data={viewMode === 'card' && collections.length > 0 && collections.length % 2 === 1 ? [...collections, { id: '__placeholder__', title: '', platform: '', url: '', coverImage: null, note: null, createdAt: '', tags: [], lists: [] } as Collection] : collections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'card' ? 2 : 1}
        key={viewMode === 'card' ? 'card' : 'grid'}
        contentContainerStyle={viewMode === 'card' ? { padding: 4, paddingBottom: 12 } : { padding: 12, gap: 12 }}
        columnWrapperStyle={viewMode === 'card' ? { paddingHorizontal: 4 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.card} />}
        onEndReached={() => { if (hasMore && !isFetching && !refreshing) setPage(p => p + 1); }}
        onEndReachedThreshold={0.3}
        onScroll={(e) => { scrollPositionRef.current = e.nativeEvent.contentOffset; }}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={7}
        getItemLayout={viewMode === 'grid' ? getItemLayout : undefined}
        extraData={{ editMode, selectedIds }}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 12, gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => <CollectionCardSkeleton key={i} colors={colors} />)}
            </View>
          ) : error ? (
            <View style={{ alignItems: 'center', marginTop: 120, paddingHorizontal: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.dangerBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 }}>
                <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('common.networkError')}</Text>
              <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center', marginBottom: 20 }}>{t('common.pullToRefresh')}</Text>
              <TouchableOpacity onPress={onRefresh} style={{ paddingVertical: 10, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : debouncedSearch ? (
            <View style={{ alignItems: 'center', marginTop: 120, paddingHorizontal: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="search-outline" size={36} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('collection.noSearchResults')}</Text>
              <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center' }}>{t('collection.tryDifferentKeywords')}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 120, paddingHorizontal: 40 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }}>
                <Ionicons name="bookmark-outline" size={36} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('collection.noCollections')}</Text>
              <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center' }}>
                {t('collection.noCollectionsHint')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoading && page > 1 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>{t('collection.loadMoreText')}</Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.fabBg, shadowColor: colors.glowStrong, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
        onPress={() => {
          if (filterType === 'tag' || filterType === 'list') {
            openAddModal();
          } else {
            navigation.navigate('AddCollection', { mode: 'add' });
          }
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('collection.add')}</Text>
      </TouchableOpacity>

      {/* 筛选模态框 */}
      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('collection.filterTitle')}</Text>
              <TouchableOpacity onPress={() => { setFilterPlatforms(new Set()); setFilterListId(''); setFilterTagId(''); }}>
                <Text style={{ fontSize: 16, color: colors.warning }}>{t('collection.resetFilter')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('collection.platformMultiSelect')}</Text>
                  {filterPlatforms.size > 0 && (
                    <TouchableOpacity onPress={() => setFilterPlatforms(new Set())}>
                      <Text style={{ fontSize: 13, color: colors.warning }}>{t('collection.clear')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {userPlatforms.map(p => {
                    const isActive = filterPlatforms.has(p.key);
                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: isActive ? colors.filterChipActiveBg : colors.filterChipBg, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => {
                          const newSet = new Set(filterPlatforms);
                          if (isActive) newSet.delete(p.key); else newSet.add(p.key);
                          setFilterPlatforms(newSet);
                        }}
                      >
                        {isActive && <Ionicons name="close-circle" size={14} color={colors.filterChipActiveText} />}
                        <Text style={{ fontSize: 14, color: isActive ? colors.filterChipActiveText : colors.filterChipText }}>{p.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {userPlatforms.length === 0 && (
                  <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center', paddingVertical: 8 }}>{t('platform.noData')}</Text>
                )}
              </View>

              {/* Tag filter */}
              <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('collection.tag')}</Text>
                  {filterTagId && (
                    <TouchableOpacity onPress={() => setFilterTagId('')}>
                      <Text style={{ fontSize: 13, color: colors.warning }}>{t('collection.clear')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {modalTags?.map((tag: any) => {
                    const isActive = filterTagId === tag.id;
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: isActive ? colors.filterChipActiveBg : colors.filterChipBg }}
                        onPress={() => setFilterTagId(isActive ? '' : tag.id)}
                      >
                        <Text style={{ fontSize: 14, color: isActive ? colors.filterChipActiveText : colors.filterChipText }}>#{tag.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* List filter */}
              <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{t('collection.group')}</Text>
                  {filterListId && (
                    <TouchableOpacity onPress={() => setFilterListId('')}>
                      <Text style={{ fontSize: 13, color: colors.warning }}>{t('collection.clear')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {modalLists?.map((list: any) => {
                    const isActive = filterListId === list.id;
                    return (
                      <TouchableOpacity
                        key={list.id}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: isActive ? colors.filterChipActiveBg : colors.filterChipBg, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        onPress={() => setFilterListId(isActive ? '' : list.id)}
                      >
                        <Ionicons name="folder-outline" size={14} color={isActive ? colors.filterChipActiveText : colors.filterChipText} />
                        <Text style={{ fontSize: 14, color: isActive ? colors.filterChipActiveText : colors.filterChipText }}>{getListPathDisplayName(list, t)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={{ margin: 20, padding: 14, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center' }}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('collection.applyFilter')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 移动到分组/加标签 模态框 */}
      <Modal visible={showMoveModal} animationType="slide" transparent onRequestClose={() => setShowMoveModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <TouchableOpacity onPress={() => setShowMoveModal(false)}>
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{moveType === 'list' ? t('collection.moveToGroupTitle') : t('collection.addTagTitle')}</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
                {t('collection.selectedItemsTarget', { count: selectedIds.size, target: moveType === 'list' ? t('collection.selectTargetGroup') : t('collection.selectTagsToAdd') })}
              </Text>
              <View style={{ gap: 8 }}>
                {moveType === 'list' ? (
                  modalLists?.map((list: any) => {
                    const indentWidth = (list.depth || 0) * 16;
                    return (
                      <TouchableOpacity
                        key={list.id}
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          gap: 10, 
                          padding: 14, 
                          backgroundColor: colors.borderLight, 
                          borderRadius: 8,
                          marginLeft: indentWidth,
                        }}
                        onPress={async () => {
                          try {
                            await Promise.all(
                              Array.from(selectedIds).map(id => api.put(`/collections/${id}`, { listIds: [list.id] }))
                            );
                            resetPagination();
                            queryClient.invalidateQueries({ queryKey: ['collections'] });
                            setSelectedIds(new Set());
                            setEditMode(false);
                            setShowMoveModal(false);
                            Toast.show({ type: 'success', text1: t('collection.movedToGroup', { name: getListPathDisplayName(list, t) }) });
                          } catch { Alert.alert(t('collection.error'), t('collection.moveFailed')); }
                        }}
                      >
                        <Ionicons name="folder-outline" size={18} color={colors.primary} />
                        <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{getListPathDisplayName(list, t)}</Text>
                        {list.isDefault && <Text style={{ fontSize: 12, color: colors.primary }}>{t('collection.default')}</Text>}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  modalTags?.map((tag: any) => (
                    <TouchableOpacity
                      key={tag.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.borderLight, borderRadius: 8 }}
                      onPress={async () => {
                        try {
                          const items = allCollections;
                          await Promise.all(
                            Array.from(selectedIds).map(async id => {
                              const item = items.find(c => c.id === id);
                              const currentTagIds = item?.tags?.map(t => t.id) || [];
                              if (!currentTagIds.includes(tag.id)) {
                                await api.put(`/collections/${id}`, { tagIds: [...currentTagIds, tag.id] });
                              }
                            })
                          );
                          resetPagination();
                          queryClient.invalidateQueries({ queryKey: ['collections'] });
                          setSelectedIds(new Set());
                          setEditMode(false);
                          setShowMoveModal(false);
                          Toast.show({ type: 'success', text1: t('collection.addedTag', { name: tag.name }) });
                        } catch { Alert.alert(t('collection.error'), t('collection.addFailed')); }
                      }}
                    >
                      <Ionicons name="pricetag-outline" size={18} color={colors.listTagText} />
                      <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>#{tag.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 添加收藏模态框 */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}><Text style={{ fontSize: 16, color: colors.textSecondary }}>{t('common.cancel')}</Text></TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{modalTitle}</Text>
            <TouchableOpacity onPress={handleModalConfirm} disabled={modalSelectedIds.size === 0}>
              <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600', opacity: modalSelectedIds.size === 0 ? 0.5 : 1 }}>{modalConfirmText}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>{t('collection.sourceGroup')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {modalLists?.map(list => (
                <TouchableOpacity
                  key={list.id}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: modalSourceListId === list.id ? colors.primary : colors.borderLight, marginRight: 8 }}
                  onPress={() => { setModalSourceListId(list.id); setModalSelectedIds(new Set()); }}
                >
                  <Text style={{ fontSize: 14, color: modalSourceListId === list.id ? '#fff' : colors.textSecondary }}>{getListPathDisplayName(list, t)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {modalSelectedIds.size > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.batchBg, paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ fontSize: 14, color: colors.batchText }}>{t('collection.selectedItemsCount', { count: modalSelectedIds.size })}</Text>
              <TouchableOpacity onPress={() => {
                if (modalCollections) setModalSelectedIds(new Set(modalCollections.map(c => c.id)));
              }}>
                <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500' }}>{t('collection.selectAllItems')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={modalCollections || []}
            renderItem={renderModalItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 100 }}>
                <Text style={{ fontSize: 18, color: colors.textTertiary }}>{modalSourceListId ? t('collection.noItemsToAdd') : t('collection.selectSourceGroup')}</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* 排序选择模态框 */}
      <Modal visible={showSortModal} animationType="fade" transparent>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 8, width: '70%', maxWidth: 280 }}>
            {[
              { sortBy: 'createdAt' as const, sortOrder: 'desc' as const, icon: 'clock-outline', label: '添加时间 ↓' },
              { sortBy: 'createdAt' as const, sortOrder: 'asc' as const, icon: 'clock-outline', label: '添加时间 ↑' },
              { sortBy: 'rating' as const, sortOrder: 'desc' as const, icon: 'star', label: t('collection.filter.rating') + ' ↓' },
              { sortBy: 'rating' as const, sortOrder: 'asc' as const, icon: 'star', label: t('collection.filter.rating') + ' ↑' },
            ].map((opt) => {
              const isActive = sortMode === opt.sortBy && sortOrder === opt.sortOrder;
              return (
                <TouchableOpacity
                  key={`${opt.sortBy}-${opt.sortOrder}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: isActive ? colors.primaryBg : 'transparent' }}
                  onPress={() => { setSortMode(opt.sortBy); setSortOrder(opt.sortOrder); setShowSortModal(false); }}
                >
                  <Ionicons name={opt.icon as any} size={18} color={isActive ? colors.primary : colors.textSecondary} />
                  <Text style={{ fontSize: 15, color: isActive ? colors.primary : colors.text, fontWeight: isActive ? '600' : '400' }}>{opt.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
