import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '../lib/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';
import { getPlatformConfig } from '../lib/platforms';
import LazyImage from '../components/LazyImage';

interface TrashItem {
  id: string;
  url: string;
  title: string;
  coverImage: string | null;
  platform: string;
  deletedAt: string;
}

export default function TrashScreen() {
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery({
    queryKey: ['trash'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(`/collections/trash?page=${pageParam}&limit=40`);
      return res.data;
    },
    getNextPageParam: (lastPage: any) =>
      lastPage?.pagination?.page < lastPage?.pagination?.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 30 * 1000,
    initialPageParam: 1,
  });

  const items: TrashItem[] = data?.pages.flatMap((p: any) => p.data) ?? [];

  const restoreMutation = useMutation({
    mutationFn: async (ids: string[]) => api.post('/collections/trash/restore', { ids }),
    onSuccess: (_data: any, ids: string[]) => {
      Alert.alert(t('common.success'), t('collection.trash.restoreSuccess', { count: ids.length }));
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: () => Alert.alert(t('common.error'), t('collection.trash.restoreSuccess', { count: 0 })),
  });

  const purgeMutation = useMutation({
    mutationFn: async (ids: string[]) => api.delete('/collections/trash/purge', { data: { ids } }),
    onSuccess: (_data: any, ids: string[]) => {
      Alert.alert(t('common.success'), t('collection.trash.purgeSuccess', { count: ids.length }));
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
    onError: () => Alert.alert(t('common.error'), t('collection.trash.purgeSuccess', { count: 0 })),
  });

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRestore = () => {
    if (selectedIds.size === 0) return;
    restoreMutation.mutate(Array.from(selectedIds));
  };

  const handlePurge = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      t('collection.trash.purge'),
      t('collection.trash.purgeConfirm', { count: selectedIds.size }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('collection.trash.purge'), style: 'destructive', onPress: () => purgeMutation.mutate(Array.from(selectedIds)) },
      ]
    );
  };

  const renderItem = ({ item }: { item: TrashItem }) => {
    const platform = getPlatformConfig(item.platform);
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.card, borderColor: isSelected ? '#F59E0B' : colors.border }]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cover}>
          <LazyImage uri={item.coverStrategy === 'brand' ? null : item.coverImage} style={{ width: '100%', height: '100%' }} fallbackPlatform={item.platform} fallbackTitle={item.title} showGradientFallback={item.coverStrategy === 'brand'} />
          {isSelected && (
            <View style={styles.checkOverlay}>
              <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.metaRow}>
            {platform && <View style={[styles.platformDot, { backgroundColor: platform.color }]} />}
            <Text style={[styles.platformName, { color: colors.textTertiary }]}>{platform?.name || item.platform}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {t('collection.trash.deletedAt', { date: new Date(item.deletedAt).toLocaleDateString() })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="refresh" size={32} color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header actions */}
      {items.length > 0 && (
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.actionText, { color: colors.textTertiary }]}>
            {t('collection.trash.autoDeleteHint')}
          </Text>
          <View style={styles.actionButtons}>
            {selectedIds.size > 0 && (
              <>
                <TouchableOpacity onPress={handleRestore} style={[styles.actionBtn, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="refresh" size={16} color="#10B981" />
                  <Text style={[styles.actionBtnText, { color: '#10B981' }]}>{t('collection.trash.restore')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePurge} style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>{t('collection.trash.purge')}</Text>
                </TouchableOpacity>
              </>
            )}
            {selectedIds.size > 0 && (
              <Text style={[styles.selectedCount, { color: colors.textTertiary }]}>
                {t('collection.trash.selected', { count: selectedIds.size })}
              </Text>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="trash-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('collection.trash.empty')}</Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>{t('collection.trash.emptyHint')}</Text>
          </View>
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  actionBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionText: { fontSize: 12 },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  selectedCount: { fontSize: 12, marginLeft: 4 },
  list: { paddingHorizontal: 12, paddingTop: 8 },
  emptyList: { flexGrow: 1 },
  item: { flexDirection: 'row', marginHorizontal: 4, marginVertical: 4, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  cover: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  coverIcon: { fontSize: 24 },
  checkOverlay: { position: 'absolute', top: 4, right: 4 },
  info: { flex: 1, padding: 10, justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  platformDot: { width: 8, height: 8, borderRadius: 4 },
  platformName: { fontSize: 12 },
  dateText: { fontSize: 11, marginTop: 2 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyHint: { fontSize: 13, marginTop: 4, textAlign: 'center' },
});
