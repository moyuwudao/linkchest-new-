import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { api } from '../lib/api';
import { getPlatformIcon, getPlatformColor, getPlatformName, getPlatformConfig, buildDeepLink } from '../lib/platforms';
import { useThemeStore } from '../store/theme';
import LazyImage from '../components/LazyImage';
import { useI18n, getListDisplayName, getListPathDisplayName } from '../lib/i18n';
import { ListsSkeleton } from '../components/SkeletonComponents';

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

interface ListItem {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  depth?: number;  // 层级深度：0=根分组，1=子分组，2=孙分组
  isDefault?: boolean;
  path?: { id: string; name: string; isDefault?: boolean }[];
  pathName?: string | null;
  children?: ListItem[];
}

interface FlatListItem extends ListItem {
  depth: number;
  isExpanded?: boolean;
  hasChildren: boolean;
}

export default function ListsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingList, setEditingList] = useState<FlatListItem | null>(null);
  const [listName, setListName] = useState('');
  const [listDesc, setListDesc] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailList, setDetailList] = useState<{ id: string; name: string; collectionCount: number } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createSubModal, setCreateSubModal] = useState(false);
  const [selectedParentForCreate, setSelectedParentForCreate] = useState<string | null>(null);

  // 分组详情弹窗 - 收藏列表（数量来自列表数据，展开时才查收藏列表）
  const [detailExpanded, setDetailExpanded] = useState(false);
  const { data: detailCollections, isLoading: detailLoading } = useQuery({
    queryKey: ['collections', 'detail', detailList?.id, detailExpanded],
    queryFn: async () => {
      if (!detailList) return [] as Collection[];
      const response = await api.get(`/collections?directListId=${detailList.id}&limit=20`);
      return (Array.isArray(response.data) ? response.data
        : (response.data?.data || response.data?.collections || [])) as Collection[];
    },
    enabled: !!detailList && detailExpanded,
  });



  // 获取扁平列表数据（用于构建树）
  const { data: flatLists, isLoading, refetch } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      const raw = response.data.data || [];
      return raw as (ListItem & { depth: number; pathName: string | null })[];
    },
  });

  // 构建树形数据 - 使用 useCallback 确保 expandedIds 变化时重新计算
  const buildTree = useCallback((items: ListItem[], parentId: string | null = null, depth: number = 0): FlatListItem[] => {
    // 防止无限递归，最大深度限制为 10 层
    if (depth > 10) {
      return [];
    }
    const result: FlatListItem[] = [];
    const children = items.filter(item => item && item.parentId === parentId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    for (const child of children) {
      if (!child || !child.id) continue;
      const hasChildren = items.some(item => item && item.parentId === child.id);
      result.push({
        ...child,
        depth,
        hasChildren,
        isExpanded: expandedIds.has(child.id),
      });
      if (hasChildren && expandedIds.has(child.id)) {
        result.push(...buildTree(items, child.id, depth + 1));
      }
    }
    return result;
  }, [expandedIds]);

  const treeData = React.useMemo(() => {
    if (!flatLists || flatLists.length === 0) return [];
    try {
      // 只显示根节点（没有 parentId 的项）
      const rootItems = flatLists.filter(l => !l.parentId);
      const result: FlatListItem[] = [];
      for (const item of rootItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''))) {
        if (!item || !item.id) continue;
        const hasChildren = flatLists.some(l => l.parentId === item.id);
        result.push({
          ...item,
          depth: 0,
          hasChildren,
          isExpanded: expandedIds.has(item.id),
        });
        // 如果已展开，递归添加子节点
        if (hasChildren && expandedIds.has(item.id)) {
          const children = buildTree(flatLists, item.id, 1);
          result.push(...children);
        }
      }
      return result;
    } catch (e) {
      // 出错时只返回根节点
      return flatLists.filter(l => !l.parentId).map(item => ({
        ...item,
        depth: 0,
        hasChildren: flatLists.some(l => l.parentId === item.id),
        isExpanded: false,
      }));
    }
  }, [flatLists, expandedIds, buildTree]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

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

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; parentId?: string | null }) =>
      api.post('/lists', data),
    onSuccess: (res: any) => {
      const data = res.data?.data || res.data;
      const wasRenamed = data?.renamed;
      const actualName = data?.name || listName;

      // 刷新列表
      queryClient.invalidateQueries({ queryKey: ['lists'] });

      // 关闭弹窗并重置状态
      setModalVisible(false);
      setCreateSubModal(false);
      setListName('');
      setListDesc('');
      setParentId(null);

      // 如果自动重命名，提示用户
      if (wasRenamed) {
        Alert.alert(t('common.hint'), t('group.nameExistsAuto', { originalName: data.originalName, newName: actualName }));
      }
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.response?.data?.error 
        || error.response?.data?.errors?.map((e: any) => e.msg).join(', ')
        || t('group.createFailedShort');
      Alert.alert(t('common.error'), errorMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; description?: string; parentId?: string | null };
    }) => api.put(`/lists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setModalVisible(false);
      setEditingList(null);
      setListName('');
      setListDesc('');
      setParentId(null);
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('group.updateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}`),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      const movedChildren = res.data?.movedChildren || 0;
      if (movedChildren > 0) {
        Alert.alert(t('common.success'), t('group.deleteSuccessWithChildren', { count: movedChildren }));
      }
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('group.deleteFailed'));
    },
  });

  const handleSave = () => {
    if (!listName.trim()) {
      Alert.alert(t('common.hint'), t('group.nameRequired'));
      return;
    }

    const data: { name: string; description?: string; parentId?: string | null } = {
      name: listName.trim(),
      description: listDesc.trim() || undefined,
    };

    // 只有当 parentId 有值时才添加
    const pid = editingList ? editingList.parentId : parentId;
    if (pid) {
      data.parentId = pid;
    }

    if (editingList) {
      updateMutation.mutate({ id: editingList.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: FlatListItem) => {
    setEditingList(item);
    const isDefaultList = ['__DEFAULT_LIST__', '我的收藏'].includes(item.name);
    setListName(isDefaultList ? t('group.defaultName') : item.name);
    const desc = item.description && !['__DEFAULT_LIST_DESC__', '__DEFAULT_LIST__'].includes(item.description)
      ? item.description : '';
    setListDesc(desc);
    setParentId(item.parentId);
    setModalVisible(true);
  };

  const handleDelete = (item: FlatListItem) => {
    const hasChildren = flatLists?.some(l => l.parentId === item.id);
    const message = hasChildren
      ? t('group.deleteConfirmWithChildren', { name: getListDisplayName(item as any, t), count: hasChildren ? 1 : 0 })
      : t('group.deleteConfirm', { name: getListDisplayName(item as any, t) });

    Alert.alert(
      t('common.confirm'),
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id),
        },
      ]
    );
  };

  const handleCreateSub = (parentId: string) => {
    setSelectedParentForCreate(parentId);
    setEditingList(null);
    setListName('');
    setListDesc('');
    setParentId(parentId);
    setCreateSubModal(true);
  };

  const handleSaveSub = () => {
    if (!listName.trim()) {
      Alert.alert(t('common.hint'), t('group.nameRequired'));
      return;
    }
    createMutation.mutate({
      name: listName.trim(),
      description: listDesc.trim() || undefined,
      parentId: selectedParentForCreate,
    });
  };

  const renderItem = ({ item }: { item: FlatListItem }) => {
    // 防御性检查：确保 item 有必要的 id
    if (!item || !item.id) {
      return null;
    }
    const indentWidth = item.depth * 20;

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 12,
        marginBottom: 6,
        marginLeft: indentWidth,
        borderRadius: 8,
      }}>
        {/* Expand/Collapse button */}
        {item.hasChildren ? (
          <TouchableOpacity
            onPress={() => toggleExpand(item.id)}
            style={{ padding: 4, marginRight: 4 }}
          >
            <Ionicons
              name={item.isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 26 }} />
        )}

        {/* Folder icon */}
        <Ionicons name="folder-open" size={20} color={colors.primary} style={{ marginRight: 8 }} />

        {/* Content */}
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => setDetailList({ id: item.id, name: getListPathDisplayName(item as any, t), collectionCount: item.collectionCount || 0 })}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
              {getListDisplayName(item as any, t)}
            </Text>
            {item.isDefault ? (
              <View style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '500' }}>{t('collection.default')}</Text>
              </View>
            ) : null}
          </View>
          {item.path && item.path.length > 0 && (
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1 }}>
              {item.path.map(p => p.isDefault || ['__DEFAULT_LIST__', '我的收藏'].includes(p.name) ? t('group.defaultName') : p.name).join(' / ')}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
            {t('group.collectionCount', { count: item.totalCollectionCount ?? item.collectionCount ?? 0 })}
            {item.totalCollectionCount != null && item.totalCollectionCount !== item.collectionCount && (
              <Text style={{ color: colors.textTertiary, opacity: 0.6 }}> ({t('group.directCount', { count: item.collectionCount })})</Text>
            )}
          </Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {!item.isDefault && (
            <>
              {/* depth >= 2 时隐藏新建子分组按钮（第三级分组不能再建子分组） */}
              {(!item.depth || item.depth < 2) && (
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => handleCreateSub(item.id)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={() => handleEdit(item)}
                activeOpacity={0.6}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={() => handleDelete(item)}
                activeOpacity={0.6}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={treeData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        extraData={expandedIds}
        ListEmptyComponent={
          isLoading ? (
            <ListsSkeleton colors={colors} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 120 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="folder-open-outline" size={36} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('group.noGroups')}</Text>
              <Text style={{ fontSize: 14, color: colors.textTertiary, marginBottom: 20 }}>{t('group.noGroupsHint')}</Text>
              <TouchableOpacity
                style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 10 }}
                onPress={() => setModalVisible(true)}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('group.newGroup')}</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* List Detail Modal */}
      {detailList && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setDetailList(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{detailList.name}</Text>
                <TouchableOpacity onPress={() => setDetailList(null)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 操作按钮 */}
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 16 }}
                onPress={() => {
                  setDetailList(null);
                  navigation.navigate('Collections', { listId: detailList.id, listName: detailList.name });
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('group.viewInCollections')}</Text>
              </TouchableOpacity>

              {/* 收藏列表 - 可折叠（弹窗打开即查询，pagination.total 提供数量） */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}
                onPress={() => setDetailExpanded(!detailExpanded)}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {t('group.collectionCount', { count: detailList?.collectionCount || 0 })}
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
                  {detailList && detailList.collectionCount > 20 && (
                    <Text style={{ textAlign: 'center', color: colors.textTertiary, paddingVertical: 10, fontSize: 13 }}>
                      {t('collection.viewAll', { count: detailList.collectionCount })}
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* 新建/编辑分组 Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: colors.text }}>
              {editingList ? t('group.editGroup') : t('group.newGroup')}
            </Text>

            {/* Parent indicator */}
            {parentId && flatLists && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.filterChipBg, padding: 8, borderRadius: 6, marginBottom: 12 }}>
                <Ionicons name="folder" size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 6 }}>
                  {t('group.subGroupOf')} {flatLists.find(l => l.id === parentId)?.name || ''}
                </Text>
              </View>
            )}

            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text }}
              placeholder={t('group.groupName')}
              placeholderTextColor={colors.textTertiary}
              value={listName}
              onChangeText={setListName}
              maxLength={30}
              autoFocus
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text, height: 80, textAlignVertical: 'top' }}
              placeholder={t('group.description')}
              placeholderTextColor={colors.textTertiary}
              value={listDesc}
              onChangeText={setListDesc}
              maxLength={200}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.secondaryBg }}
                onPress={() => {
                  setModalVisible(false);
                  setEditingList(null);
                  setParentId(null);
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary }}
                onPress={handleSave}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('group.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 创建子分组 Modal */}
      {/* FAB */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.fabBg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 }}
        onPress={() => {
          setEditingList(null);
          setListName('');
          setListDesc('');
          setParentId(null);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('group.newGroup')}</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={createSubModal}
        onRequestClose={() => setCreateSubModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 320 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setCreateSubModal(false)} style={{ marginRight: 8 }}>
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('group.newSubGroup')}</Text>
            </View>

            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text }}
              placeholder={t('group.groupName')}
              placeholderTextColor={colors.textTertiary}
              value={listName}
              onChangeText={setListName}
              maxLength={30}
              autoFocus
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text, height: 80, textAlignVertical: 'top' }}
              placeholder={t('group.description')}
              placeholderTextColor={colors.textTertiary}
              value={listDesc}
              onChangeText={setListDesc}
              maxLength={200}
              multiline
            />
            <TouchableOpacity
              style={{ width: '100%', padding: 14, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary }}
              onPress={handleSaveSub}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('group.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}