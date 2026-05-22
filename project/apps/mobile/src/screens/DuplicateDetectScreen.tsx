import React, { useState } from 'react';
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
import { useMutation, useQueryClient } from '../lib/react-query';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface DuplicateItem {
  id: string;
  title: string;
  url: string;
  platform: string;
  coverImage: string | null;
  createdAt: string;
}

interface DuplicateGroup {
  type: 'url' | 'title';
  items: DuplicateItem[];
  similarity: number;
}

export default function DuplicateDetectScreen() {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [duplicateResults, setDuplicateResults] = useState<DuplicateGroup[] | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [keepIds, setKeepIds] = useState<Record<number, string>>({});
  const [scanning, setScanning] = useState(false);

  const userTier = (user as any)?.userTier || 'medium';
  const canUseDuplicate = userTier === 'heavy' || userTier === 'super';

  const scanDuplicates = async () => {
    if (!canUseDuplicate) {
      Alert.alert(t('common.hint'), t('settings.upgradeHint'));
      return;
    }
    setScanning(true);
    try {
      const res = await api.post('/collections/scan-duplicates');
      const groups = (res.data.data || res.data) as DuplicateGroup[];
      setDuplicateResults(groups);
      setExpandedGroup(null);
      setKeepIds({});
      if (groups.length === 0) {
        Alert.alert(t('common.success'), t('settings.noDuplicates'));
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || t('common.unknownError'));
    } finally {
      setScanning(false);
    }
  };

  const mergeMutation = useMutation({
    mutationFn: ({ keepId, removeIds }: { keepId: string; removeIds: string[] }) =>
      api.post('/collections/merge-duplicates', { keepId, removeIds }),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('settings.mergeSuccess'));
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      scanDuplicates();
    },
    onError: (err: any) => {
      Alert.alert(t('common.error'), err?.response?.data?.message || t('common.operationFailed'));
    },
  });

  const handleKeepNewest = (groupIdx: number) => {
    const group = duplicateResults?.[groupIdx];
    if (!group) return;
    const newest = [...group.items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    if (!newest) return;
    const removeIds = group.items.filter((i) => i.id !== newest.id).map((i) => i.id);
    mergeMutation.mutate({ keepId: newest.id, removeIds });
  };

  const handleMerge = (groupIdx: number) => {
    const group = duplicateResults?.[groupIdx];
    if (!group) return;
    const keepId = keepIds[groupIdx];
    if (!keepId) {
      Alert.alert(t('common.hint'), t('settings.keep'));
      return;
    }
    const removeIds = group.items.filter((i) => i.id !== keepId).map((i) => i.id);
    mergeMutation.mutate({ keepId, removeIds });
  };

  if (!canUseDuplicate) {
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Scan Button */}
      <TouchableOpacity
        style={[styles.scanBtn, { backgroundColor: colors.primary }]}
        onPress={scanDuplicates}
        disabled={scanning || mergeMutation.isPending}
        activeOpacity={0.8}
      >
        {scanning ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="scan-outline" size={20} color="#fff" />
            <Text style={styles.scanBtnText}>{t('settings.scanDuplicates')}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Results Summary */}
      {duplicateResults !== null && (
        <Text style={[styles.summary, { color: colors.textTertiary }]}>
          {t('settings.duplicateGroupsFound', { count: duplicateResults.length })}
        </Text>
      )}

      {/* Duplicate Groups */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 24 }}>
        {duplicateResults?.map((group, idx) => (
          <View
            key={idx}
            style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {/* Group Header */}
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => setExpandedGroup(expandedGroup === idx ? null : idx)}
              activeOpacity={0.7}
            >
              <View style={styles.groupHeaderLeft}>
                <View
                  style={[
                    styles.typeTag,
                    {
                      backgroundColor:
                        group.type === 'url'
                          ? 'rgba(184,92,92,0.12)'
                          : 'rgba(91,138,114,0.12)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeTagText,
                      {
                        color:
                          group.type === 'url'
                            ? '#B85C5C'
                            : '#5B8A72',
                      },
                    ]}
                  >
                    {group.type === 'url'
                      ? t('settings.urlDuplicates')
                      : t('settings.titleDuplicates')}
                  </Text>
                </View>
                <Text style={[styles.itemCount, { color: colors.text }]}>
                  {group.items.length} items
                </Text>
                {group.type === 'title' && (
                  <Text style={[styles.similarity, { color: colors.textTertiary }]}>
                    {t('settings.similarity')}: {Math.round(group.similarity * 100)}%
                  </Text>
                )}
              </View>
              <Ionicons
                name={expandedGroup === idx ? 'chevron-down' : 'chevron-forward'}
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {/* Expanded Content */}
            {expandedGroup === idx && (
              <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                {/* Keep Newest Button for URL duplicates */}
                {group.type === 'url' && (
                  <TouchableOpacity
                    style={[styles.keepNewestBtn, { backgroundColor: colors.primary + '18' }]}
                    onPress={() => handleKeepNewest(idx)}
                    disabled={mergeMutation.isPending}
                    activeOpacity={0.7}
                  >
                    {mergeMutation.isPending ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                        <Text style={[styles.keepNewestText, { color: colors.primary }]}>
                          {t('settings.keepNewest')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Items */}
                {group.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.itemRow,
                      {
                        backgroundColor:
                          keepIds[idx] === item.id
                            ? colors.primary + '12'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => setKeepIds((prev) => ({ ...prev, [idx]: item.id }))}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        keepIds[idx] === item.id
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={20}
                      color={keepIds[idx] === item.id ? colors.primary : colors.textTertiary}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.itemUrl, { color: colors.textTertiary }]}
                        numberOfLines={1}
                      >
                        {item.url}
                      </Text>
                    </View>
                    <Text style={[styles.itemPlatform, { color: colors.textTertiary }]}>
                      {item.platform}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Merge Button */}
                <TouchableOpacity
                  style={[styles.mergeBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleMerge(idx)}
                  disabled={mergeMutation.isPending}
                  activeOpacity={0.8}
                >
                  {mergeMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.mergeBtnText}>{t('settings.merge')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
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
  scanBtn: {
    margin: 12,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  similarity: {
    fontSize: 12,
  },
  expandedContent: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
  keepNewestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  keepNewestText: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPlatform: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  mergeBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  mergeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
