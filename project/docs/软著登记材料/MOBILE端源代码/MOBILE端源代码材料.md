﻿﻿import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from './src/lib/react-query';
import Toast, { BaseToast, ErrorToast, InfoToast, ToastConfig, BaseToastProps } from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { useColorScheme, View, Text, TouchableOpacity, Linking, AppState, Alert, ScrollView } from 'react-native';
import { useAuthStore } from './src/store/auth';
import { api, initApiUrl } from './src/lib/api';
import { useThemeStore, lightColors, darkColors } from './src/store/theme';
import { I18nProvider, useI18n } from './src/lib/i18n';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initAnalytics, logEvent, logScreenView, setUserId, setUserProperties } from './src/lib/analytics';
import { initNotifications, getPushToken } from './src/lib/notifications';
import { CollectionViewsProvider } from './src/lib/collectionViewsContext';

import LoginScreen from './src/screens/LoginScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import TermsScreen from './src/screens/TermsScreen';
import CollectionFormScreen from './src/screens/CollectionFormScreen';
import CollectionDetailScreen from './src/screens/CollectionDetailScreen';
import PlatformSelectScreen from './src/screens/PlatformSelectScreen';
import ShareManagementScreen from './src/screens/ShareManagementScreen';
import CreateShareScreen from './src/screens/CreateShareScreen';
import ShareDetailScreen from './src/screens/ShareDetailScreen';
import AccountSettingsScreen from './src/screens/AccountSettingsScreen';
import TagManageScreen from './src/screens/TagManageScreen';
import ManagementScreen from './src/screens/ManagementScreen';
import PlatformStatsScreen from './src/screens/PlatformStatsScreen';
import TierScreen from './src/screens/TierScreen';
import TierUpgradeScreen from './src/screens/TierUpgradeScreen';
import QuickSaveSettingsScreen from './src/screens/QuickSaveSettingsScreen';
import CollectionViewConfigScreen from './src/screens/CollectionViewConfigScreen';
import TrashScreen from './src/screens/TrashScreen';
import DuplicateDetectScreen from './src/screens/DuplicateDetectScreen';
import AutoBackupScreen from './src/screens/AutoBackupScreen';
import ExportScreen from './src/screens/ExportScreen';

const Stack = createStackNavigator();
const queryClient = new QueryClient();
const navigationRef = createNavigationContainerRef();

function getActiveRouteName(state: any): string | null {
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return route.name;
}

const toastConfig: ToastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      text1Style={{ fontSize: 16, fontWeight: '600' }}
      text2Style={{ fontSize: 14 }}
      style={{ borderLeftWidth: 4, borderLeftColor: '#5B8A72' }}
    />
  ),
  error: (props: BaseToastProps) => (
    <ErrorToast
      {...props}
      text1Style={{ fontSize: 16, fontWeight: '600' }}
      text2Style={{ fontSize: 14 }}
      style={{ borderLeftWidth: 4, borderLeftColor: '#B85C5C' }}
    />
  ),
  info: (props: BaseToastProps) => (
    <InfoToast
      {...props}
      text1Style={{ fontSize: 16, fontWeight: '600' }}
      text2Style={{ fontSize: 14 }}
      style={{ borderLeftWidth: 4, borderLeftColor: '#576F9F' }}
    />
  ),
};

class ErrorBoundaryInner extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>😵</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 }}>
        Something went wrong
      </Text>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 4 }}>
        {error?.message || 'Unknown error'}
      </Text>
      <ScrollView style={{ maxHeight: 300, width: '100%', marginTop: 12, backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
        <Text style={{ fontSize: 10, color: '#999', fontFamily: 'monospace' }}>
          {error?.stack || 'No stack trace'}
        </Text>
      </ScrollView>
      <TouchableOpacity
        style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#4F46E5', borderRadius: 8 }}
        onPress={onReset}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppContent() {
  const { token, setUser } = useAuthStore();
  const resolvedTheme = useThemeStore(s => s.resolvedTheme);
  const loadTheme = useThemeStore(s => s.loadTheme);
  const setSystemTheme = useThemeStore(s => s.setSystemTheme);
  const [isLoading, setIsLoading] = useState(true);
  const systemColorScheme = useColorScheme();
  const { t } = useI18n();

  useEffect(() => {
    initAnalytics().catch(() => {});
    initNotifications().catch(() => {});
  }, []);

  const isProcessingRef = useRef(false);
  const lastCheckedRef = useRef('');
  const consentRef = useRef(false);
  const checkClipboardRef = useRef<(() => Promise<void>) | null>(null);
  const CLIPBOARD_CONSENT_KEY = 'linkchest_clipboard_consent';

  useEffect(() => {
    setSystemTheme(systemColorScheme === 'dark');
  }, [systemColorScheme, setSystemTheme]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => { subscription.remove(); };
  }, []);

  const handleDeepLink = async (url: string) => {
    if (!url) return;

    if (url.startsWith('com.linkchest.app://')) {
      try {
        const parsed = new URL(url);
        const sharedUrl = parsed.searchParams.get('url') || '';
        const sharedTitle = parsed.searchParams.get('title') || '';

        if (!sharedUrl) {
          console.log('[DeepLink] No URL param in deep link');
          return;
        }

        let userSettings: any = {};
        try {
          const res = await api.get('/users/settings');
          userSettings = res.data?.data || {};
        } catch (err) {
          console.error('[DeepLink] Load settings failed:', err);
        }

        const shareMode = userSettings.shareMode || 'off';

        if (shareMode === 'off') {
          if (navigationRef.isReady()) {
            navigationRef.navigate('QuickAdd' as never, { mode: 'quickAdd', url: sharedUrl, title: sharedTitle } as never);
          }
          return;
        }

        if (shareMode === 'quickSave') {
          if (!navigationRef.isReady()) return;
          try {
            const parseRes = await api.post('/collections/smart-parse', { input: sharedUrl.trim() });
            const smartParsed = parseRes.data?.data;
            if (!smartParsed || !smartParsed.title) {
              Toast.show({
                type: 'error',
                text1: t('common.error'),
                text2: t('add.saveFailed'),
                visibilityTime: 4000,
              });
              return;
            }

            await api.post('/collections', {
              url: smartParsed.url || sharedUrl,
              title: smartParsed.title,
              coverImage: smartParsed.coverImage || undefined,
              platform: smartParsed.platform || undefined,
              tagIds: userSettings.defaultTagIds || [],
              listIds: userSettings.defaultListId ? [userSettings.defaultListId] : undefined,
            });

            Toast.show({
              type: 'success',
              text1: t('common.success'),
              text2: t('add.addedSuccess'),
              visibilityTime: 3000,
            });
          } catch (err: any) {
            console.error('[DeepLink] Quick-save error:', err?.response?.data || err?.message || err);
            Toast.show({
              type: 'error',
              text1: t('common.error'),
              text2: t('add.saveFailed'),
              visibilityTime: 4000,
            });
          }
          return;
        }

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string | null;
  username: string | null;
  nickname: string | null;
  avatar: string | null;
  hasPassword: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setToken: async (token: string) => {
    await SecureStore.setItemAsync('linkchest_token', token);
    set({ token });
  },

  setUser: (user: User) => {
    set({ user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('linkchest_token');
    set({ token: null, user: null });
  },

  loadToken: async () => {
    const token = await SecureStore.getItemAsync('linkchest_token');
    if (token) {
      set({ token });
    }
  },
}));

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'linkchest-theme';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  colors: typeof lightColors;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
  setSystemTheme: (isDark: boolean) => void;
}

const lightColors = {
  background: '#F7F5F0',
  card: '#FFFFFF',
  cardBorder: 'rgba(27,42,74,0.08)',
  text: '#2D3142',
  textSecondary: '#5A5A5A',
  textTertiary: '#8A8175',
  textMuted: '#B0A99E',
  border: '#E8E4DC',
  borderLight: '#F0EDE6',
  primary: '#1B2A4A',
  primaryBg: 'rgba(27,42,74,0.08)',
  primaryText: '#1B2A4A',
  input: '#FFFFFF',
  inputBg: '#FFFFFF',
  headerBg: '#1B2A4A',
  headerText: '#F7F5F0',
  secondaryBg: '#EDEAE3',
  danger: '#B85C5C',
  dangerBg: 'rgba(184,92,92,0.1)',
  warning: '#C8956C',
  success: '#5B8A72',
  tagBg: 'rgba(27,42,74,0.06)',
  tagText: '#1B2A4A',
  listTagBg: 'rgba(200,149,108,0.12)',
  listTagText: '#8B6914',

  selectedBg: 'rgba(27,42,74,0.06)',
  overlay: 'rgba(15,20,25,0.5)',
  fabBg: '#1B2A4A',
  modalBg: '#FFFFFF',
  tabBg: '#1B2A4A',
  tabActiveBg: '#C8956C',
  tabText: '#8A8175',
  tabActiveText: '#F7F5F0',
  filterChipBg: '#EDEAE3',
  filterChipActiveBg: '#1B2A4A',
  filterChipText: '#5A5A5A',
  filterChipActiveText: '#F7F5F0',
  statDivider: '#E8E4DC',
  sectionBg: '#FFFFFF',
  menuBg: '#FFFFFF',
  menuBorder: '#E8E4DC',
  inactiveBg: 'rgba(184,92,92,0.1)',
  inactiveText: '#B85C5C',
  batchBg: 'rgba(27,42,74,0.06)',
  batchText: '#1B2A4A',
  surface: 'rgba(255, 255, 255, 0.8)',
  surfaceElevated: 'rgba(255, 255, 255, 0.95)',
  glow: 'rgba(200, 149, 108, 0.15)',
  glowStrong: 'rgba(200, 149, 108, 0.35)',
  shimmer: 'rgba(27, 42, 74, 0.05)',
};

const darkColors: typeof lightColors = {
  background: '#0F1419',
  card: '#1A1F2A',
  cardBorder: 'rgba(232,228,220,0.08)',
  text: '#E8E4DC',
  textSecondary: '#B0A99E',
  textTertiary: '#8A8175',
  textMuted: '#6B6560',
  border: '#2A303A',
  borderLight: '#1E242E',
  primary: '#C8956C',
  primaryBg: 'rgba(200,149,108,0.15)',
  primaryText: '#C8956C',
  input: '#1A1F2A',
  inputBg: '#1A1F2A',
  headerBg: '#0F1419',
  headerText: '#E8E4DC',
  secondaryBg: '#1E242E',
  danger: '#E07070',
  dangerBg: 'rgba(224,112,112,0.15)',

  warning: '#D4A574',
  success: '#6BA88A',
  tagBg: 'rgba(200,149,108,0.12)',
  tagText: '#D4A574',
  listTagBg: 'rgba(139,125,179,0.15)',
  listTagText: '#A599C8',
  selectedBg: 'rgba(200,149,108,0.1)',
  overlay: 'rgba(0,0,0,0.7)',
  fabBg: '#C8956C',
  modalBg: '#1A1F2A',
  tabBg: '#0F1419',
  tabActiveBg: '#C8956C',
  tabText: '#8A8175',
  tabActiveText: '#F7F5F0',
  filterChipBg: '#1E242E',
  filterChipActiveBg: '#C8956C',
  filterChipText: '#B0A99E',
  filterChipActiveText: '#0F1419',
  statDivider: '#2A303A',
  sectionBg: '#1A1F2A',
  menuBg: '#1A1F2A',
  menuBorder: '#2A303A',
  inactiveBg: 'rgba(224,112,112,0.15)',
  inactiveText: '#E07070',
  batchBg: 'rgba(200,149,108,0.1)',
  batchText: '#C8956C',
  surface: 'rgba(26, 31, 42, 0.8)',
  surfaceElevated: 'rgba(30, 36, 46, 0.95)',
  glow: 'rgba(200, 149, 108, 0.25)',
  glowStrong: 'rgba(200, 149, 108, 0.45)',
  shimmer: 'rgba(232, 228, 220, 0.05)',
};

const getResolvedTheme = (theme: Theme, isSystemDark: boolean): 'light' | 'dark' => {
  if (theme === 'system') return isSystemDark ? 'dark' : 'light';
  return theme;
};

let systemIsDark = false;

export { lightColors, darkColors };

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',
  colors: lightColors,

  setTheme: (theme: Theme) => {
    AsyncStorage.setItem(THEME_KEY, theme);
    const resolved = getResolvedTheme(theme, systemIsDark);
    set({
      theme,
      resolvedTheme: resolved,
      colors: resolved === 'dark' ? darkColors : lightColors,
    });
  },

  toggleTheme: () => {
    const { theme } = get();
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    get().setTheme(next);
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        const resolved = getResolvedTheme(saved as Theme, systemIsDark);
        set({
          theme: saved as Theme,
          resolvedTheme: resolved,
          colors: resolved === 'dark' ? darkColors : lightColors,
        });
      }
    } catch (err) {
      console.warn('Failed to load theme:', err);
    }
  },

  setSystemTheme: (isDark: boolean) => {
    systemIsDark = isDark;
    const { theme } = get();
    if (theme === 'system') {
      const resolved = isDark ? 'dark' : 'light';
      set({
        resolvedTheme: resolved,
        colors: resolved === 'dark' ? darkColors : lightColors,
      });
    }
  },
}));

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { getErrorMessage, type SupportedLocale, isValidLocale } from '@linkchest/i18n';
import { getCachedTranslation } from './i18n';

const DEFAULT_API_URL = 'https://linkchest.net/api';
const API_URL_STORAGE_KEY = 'linkchest_api_url';

let currentBaseUrl = DEFAULT_API_URL;

export const api = axios.create({
  baseURL: DEFAULT_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function initApiUrl() {
  try {
    const savedUrl = await SecureStore.getItemAsync(API_URL_STORAGE_KEY);
    if (savedUrl) {
      currentBaseUrl = savedUrl;
      api.defaults.baseURL = savedUrl;
    }
  } catch {
  }
}

export async function setApiUrl(url: string) {
  const normalized = url.endsWith('/api') ? url : url + '/api';
  currentBaseUrl = normalized;
  api.defaults.baseURL = normalized;
  await SecureStore.setItemAsync(API_URL_STORAGE_KEY, normalized);
}

export async function getApiUrl(): Promise<string> {
  try {
    const savedUrl = await SecureStore.getItemAsync(API_URL_STORAGE_KEY);
    return savedUrl || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export async function resetApiUrl() {
  currentBaseUrl = DEFAULT_API_URL;
  api.defaults.baseURL = DEFAULT_API_URL;
  await SecureStore.deleteItemAsync(API_URL_STORAGE_KEY);
}

export function getPublicBaseUrl(): string {
  return currentBaseUrl.replace('/api', '');
}

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('linkchest_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    let locale: SupportedLocale = 'en';
    try {
      const saved = await AsyncStorage.getItem('linkchest-locale');
      if (saved && isValidLocale(saved)) locale = saved;
    } catch {}

    if (error.response?.data && typeof error.response.data === 'object') {
      const errCode = error.response.data.error;
      if (typeof errCode === 'string') {
        error.response.data.message = getErrorMessage(errCode, locale);
      }
    }

    const t = (key: string) => getCachedTranslation(locale)[key] || getCachedTranslation('en')[key] || key;

    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('linkchest_token');
      const { useAuthStore } = require('../store/auth');
      useAuthStore.setState({ token: null, user: null });
    } else if (!error.response) {

      const isTimeout = error.code === 'ECONNABORTED';
      Toast.show({
        type: 'error',
        text1: isTimeout ? t('common.requestTimeout') : t('common.networkError'),
        text2: isTimeout ? t('common.tryLater') : t('common.checkNetwork'),
        visibilityTime: 3000,
      });
    } else if (error.response.status >= 500) {
      Toast.show({
        type: 'error',
        text1: t('common.serverBusy'),
        text2: t('common.tryLater'),
        visibilityTime: 3000,
      });
    } else if (error.response.status === 403) {
      const errCode = error.response.data?.error || '';
      if (typeof errCode === 'string' && errCode.startsWith('QUOTA_EXCEEDED')) {
        Toast.show({
          type: 'error',
          text1: t('error.quotaExceeded'),
          text2: t('common.tryLater'),
          visibilityTime: 4000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('common.noAccess'),
          visibilityTime: 3000,
        });
      }
    } else if (error.response.status === 429) {
      const message = error.response.data?.message || t('common.rateLimited');
      Toast.show({
        type: 'error',
        text1: message,
        text2: t('common.tryLater'),
        visibilityTime: 4000,
      });
    }
    return Promise.reject(error);
  }
);

// ===== API 辅助函数 =====

export async function uploadCover(imageData: string, originalName?: string) {
  const response = await api.post('/upload/cover', { imageData, originalName });
  return response.data?.data || response.data;
}

export async function getQuota() {
  const response = await api.get('/quota');
  return response.data?.data || response.data;
}

export async function recordShareView(shareId: string) {
  const response = await api.post(`/shares/${shareId}/view`);
  return response.data;
}

export async function importShare(shareId: string, syncTags = false) {
  const response = await api.post('/subscriptions/import', { shareId, syncTags });
  return response.data?.data || response.data;
}

export async function getMyTier() {
  const response = await api.get('/tiers/me');
  return response.data?.data || response.data;
}

export async function getTiers() {
  const response = await api.get('/tiers');
  return response.data?.data || response.data;
}

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
            <LazyImage uri={item.coverImage} style={{ width: '100%', aspectRatio: 1 }} fallbackPlatform={item.platform} />
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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { useI18n, type SupportedLocale } from '../lib/i18n';
import { ErrorCodeToI18nKey, AuthErrorCodes } from '../lib/errorCodes';
import { Ionicons } from '@expo/vector-icons';
import { usePressableScale } from '../lib/animations';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

type AccountType = 'email';

function detectAccountType(value: string): 'email' | 'unknown' {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(value)) return 'email';
  return 'unknown';
}

function getErrorMessage(errorCode: string, t: (key: string) => string): string {
  const i18nKey = ErrorCodeToI18nKey[errorCode as keyof typeof ErrorCodeToI18nKey];
  if (i18nKey) {
    return t(i18nKey);
  }
  return t('error.unknown');
}

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

export default function LoginScreen() {
  const [lang, setLang] = useState<SupportedLocale>('en');
  const colors = useThemeStore(s => s.colors);
  const { t, locale, setLocale } = useI18n();
  const navigation = useNavigation();

  useEffect(() => {
    setLang(locale);
  }, [locale]);

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const registerType: AccountType = 'email';
  const [regAccount, setRegAccount] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regReferralCode, setRegReferralCode] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotAccount, setForgotAccount] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const [showSetPassword, setShowSetPassword] = useState(false);
  const [setPwd, setSetPwd] = useState('');
  const [setPwdConfirm, setSetPwdConfirm] = useState('');
  const [setPwdLoading, setSetPwdLoading] = useState(false);

  const { setToken, setUser } = useAuthStore();

  const googleClientId = Constants.expoConfig?.extra?.googleClientId as string | undefined;
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    expoClientId: googleClientId,
    androidClientId: googleClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (id_token) {
        handleGoogleLogin(id_token);
      }
    } else if (googleResponse?.type === 'error') {
      Alert.alert(t('common.error'), t('login.googleLoginFailed'));
    }
  }, [googleResponse]);

  const handleGoogleLogin = async (credential: string) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/google', { credential, lang });
      const { token, user } = response.data;
      await setToken(token);
      setUser(user);
      if (!user.hasPassword) {
        setSetPwd('');
        setSetPwdConfirm('');
        setShowSetPassword(true);
      } else {

        navigation.replace('Main' as never);
      }
    } catch (error: any) {
      const errorCode = error.response?.data?.error || AuthErrorCodes.SERVER_ERROR;
      Alert.alert(t('common.error'), getErrorMessage(errorCode, t));
    } finally {
      setLoading(false);
    }
  };

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const handleLanguageChange = useCallback((newLang: SupportedLocale) => {
    setLang(newLang);
    setLocale(newLang);
  }, [setLocale]);

  const sendCode = async (targetAccount?: string) => {
    const target = targetAccount || regAccount;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      Alert.alert(t('common.hint'), t('error.invalidEmailFormat'));
      return;
    }

    try {
      setRegLoading(true);
      const response = await api.post('/auth/send-code', { 
        email: target,
        lang 
      });
      const realCode = response.data?.code;
      if (realCode) {
        Alert.alert(t('account.verificationCode'), t('login.yourCodeIs', { code: realCode }));
      } else {
        Alert.alert(t('common.hint'), t('login.codeSent'));
      }
      
      setCountdown(60);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      const errorCode = error.response?.data?.error || AuthErrorCodes.SERVER_ERROR;
      Alert.alert(t('common.error'), getErrorMessage(errorCode, t));
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!account || !password) {
      Alert.alert(t('common.hint'), t('login.enterAccountAndPassword'));
      return;
    }

    const accountType = detectAccountType(account);
    if (accountType === 'unknown') {
      Alert.alert(t('common.hint'), t('login.invalidAccountFormat'));
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/login-email', { email: account, password, lang });
      const { token, user } = response.data;
      
      await setToken(token);
      setUser(user);
      navigation.replace('Main' as never);
    } catch (error: any) {
      const errorCode = error.response?.data?.error || AuthErrorCodes.SERVER_ERROR;
      Alert.alert(t('common.error'), getErrorMessage(errorCode, t));
    } finally {
      setLoading(false);
    }
  };

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Share,
  Linking,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '../lib/react-query';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, setUser, logout } = useAuthStore();
  const { theme, resolvedTheme, toggleTheme, colors } = useThemeStore();
  const { t, locale, setLocale } = useI18n();
  const [showLangModal, setShowLangModal] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      try {
        const overviewRes = await api.get('/stats/overview');
        const d = overviewRes.data.data;
        return {
          collections: d?.collectionCount || 0,
          lists: d?.listCount || 0,
          shareCount: d?.shareCount || 0,
          tags: d?.tagCount || 0,
          shareViewCount: d?.shareViewCount || 0,
        };
      } catch {
        return { collections: 0, lists: 0, shareCount: 0, tags: 0, shareViewCount: 0 };
      }
    },
  });

  useFocusEffect(
    React.useCallback(() => {

      api.get('/auth/me').then((res: any) => {
        const userData = res.data.data || res.data;
        setUser(userData);
      }).catch(() => {});
      refetchStats();
    }, [refetchStats])
  );

  const handleLogout = () => {
    Alert.alert(t('profile.logoutConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logoutBtn'),
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' as any }],
          });
        },
      },
    ]);
  };

  const dataManagementItems = [
    {
      icon: 'download-outline',
      title: t('export.title'),
      onPress: () => navigation.navigate('Export' as any),
    },
    {
      icon: 'stats-chart-outline',
      title: t('profile.platformStats'),
      onPress: () => navigation.navigate('PlatformStats' as any),
    },
    {
      icon: 'scan-outline',
      title: t('settings.duplicateDetect'),
      onPress: () => navigation.navigate('DuplicateDetect' as any),
    },
    {
      icon: 'cloud-upload-outline',
      title: t('settings.autoBackup'),
      onPress: () => navigation.navigate('AutoBackup' as any),
    },

    {
      icon: 'trash-outline',
      title: t('collection.trash.title'),
      onPress: () => navigation.navigate('Trash' as any),
    },
  ];

  const systemSettingsItems = [
    {
      icon: 'flash-outline',
      title: t('profile.quickSaveSettings'),
      onPress: () => navigation.navigate('QuickSaveSettings' as any),
    },
    {
      icon: 'grid-outline',
      title: '收藏展示设置',
      onPress: () => navigation.navigate('CollectionViewConfig' as any),
    },
    {
      icon: theme === 'dark' ? 'moon-outline' : theme === 'system' ? 'phone-portrait-outline' : 'sunny-outline',
      title: theme === 'dark' ? t('profile.lightMode') : theme === 'system' ? t('profile.followSystem') : t('profile.darkMode'),
      value: theme === 'system' ? (resolvedTheme === 'dark' ? t('profile.dark') : t('profile.light')) : undefined,
      onPress: toggleTheme,
    },
    {
      icon: 'language-outline',
      title: t('profile.language'),
      value: locale === 'zh' ? t('profile.languageZh')
        : locale === 'ja' ? t('profile.languageJa')
        : locale === 'ko' ? t('profile.languageKo')
        : locale === 'fr' ? t('profile.languageFr')
        : locale === 'de' ? t('profile.languageDe')
        : t('profile.languageEn'),
      onPress: () => setShowLangModal(true),
    },
  ];

  const otherItems = [
    {
      icon: 'document-text-outline',
      title: t('terms.titleAndPrivacy'),
      onPress: () => navigation.navigate('Terms' as any, { tab: 'terms' }),
    },
    {
      icon: 'refresh-outline',
      title: t('profile.checkUpdate'),

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { api } from '../lib/api';
import { getPlatformName, getPlatformColor, getPlatformIcon } from '../lib/platforms';
import { useThemeStore } from '../store/theme';
import { useI18n, getListDisplayName, getListPathDisplayName } from '../lib/i18n';
import { logEvent } from '../lib/analytics';
import CoverEditor from '../components/CoverEditor';
import StarRating from '../components/StarRating';
import { PAGE_TYPES, DEFAULT_PAGE_TYPE, getPageTypeConfig } from '../lib/pageTypes';

type CollectionFormMode = 'quickAdd' | 'add' | 'edit';

type CollectionFormRouteProp = RouteProp<{
  CollectionForm: {
    mode: CollectionFormMode;
    id?: string;
    url?: string;
    title?: string;
    tagId?: string;
    listId?: string;
  };
}, 'CollectionForm'>;

interface Tag {
  id: string;
  name: string;
  collectionCount?: number;
}

interface ListItem {
  id: string;
  name: string;
  parentId: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  isDefault?: boolean;
  depth?: number;
  path?: { id: string; name: string; isDefault?: boolean }[];
  pathName?: string | null;
  hasChildren?: boolean;

}

interface UserSettings {
  shareMode: string;
  autoDetectLinkMode: string;
  coverStrategyOrder: string[];
  defaultListId: string | null;
  defaultTagIds: string[];
}

export default function CollectionFormScreen() {
  const route = useRoute<CollectionFormRouteProp>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const colors = useThemeStore(s => s.colors);
  const { t } = useI18n();

  const mode = route.params?.mode || 'add';
  const collectionId = route.params?.id;
  const initialUrl = route.params?.url || '';
  const initialTitle = route.params?.title || '';
  const preTagId = route.params?.tagId;
  const preListId = route.params?.listId;

  const isQuickAdd = mode === 'quickAdd';
  const isAdd = mode === 'add';
  const isEdit = mode === 'edit';

  const [url, setUrl] = useState(isEdit ? '' : initialUrl);
  const [title, setTitle] = useState(isEdit ? '' : initialTitle);
  const [coverImage, setCoverImage] = useState('');
  const [platform, setPlatform] = useState('other');
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    isQuickAdd || isAdd ? (preTagId ? [preTagId] : []) : []
  );
  const [selectedList, setSelectedList] = useState<string>(
    preListId || ''
  );
  const [selectedPageType, setSelectedPageType] = useState<string>(DEFAULT_PAGE_TYPE);
  const [rating, setRating] = useState<number | null>(null);
  const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set());

  const [tagSectionExpanded, setTagSectionExpanded] = useState(false);
  const [groupSectionExpanded, setGroupSectionExpanded] = useState(false);
  const [pageTypeSectionExpanded, setPageTypeSectionExpanded] = useState(false);

  const [newTagModalVisible, setNewTagModalVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newListModalVisible, setNewListModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');

  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsePhase, setParsePhase] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [titleDuplicateWarning, setTitleDuplicateWarning] = useState<any>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [userSettings, setUserSettings] = useState<UserSettings>({
    shareMode: 'off',
    autoDetectLinkMode: 'none',
    coverStrategyOrder: ['url', 'brand', 'ai'],
    defaultListId: null,
    defaultTagIds: [],
  });

  const titleCheckTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const titleMap = {
      quickAdd: t('quickAdd.title'),
      add: t('nav.addCollection'),
      edit: t('edit.title'),
    };
    navigation.setOptions({ title: titleMap[mode] });
  }, [mode, t]);

  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      if (!collectionId) return null;
      const response = await api.get(`/collections/${collectionId}`);
      return response.data.data || response.data;
    },
    enabled: isEdit && !!collectionId,
  });

  useEffect(() => {
    if (isEdit && collection) {
      setUrl(collection.url || '');
      setTitle(collection.title || '');
      setCoverImage(collection.coverImage || '');
      setPlatform(collection.platform || 'other');

