import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { api, getPublicBaseUrl } from '../lib/api';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { logEvent } from '../lib/analytics';
import { ShareManagementSkeleton } from '../components/SkeletonComponents';

type RootStackParamList = {
  Main: undefined;
  ShareDetail: { shareId: string; isOwner?: boolean; password?: string };
  CreateShare: undefined;
  CollectionDetail: { id: string };
  Tags: undefined;
  Lists: undefined;
};

interface ShareItem {
  id: string;
  title: string;
  type: 'ALL' | 'LIST' | 'TAG' | 'MULTI_TAG' | 'MULTI_LIST' | 'CUSTOM' | 'COLLECTION';
  isActive: boolean;
  createdAt: string;
  itemCount: number;
  viewCount?: number;
  hasPassword?: boolean;
  password?: string;
  shareUrl?: string;
  description?: string;
}

interface ShareList {
  id: string;
  name: string;
  description: string | null;
  collectionCount: number;
  createdAt: string;
}

// 判断是否为导入的分享分组（通过 sourceShareId 和 sourceType 判断，兼容旧版 description 前缀）
const SHARE_DESC_PREFIXES = ['来自分享:', 'From share:'];
const isFromShare = (item: any) => {
  if (item.sourceShareId && item.sourceType === 'import') return true;
  const desc = item.description;
  return desc ? SHARE_DESC_PREFIXES.some(p => desc.startsWith(p)) : false;
};
const extractShareId = (item: any) => {
  if (item.sourceShareId && item.sourceType === 'import') return item.sourceShareId;
  const desc = item.description;
  if (!desc) return '';
  for (const p of SHARE_DESC_PREFIXES) {
    if (desc.startsWith(p)) return desc.slice(p.length).trim();
  }
  return '';
};

export default function ShareManagementScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t } = useI18n();

  const typeLabels: Record<string, string> = {
    ALL: t('share.typeAll'),
    LIST: t('share.typeGroup'),
    TAG: t('share.typeTag'),
    MULTI_TAG: t('share.typeMultiTag'),
    MULTI_LIST: t('share.typeMultiGroup'),
    CUSTOM: t('share.typeCustom'),
    COLLECTION: t('share.typeCollection'),
    COLLECTIONS: t('share.typeCollections'),
  };
  const [activeTab, setActiveTab] = useState<'created' | 'received'>('created');
  const [refreshing, setRefreshing] = useState(false);
  const [linkInputModal, setLinkInputModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});

  const { data: shares, isLoading: isLoadingShares, refetch: refetchShares } = useQuery({
    queryKey: ['shares'],
    queryFn: async () => {
      const response = await api.get('/shares');
      return (response.data.data || response.data) as ShareItem[];
    },
  });

  // 获取"来自分享"的分组（合集）
  const { data: shareLists, isLoading: isLoadingShareLists, refetch: refetchShareLists } = useQuery({
    queryKey: ['share-lists'],
    queryFn: async () => {
      try {
        const response = await api.get('/lists');
        const allLists = (response.data.data || response.data) as any[];
        return allLists.filter((l: any) => isFromShare(l)) as ShareList[];
      } catch {
        return [] as ShareList[];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchShares(), refetchShareLists()]);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => {
    refetchShares();
    refetchShareLists();
  }, [refetchShares, refetchShareLists]));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shares/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      Toast.show({ type: 'success', text1: t('share.management.shareLinkDeleted') });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(`/shares/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
  });

  const revealPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.get(`/shares/${id}/password`);
      return response.data.password as string | null;
    },
    onSuccess: (password, id) => {
      if (password) {
        setRevealedPasswords(prev => ({ ...prev, [id]: password }));
        Toast.show({ type: 'success', text1: t('share.passwordRevealed') });
      }
    },
    onError: () => {
      Toast.show({ type: 'error', text1: t('share.passwordRevealFailed') });
    },
  });

  const copyLink = async (item: ShareItem) => {
    const link = item.shareUrl || `${getPublicBaseUrl()}/s/${item.id}`;
    try {
      await Share.share({
        message: link,
      });
    } catch (e) {
      Toast.show({ type: 'info', text1: t('share.linkCopied') + ' ' + link, visibilityTime: 5000 });
    }
  };

  // 从输入的链接中识别分享ID并打开
  const handleOpenShareLink = async () => {
    const text = linkInput.trim();
    if (!text) {
      Alert.alert(t('common.hint'), t('share.pleaseInputLink'));
      return;
    }

    setLinkLoading(true);
    let shareId: string | null = null;

    // 从 URL 路径中提取 /s/xxx
    const urlMatch = text.match(/\/s\/([A-Za-z0-9_-]{6,20})/);
    if (urlMatch) {
      shareId = urlMatch[1];
    }

    if (shareId) {
      // 验证分享是否存在
      try {
        const response = await api.get(`/s/${shareId}`);
        const result = response.data;
        // 如果是自己创建的分享，提示用户无需打开
        if (result.isOwner) {
          Alert.alert(t('common.hint'), t('share.selfShareHint'));
          setLinkLoading(false);
          return;
        }
        setLinkInputModal(false);
        setLinkInput('');
        logEvent('open_share_link');
        navigation.navigate('ShareDetail', { shareId });
      } catch (err: any) {
        Alert.alert(t('common.error'), err.response?.data?.error || t('share.shareNotExist'));
      }
    } else {
      Alert.alert(t('share.unrecognizedTitle'), t('share.unrecognizedShare'));
    }
    setLinkLoading(false);
  };

  // +号按钮点击逻辑
  const handleFabPress = () => {
    if (activeTab === 'created') {
      navigation.navigate('CreateShare');
    } else if (activeTab === 'received') {
      setLinkInputModal(true);
    }
  };
  
  const handleViewShare = (share: ShareItem) => {
    navigation.navigate('ShareDetail', { 
      shareId: share.id,
      isOwner: true,
      password: '',
    });
  };
  
  const handleDelete = (share: ShareItem) => {
    Alert.alert(
      t('common.confirm'),
      t('share.deleteShareConfirm', { title: share.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(share.id),
        },
      ]
    );
  };

  // 删除"来自分享"合集
  const handleDeleteShareList = (list: ShareList) => {
    Alert.alert(
      t('common.confirm'),
      t('share.deleteCollectionConfirm', { name: list.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/lists/${list.id}`);
              queryClient.invalidateQueries({ queryKey: ['share-lists'] });
              Toast.show({ type: 'success', text1: t('share.collectionDeleted') });
            } catch {
              Toast.show({ type: 'error', text1: t('share.management.deleteFailed') });
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ShareItem }) => {
    const disabledStyle = !item.isActive ? { opacity: 0.4 } : {};
    const disabledColor = !item.isActive ? colors.textTertiary : undefined;

    return (
      <TouchableOpacity
        style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12 }}
        onPress={() => handleViewShare(item)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 12, color: colors.primaryText }}>{typeLabels[item.type] || item.type}</Text>
            </View>
            {!item.isActive && (
              <View style={{ backgroundColor: colors.inactiveBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 11, color: colors.inactiveText }}>{t('share.disabled')}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>{item.title}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t('share.itemCount', { count: item.itemCount })}</Text>
          {typeof item.viewCount === 'number' && (
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              · {t('share.viewCount', { count: item.viewCount })}
            </Text>
          )}
        </View>

        {item.hasPassword && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Ionicons name="lock-closed" size={12} color={colors.warning} />
            <Text style={{ fontSize: 12, color: colors.warning }}>
              {item.password
                ? t('share.password', { password: item.password })
                : t('share.create.accessPasswordLabel')}
            </Text>
            {item.password ? (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Clipboard.setStringAsync(item.password!);
                    Toast.show({ type: 'success', text1: t('share.passwordCopied') });
                  } catch {
                    Alert.alert(t('common.error'), t('share.copyFailed'));
                  }
                }}
                style={{ marginLeft: 2 }}
              >
                <Ionicons name="copy-outline" size={14} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => revealPasswordMutation.mutate(item.id)}
                style={{ marginLeft: 2 }}
                disabled={revealPasswordMutation.isPending}
              >
                <Ionicons name="eye-outline" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 操作按钮 - 纯图标，参考获取的分享样式 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          <TouchableOpacity
            style={{ padding: 6 }}
            onPress={() => toggleMutation.mutate(item.id)}
          >
            <Ionicons
              name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ padding: 6, ...disabledStyle }}
            onPress={() => handleViewShare(item)}
            disabled={!item.isActive}
          >
            <Ionicons name="open-outline" size={20} color={disabledColor || colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ padding: 6, ...disabledStyle }}
            onPress={() => copyLink(item)}
            disabled={!item.isActive}
          >
            <Ionicons name="copy-outline" size={20} color={disabledColor || colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ padding: 6, ...disabledStyle }}
            onPress={() => handleDelete(item)}
            disabled={!item.isActive}
          >
            <Ionicons name="trash-outline" size={20} color={disabledColor || colors.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // 合集卡片渲染
  const renderShareList = ({ item }: { item: ShareList }) => {
    const shareId = extractShareId(item);
    return (
      <View style={{ backgroundColor: colors.card, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
        {/* 合集头部 */}
        <TouchableOpacity
          style={{ padding: 16 }}
          onPress={() => {
            if (shareId) {
              navigation.navigate('ShareDetail', { shareId });
            }
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 10,
                backgroundColor: colors.primaryBg,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name="folder-open" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: colors.primaryBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 }}>
                    <Text style={{ fontSize: 11, color: colors.primaryText }}>{t('share.fromShareLabel')}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('share.itemCount', { count: item.collectionCount })}</Text>
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>·</Text>
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={() => handleDeleteShareList(item)}
                style={{ padding: 6 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tab 切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.tabBg, marginHorizontal: 12, marginTop: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: activeTab === 'created' ? colors.tabActiveBg : 'transparent' }}
          onPress={() => { setActiveTab('created'); }}
        >
          <Text style={{ fontSize: 13, color: activeTab === 'created' ? colors.tabActiveText : colors.tabText, fontWeight: '500' }}>
            {t('share.iCreated')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: activeTab === 'received' ? colors.tabActiveBg : 'transparent' }}
          onPress={() => setActiveTab('received')}
        >
          <Text style={{ fontSize: 13, color: activeTab === 'received' ? colors.tabActiveText : colors.tabText, fontWeight: '500' }}>
            {t('share.iReceived')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'created' && (
        <FlatList
          data={shares || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            isLoadingShares ? (
              <ShareManagementSkeleton colors={colors} />
            ) : (
              <View style={{ alignItems: 'center', marginTop: 120 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="share-social-outline" size={36} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('share.noShares')}</Text>
                <Text style={{ fontSize: 14, color: colors.textTertiary, marginBottom: 20, textAlign: 'center', paddingHorizontal: 40 }}>{t('share.createFirstHint')}</Text>
                <TouchableOpacity
                  style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 10 }}
                  onPress={() => navigation.navigate('CreateShare')}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('share.createFirst')}</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      {activeTab === 'received' && (
        <FlatList
          data={shareLists || []}
          renderItem={renderShareList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            isLoadingShareLists ? (
              <ShareManagementSkeleton colors={colors} />
            ) : (
              <View style={{ alignItems: 'center', marginTop: 120 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="download-outline" size={36} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('share.noReceived')}</Text>
                <Text style={{ fontSize: 14, color: colors.textTertiary, marginBottom: 20 }}>{t('share.receivedFromOthers')}</Text>
                <TouchableOpacity
                  style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 10 }}
                  onPress={() => setLinkInputModal(true)}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('share.openShare')}</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      <TouchableOpacity
        style={{ position: 'absolute', right: 20, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.fabBg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 }}
        onPress={handleFabPress}
      >
        <Ionicons name={activeTab === 'created' ? 'add' : 'link'} size={22} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
          {activeTab === 'created' ? t('share.createShare') : t('share.openShare')}
        </Text>
      </TouchableOpacity>

      {/* 输入分享链接 Modal */}
      <Modal
        visible={linkInputModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setLinkInputModal(false); setLinkInput(''); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '85%', maxWidth: 400 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="link" size={20} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('share.openShareLink')}</Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 16 }}>
              {t('share.enterShareCode')}
            </Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, backgroundColor: colors.inputBg, marginBottom: 8 }}
              placeholder={t('share.pasteShareLink')}
              placeholderTextColor={colors.textTertiary}
              value={linkInput}
              onChangeText={setLinkInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                onPress={() => { setLinkInputModal(false); setLinkInput(''); }}
              >
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={handleOpenShareLink}
                disabled={linkLoading}
              >
                {linkLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="open-outline" size={18} color="#fff" />
                    <Text style={{ fontSize: 16, color: '#fff', fontWeight: '600' }}>{t('share.openBtn')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
