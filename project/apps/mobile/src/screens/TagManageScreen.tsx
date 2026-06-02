import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';
import { useThemeStore } from '../store/theme';
import { getPlatformConfig, buildDeepLink } from '../lib/platforms';
import { useI18n } from '../lib/i18n';
import { TagManageSkeleton } from '../components/SkeletonComponents';
import LazyImage from '../components/LazyImage';

interface Tag {
  id: string;
  name: string;
  collectionCount: number;
}

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
  url: string;
}

type RootStackParamList = {
  Main: undefined;
  Collections: { tagId?: string; tagName?: string; listId?: string; listName?: string };
  CollectionDetail: { id: string };
};

export default function TagManageScreen() {
  const queryClient = useQueryClient();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [detailTag, setDetailTag] = useState<{ id: string; name: string; collectionCount: number } | null>(null);
  const [detailExpanded, setDetailExpanded] = useState(true);

  // 标签详情弹窗 - 收藏列表
  const { data: detailCollections, isLoading: detailLoading } = useQuery({
    queryKey: ['collections', 'tagDetail', detailTag?.id],
    queryFn: async () => {
      if (!detailTag) return [] as Collection[];
      const response = await api.get(`/collections?tagId=${detailTag.id}&limit=20`);
      return (Array.isArray(response.data) ? response.data
        : (response.data?.data || response.data?.collections || [])) as Collection[];
    },
    enabled: !!detailTag,
  });

  const { data: tags, isLoading, refetch: refetchTags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      return (response.data.data || response.data) as Tag[];
    },
  });

  const onRefresh = async () => { setRefreshing(true); await refetchTags(); setRefreshing(false); };

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
  useFocusEffect(useCallback(() => { refetchTags(); }, [refetchTags]));

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/tags', { name }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setModalVisible(false);
      setTagName('');
      const data = res.data?.data || res.data;
      if (data?.renamed) { Alert.alert(t('common.hint'), t('tag.tagNameExistsAuto', { originalName: data.originalName, name: data.name })); }
    },
    onError: (error: any) => { Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('tag.createFailed')); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.put(`/tags/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setModalVisible(false);
      setEditingTag(null);
      setTagName('');
    },
    onError: (error: any) => { Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('tag.updateFailed')); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const handleSave = () => {
    if (!tagName.trim()) { Alert.alert(t('common.hint'), t('tag.enterTagName')); return; }
    if (editingTag) { updateMutation.mutate({ id: editingTag.id, name: tagName.trim() }); }
    else {
      const exists = tags?.some((tg: any) => tg.name === tagName.trim());
      if (exists) {
        Alert.alert(t('tag.nameDuplicate'), t('tag.nameExists', { name: tagName.trim() }), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('tag.continueCreate'), onPress: () => createMutation.mutate(tagName.trim()) },
        ]);
      } else {
        createMutation.mutate(tagName.trim());
      }
    }
  };

  const handleEdit = (tag: Tag) => { setEditingTag(tag); setTagName(tag.name); setModalVisible(true); };

  const handleDelete = (tag: Tag) => {
    Alert.alert(t('collection.confirmDelete'), t('tag.confirmDeleteTag', { name: tag.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(tag.id) },
    ]);
  };

  const renderItem = ({ item }: { item: Tag }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 12, borderRadius: 8, marginBottom: 8 }}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => setDetailTag({ id: item.id, name: item.name, collectionCount: item.collectionCount })}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="pricetag" size={18} color={colors.primary} />
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>#{item.name}</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
          {t('tag.collectionCount', { count: item.collectionCount })}
        </Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity style={{ padding: 8 }} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 8 }} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={tags || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          isLoading ? (
            <TagManageSkeleton colors={colors} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 120 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="pricetag-outline" size={36} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('tag.noTags')}</Text>
              <Text style={{ fontSize: 14, color: colors.textTertiary, marginBottom: 20 }}>{t('tag.noTagsHint')}</Text>
            </View>
          )
        }
      />

      {/* Tag Detail Modal */}
      {detailTag && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setDetailTag(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="pricetag" size={20} color={colors.primary} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>#{detailTag.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailTag(null)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 操作按钮 */}
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 16 }}
                onPress={() => {
                  setDetailTag(null);
                  navigation.navigate('Collections', { tagId: detailTag.id, tagName: detailTag.name });
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('group.viewInCollections')}</Text>
              </TouchableOpacity>

              {/* 收藏列表 */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}
                onPress={() => setDetailExpanded(!detailExpanded)}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {t('tag.collectionCount', { count: detailTag?.collectionCount || 0 })}
                </Text>
                <Ionicons
                  name={detailExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {detailExpanded && (
                <ScrollView style={{ maxHeight: 300, marginTop: 8 }}>
                  {detailLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
                  ) : detailCollections && detailCollections.length > 0 ? (
                    detailCollections.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                        onPress={() => item.url && openUrl(item.url, item.platform)}
                      >
                        <LazyImage uri={item.coverStrategy === 'brand' ? null : item.coverImage} style={{ width: 44, height: 36, borderRadius: 4, marginRight: 10 }} fallbackPlatform={item.platform} fallbackTitle={item.title} showGradientFallback={item.coverStrategy === 'brand'} />
                        <Text style={{ flex: 1, fontSize: 14, color: colors.text }} numberOfLines={2}>{item.title}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={{ textAlign: 'center', color: colors.textTertiary, paddingVertical: 20, fontSize: 14 }}>{t('group.noCollectionsInGroup')}</Text>
                  )}
                  {detailTag && detailTag.collectionCount > 20 && (
                    <Text style={{ textAlign: 'center', color: colors.textTertiary, paddingVertical: 10, fontSize: 13 }}>
                      {t('collection.viewAll', { count: detailTag.collectionCount })}
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.fabBg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 }}
        onPress={() => { setEditingTag(null); setTagName(''); setModalVisible(true); }}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('tag.newTag')}</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: colors.text }}>{editingTag ? t('tag.editTag') : t('tag.newTag')}</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, color: colors.text }} placeholder={t('tag.tagName')} placeholderTextColor={colors.textTertiary} value={tagName} onChangeText={setTagName} maxLength={20} autoFocus />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.secondaryBg }} onPress={() => setModalVisible(false)}><Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary }} onPress={handleSave}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('common.save')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
