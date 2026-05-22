﻿﻿import React, { useLayoutEffect, useCallback } from 'react';
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
  platform: string;
  note: string | null;
  tags?: { id: string; name: string }[];
  lists?: { id: string; name: string }[];
  createdAt: string;

  rating?: number | null;
  pageType?: string | null;
}

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
      <LazyImage uri={collection.coverImage} style={{ width: '100%', aspectRatio: 16 / 9 }} fallbackPlatform={collection.platform} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 }} numberOfLines={2}>{collection.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name={getPlatformIcon(collection.platform) as any} size={16} color={platformColor} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: platformColor + '15' }}>

            <Text style={{ fontSize: 12, fontWeight: '600', color: platformColor }}>
              {getPlatformName(collection.platform)}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={openUrl} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, color: colors.textSecondary }} numberOfLines={1}>{collection.url}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name={PAGE_TYPE_ICONS[pageType] as any} size={16} color={colors.primary} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.primaryBg }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
              {PAGE_TYPE_NAMES[pageType] || '其他'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Ionicons name="star-outline" size={16} color={colors.textTertiary} />
          <StarRating
            value={collection.rating || null}
            onChange={handleRatingChange}
            size={20}
          />
        </View>

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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { useAuthStore } from '../store/auth';
import { api, setApiUrl, resetApiUrl, getApiUrl } from '../lib/api';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';

export default function AccountSettingsScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const colors = useThemeStore(s => s.colors);
  const { t, locale } = useI18n();

  const [usernameModal, setUsernameModal] = useState(false);
  const [usernameValue, setUsernameValue] = useState(user?.username || '');

  const [passwordModal, setPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailModal, setEmailModal] = useState(false);
  const [emailValue, setEmailValue] = useState(user?.email || '');
  const [emailCode, setEmailCode] = useState('');
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [emailSending, setEmailSending] = useState(false);
  const emailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [serverModal, setServerModal] = useState(false);
  const [serverValue, setServerValue] = useState('');
  const [currentServer, setCurrentServer] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [tierData, setTierData] = useState<any>(null);
  const [tierLoading, setTierLoading] = useState(true);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState(false);

  useEffect(() => {
    loadTier();
  }, []);

  useEffect(() => {
    loadReferralData();
  }, []);

  async function loadTier() {
    try {
      setTierLoading(true);
      const res = await api.get('/tiers/me');
      setTierData(res.data?.data || res.data);
    } catch {
    } finally {
      setTierLoading(false);
    }
  }

  async function loadReferralData() {
    try {
      setReferralLoading(true);
      setReferralError(false);
      const codeRes = await api.post('/referrals/code');
      setReferralCode(codeRes.data?.data?.code || null);
      const statsRes = await api.get('/referrals/stats');
      setReferralStats(statsRes.data?.data || null);
    } catch {
      setReferralError(true);
    } finally {
      setReferralLoading(false);
    }
  }

  function formatPrice(pricing: any): string {
    if (!pricing || typeof pricing !== 'object') return t('tier.free');
    const monthly = pricing.monthly;
    if (monthly && typeof monthly === 'object' && 'usd' in monthly) {
      const usd = monthly.usd;
      if (typeof usd === 'number' && usd > 0) {
        return `$${(usd / 100).toFixed(2)}${t('tier.perMonth')}`;
      }
    }
    return t('tier.free');
  }

  const tierColor = (k: string) => ({ medium: '#8A8175', heavy: '#1B2A4A', super: '#C8956C' }[k] || colors.primary);

  React.useEffect(() => {
    getApiUrl().then(url => setCurrentServer(url.replace('/api', '')));
  }, []);

  const { data: systemCoversData } = useQuery({
    queryKey: ['systemCovers'],
    queryFn: async () => {
      const response = await api.get('/upload/system-covers');
      return response.data;
    },
    enabled: showCoverPicker,
  });

  const { data: coverLibraryData } = useQuery({
    queryKey: ['coverLibrary'],
    queryFn: async () => {
      const response = await api.get('/upload/covers?limit=50');
      return response.data;
    },
    enabled: showCoverPicker,
  });

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.patch('/auth/profile', data),
    onSuccess: () => {
      api.get('/auth/me').then((res: any) => {
        setUser(res.data.data || res.data);
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('common.operationFailed'));
    },
  });

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import Toast from 'react-native-toast-message';
import { api } from '../lib/api';
import { getPlatformIcon, getPlatformName } from '../lib/platforms';
import { useThemeStore } from '../store/theme';
import { useI18n, getListPathDisplayName } from '../lib/i18n';
import { logEvent } from '../lib/analytics';

interface List {
  id: string;
  name: string;
  parentId: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  isDefault?: boolean;
  depth?: number;
  path?: { id: string; name: string; isDefault?: boolean }[];
  pathName?: string | null;
}

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
}

type ShareType = 'ALL' | 'COLLECTION' | 'LIST' | 'TAG';
type ExpiresIn = '1h' | '24h' | '1w' | 'never';

export default function CreateShareScreen() {
  const navigation = useNavigation();
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();

  const queryClient = useQueryClient();
  const [shareType, setShareType] = useState<ShareType>('ALL');
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [shareTitle, setShareTitle] = useState('');
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('never');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: lists } = useQuery({
    queryKey: ['lists'],
    queryFn: async () => {
      const response = await api.get('/lists/flat');
      return (response.data.data || response.data) as List[];
    },
  });

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags');
      return (response.data.data || response.data) as Tag[];
    },
  });

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await api.get('/collections');
      return (response.data.data || response.data) as Collection[];
    },
  });

  const [returnedPassword, setReturnedPassword] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/shares', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
      logEvent('create_share', { type: shareType });
      const shareUrl = response.data.shareUrl;
      setGeneratedLink(shareUrl);

      if (response.data.password) {
        setReturnedPassword(response.data.password);
      }
      Toast.show({ type: 'success', text1: t('share.create.linkGenerated') });
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('share.create.createFailed'));
    },
  });

  const handleCreate = () => {
    let defaultTitle = '';
    const data: any = { type: shareType, expiresIn, description: description.trim() || undefined };

    if (password.trim()) {
      data.password = password.trim();
    }

    switch (shareType) {
      case 'ALL':
        defaultTitle = t('share.typeAll');
        break;
      case 'COLLECTION':
        if (selectedCollections.length === 0) {
          Alert.alert(t('common.hint'), t('share.create.pleaseSelectCollection'));
          return;
        }
        defaultTitle = t('share.create.collectionShare', { count: selectedCollections.length });
        data.collectionIds = selectedCollections;
        break;
      case 'LIST':
        if (selectedLists.length === 0) {
          Alert.alert(t('common.hint'), t('share.create.pleaseSelectGroup'));
          return;
        }
        defaultTitle = selectedLists.length === 1
          ? lists?.find((l) => l.id === selectedLists[0])?.name || t('share.create.groupShare')
          : t('share.create.groupsShare', { count: selectedLists.length });
        data.listIds = selectedLists;
        break;
      case 'TAG':
        if (selectedTags.length === 0) {
          Alert.alert(t('common.hint'), t('share.create.pleaseSelectTag'));
          return;
        }
        defaultTitle = selectedTags.length === 1
          ? `#${tags?.find((t) => t.id === selectedTags[0])?.name}` || t('share.create.tagShare')
          : t('share.create.tagsShare', { count: selectedTags.length });
        data.tagIds = selectedTags;
        break;
    }

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '../lib/react-query';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import LazyImage from '../components/LazyImage';
import { useThemeStore } from '../store/theme';
import { api, getPublicBaseUrl, recordShareView } from '../lib/api';
import { getPlatformName, getPlatformColor, getPlatformIcon, getPlatformConfig, buildDeepLink } from '../lib/platforms';
import { useI18n } from '../lib/i18n';
import { ShareDetailSkeleton } from '../components/SkeletonComponents';
import StarRating from '../components/StarRating';

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
  url?: string;
  rating?: number | null;
}

interface ShareData {
  id: string;
  title: string;
  description: string | null;
  hasPassword: boolean;
  needsPassword?: boolean;
  password?: string;
  shareUrl?: string;
  isOwner: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  viewCount?: number;
  collections: Collection[];
}

type ShareDetailRouteProp = RouteProp<{ ShareDetail: { shareId: string; isOwner?: boolean; password?: string } }, 'ShareDetail'>;

export default function ShareDetailScreen() {
  const route = useRoute<ShareDetailRouteProp>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const { shareId, isOwner: navIsOwner, password: navPassword } = route.params;

  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isOwner, setIsOwner] = useState(navIsOwner || false);

  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [savePasswordModal, setSavePasswordModal] = useState(false);
  const [savePasswordInput, setSavePasswordInput] = useState('');
  const [savePasswordError, setSavePasswordError] = useState('');

  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; undoId?: string }>({ visible: false, message: '' });
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isLocked = data?.hasPassword && !isOwner && !isPasswordVerified;

  const fetchShareData = useCallback(async (isMounted = true) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/s/${shareId}`);
      if (!isMounted) return;
      const result = response.data;

      if (result.isExpired) {
        setIsExpired(true);
        setData(result);
        setLoading(false);
        return;
      }

      if (result.isOwner) {
        setData(result);
        setIsOwner(true);
        setLoading(false);
        return;
      }

      if (navIsOwner) {
        setIsOwner(true);
        setData({
          ...result,
          isOwner: true,
        });
        setLoading(false);
        return;
      }

      setData(result);
      setIsOwner(result.isOwner || false);
      recordShareView(shareId).catch(() => {});
      if (result.hasPassword && !result.isOwner) {
        try {
          const savedPassword = await AsyncStorage.getItem(`linkchest-share-pwd-${shareId}`);
          if (savedPassword) {
            const verifyRes = await api.post(`/s/${shareId}/verify`, { password: savedPassword });
            setData((prev: any) => ({ ...prev, ...verifyRes.data, needsPassword: false }));
            setIsPasswordVerified(true);
            setVerifiedPassword(savedPassword);
          }
        } catch {
        }
      }
    } catch (err: any) {
      if (!isMounted) return;
      setError(err.response?.data?.message || err.response?.data?.error || err.message || t('share.view.loadFailed'));
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [shareId, navIsOwner, t]);

  useFocusEffect(useCallback(() => {
    let isMounted = true;
    fetchShareData(isMounted);
    return () => { isMounted = false; };
  }, [fetchShareData]));

  const handleVerifyPassword = async () => {
    if (!passwordInput.trim()) {
      setPasswordError(t('share.view.pleaseEnterPassword'));
      return;
    }
    setVerifying(true);
    setPasswordError('');
    try {
      const response = await api.post(`/s/${shareId}/verify`, { password: passwordInput.trim() });
      const verifiedData = response.data;
      setData({
        ...data!,
        ...verifiedData,
        needsPassword: false,
      });

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

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share as RNShare,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useThemeStore } from '../store/theme';
import { useI18n } from '../lib/i18n';
import { api } from '../lib/api';

type ExportFormat = 'json' | 'csv' | 'html';

interface FormatOption {
  key: ExportFormat;
  icon: string;
  ext: string;
  mimeType: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { key: 'json', icon: 'code-slash-outline', ext: 'json', mimeType: 'application/json' },
  { key: 'csv', icon: 'grid-outline', ext: 'csv', mimeType: 'text/csv' },
  { key: 'html', icon: 'globe-outline', ext: 'html', mimeType: 'text/html' },
];

export default function ExportScreen() {
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    const opt = FORMAT_OPTIONS.find(o => o.key === format)!;
    setExporting(format);
    try {
      const response = await api.get(`/collections/export?format=${format}`, {
        responseType: format === 'json' ? 'json' : 'text',
      });

      let content: string;
      if (format === 'json') {
        const exportData = response.data?.data || response.data;
        content = JSON.stringify(exportData, null, 2);
      } else {
        content = typeof response.data === 'string' ? response.data : String(response.data);
      }

      const filename = `linkchest-export.${opt.ext}`;
      const filePath = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await RNShare.share({
          message: format === 'csv' ? content : content.substring(0, 60000),
          title: t('export.shareTitle'),
        });

        Alert.alert(
          t('common.success'),
          t('export.successMsg') + '\n\n' + t('export.filePath') + filePath
        );
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setExporting(null);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('export.formatGroupA')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
            {t('export.formatGroupADesc')}
          </Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <FormatButton
              icon={FORMAT_OPTIONS[0].icon}
              title="JSON"
              desc={t('export.jsonDesc')}
              loading={exporting === 'json'}
              colors={colors}
              onPress={() => handleExport('json')}
            />

            <FormatButton
              icon={FORMAT_OPTIONS[2].icon}
              title="HTML"
              desc={t('export.htmlDesc')}
              loading={exporting === 'html'}
              colors={colors}
              onPress={() => handleExport('html')}
            />
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('export.formatGroupB')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
            {t('export.formatGroupBDesc')}
          </Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <FormatButton
              icon={FORMAT_OPTIONS[1].icon}
              title="CSV"
              desc={t('export.csvDesc')}
              loading={exporting === 'csv'}
              colors={colors}
              onPress={() => handleExport('csv')}
            />
          </View>
        </View>

        <View style={{ backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', borderWidth: 1, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>{t('export.hintTitle')}</Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>{t('export.hintDesc')}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function FormatButton({ icon, title, desc, loading, colors, onPress }: {
  icon: string;
  title: string;
  desc: string;
  loading: boolean;
  colors: any;
  onPress: () => void;
}) {

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

import React, { useState, useEffect } from 'react';
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
import { useMutation, useQuery } from '../lib/react-query';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';

export default function AutoBackupScreen() {
  const { user } = useAuthStore();
  const { colors } = useThemeStore();
  const { t } = useI18n();

  const [backupFreq, setBackupFreq] = useState<'off' | 'weekly' | 'monthly'>('off');

  const userTier = (user as any)?.userTier || 'medium';
  const canUseBackup = userTier === 'heavy' || userTier === 'super';

  const { data: userSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['user-settings-backup'],
    queryFn: async () => {
      const r = await api.get('/users/settings');
      return (r.data.data || r.data) as Record<string, unknown>;
    },
  });

  useEffect(() => {
    if (userSettings) {
      const freq = userSettings.backupFrequency as 'off' | 'weekly' | 'monthly' | undefined;
      if (freq) setBackupFreq(freq);
    }
  }, [userSettings]);

  const saveBackupMutation = useMutation({
    mutationFn: (data: { backupFrequency: string; backupFormat: string }) =>
      api.put('/users/settings', data),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('settings.backupSaved'));
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      Alert.alert(t('common.error'), msg);
    },
  });

  const [backingUp, setBackingUp] = useState(false);

  const handleImmediateBackup = async () => {
    setBackingUp(true);
    try {
      const response = await api.post('/users/backup');
      const result = response.data?.data;
      Alert.alert(
        t('common.success'),
        `备份成功！\n共备份 ${result?.count || 0} 条收藏\n时间：${new Date(result?.timestamp || Date.now()).toLocaleString()}`
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message || t('common.operationFailed');
      if (msg.includes('云端存储暂不可用')) {
        Alert.alert(t('common.hint'), '云端存储暂不可用，请稍后重试');
      } else {
        Alert.alert(t('common.error'), msg);
      }
    } finally {
      setBackingUp(false);
    }
  };

  if (!canUseBackup) {
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

  const options: { value: 'off' | 'weekly' | 'monthly'; label: string; icon: string }[] = [
    { value: 'off', label: t('settings.backupOff'), icon: 'close-circle-outline' },
    { value: 'weekly', label: t('settings.backupWeekly'), icon: 'calendar-outline' },
    { value: 'monthly', label: t('settings.backupMonthly'), icon: 'calendar-clear-outline' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: 16, gap: 16 }}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('settings.backupFrequency')}</Text>

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

