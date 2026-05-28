import React, { useEffect, useState, useRef } from 'react';
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
import { initJPush, setJPushAlias, deleteJPushAlias } from './src/lib/jpush';
import { CollectionViewsProvider } from './src/lib/collectionViewsContext';

// 页面
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

// ErrorBoundary: 捕获渲染错误，防止白屏
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

// 内部组件：在 I18nProvider 内部，可以使用 useI18n
function AppContent() {
  const { token, setUser } = useAuthStore();
  const resolvedTheme = useThemeStore(s => s.resolvedTheme);
  const loadTheme = useThemeStore(s => s.loadTheme);
  const setSystemTheme = useThemeStore(s => s.setSystemTheme);
  const [isLoading, setIsLoading] = useState(true);
  const systemColorScheme = useColorScheme();
  const { t } = useI18n();

  // Firebase Analytics & Push 初始化
  useEffect(() => {
    initAnalytics().catch(() => {});
    initNotifications().catch(() => {});
    // 国内版初始化极光推送
    initJPush().catch(() => {});
  }, []);

  // 剪贴板检测全局状态
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
    // 监听 Deep Link / 系统分享唤起
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
    // 处理 Android 系统分享 Intent（Expo scheme 格式）
    // 当其他 App 通过 ACTION_SEND 分享文本时，Expo 会以 scheme://?url=xxx 形式传入
    if (!url) return;

    // 匹配 com.linkchest.app://quick-add 格式（自定义 Deep Link）
    // 或 com.linkchest.app:// 格式（Android ACTION_SEND 分享）
    if (url.startsWith('com.linkchest.app://')) {
      try {
        const parsed = new URL(url);
        const sharedUrl = parsed.searchParams.get('url') || '';
        const sharedTitle = parsed.searchParams.get('title') || '';

        if (!sharedUrl) {
          console.log('[DeepLink] No URL param in deep link');
          return;
        }

        // 读取用户设置
        let userSettings: any = {};
        try {
          const res = await api.get('/users/settings');
          userSettings = res.data?.data || {};
        } catch (err) {
          console.error('[DeepLink] Load settings failed:', err);
        }

        const shareMode = userSettings.shareMode || 'off';

        // shareMode = off：跳转到快速添加页面
        if (shareMode === 'off') {
          if (navigationRef.isReady()) {
            navigationRef.navigate('QuickAdd' as never, { mode: 'quickAdd', url: sharedUrl, title: sharedTitle } as never);
          }
          return;
        }

        // shareMode = quickSave：直接保存
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

        // shareMode = quickPopup：弹出确认
        if (shareMode === 'quickPopup') {
          if (!navigationRef.isReady()) return;
          Alert.alert(
            t('quickAdd.quickPopupTitle'),
            t('quickAdd.quickPopupDesc', { title: sharedTitle || sharedUrl }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('quickAdd.saveDirectly'),
                style: 'default',
                onPress: async () => {
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
                  console.error('[DeepLink] Popup-save error:', err?.response?.data || err?.message || err);
                  Toast.show({
                    type: 'error',
                    text1: t('common.error'),
                    text2: t('add.saveFailed'),
                    visibilityTime: 4000,
                  });
                }
              },
            },
            {
              text: t('quickAdd.editThenSave'),
              style: 'default',
              onPress: () => {
                (navigationRef as any).navigate('QuickAdd', { mode: 'quickAdd', url: sharedUrl, title: sharedTitle });
              },
            },
          ]
        );
        return;
      }

      // 默认：打开 QuickAdd 页面
      if (navigationRef.isReady()) {
        (navigationRef as any).navigate('QuickAdd', { mode: 'quickAdd', url: sharedUrl, title: sharedTitle });
      }
    } catch (err) {
      console.warn('Deep link parse error:', url, err);
    }
  }
};

  // 初始化剪贴板授权状态
  useEffect(() => {
    AsyncStorage.getItem(CLIPBOARD_CONSENT_KEY).then(v => {
      if (v === 'granted') consentRef.current = true;
    });
  }, []);

  // 全局剪贴板检测（空依赖，永不重装）
  useEffect(() => {
    const PROCESSING_TIMEOUT = 10000;
    const RETRY_DELAYS = [200, 500, 1000, 2000];

    const checkClipboard = async (retryIndex = 0): Promise<void> => {
      if (isProcessingRef.current) {
        console.log('[Clipboard] Already processing, skip');
        return;
      }

      // 未登录不检测
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        console.log('[Clipboard] No token, skip');
        return;
      }

      isProcessingRef.current = true;

      const timeoutId = setTimeout(() => {
        console.log('[Clipboard] Processing timeout, force reset');
        isProcessingRef.current = false;
      }, PROCESSING_TIMEOUT);

      try {
        if (!navigationRef.isReady()) {
          console.log('[Clipboard] Navigation not ready, retryIndex:', retryIndex);
          if (retryIndex < RETRY_DELAYS.length) {
            setTimeout(() => {
              isProcessingRef.current = false;
              checkClipboard(retryIndex + 1);
            }, RETRY_DELAYS[retryIndex]);
            return;
          }
          console.log('[Clipboard] Navigation still not ready after all retries, give up');
          return;
        }

        // ★ 先读取用户设置，确认有开启的检测模式后才读取剪贴板
        // 避免 Android 上 getStringAsync() 触发系统 toast "已将剪贴板内容粘贴在xxx"
        let userSettings: any = {};
        try {
          const res = await api.get('/users/settings');
          userSettings = res.data?.data || {};
        } catch (err) {
          console.error('[Clipboard] Load settings failed:', err);
          return;
        }

        const autoDetectLinkMode = userSettings.autoDetectLinkMode || 'none';
        if (autoDetectLinkMode === 'none') {
          console.log('[Clipboard] autoDetectLinkMode is none, skip clipboard read');
          return;
        }

        // 设置确认开启，现在才读取剪贴板
        const text = await Clipboard.getStringAsync();
        if (!text || text.trim().length === 0) {
          console.log('[Clipboard] Empty clipboard, retryIndex:', retryIndex);
          if (retryIndex < RETRY_DELAYS.length) {
            setTimeout(() => {
              isProcessingRef.current = false;
              checkClipboard(retryIndex + 1);
            }, RETRY_DELAYS[retryIndex]);
            return;
          }
          console.log('[Clipboard] Clipboard still empty after all retries, give up');
          return;
        }
        if (text === lastCheckedRef.current) {
          console.log('[Clipboard] Same content as last check, skip');
          return;
        }

        console.log('[Clipboard] New content detected, length:', text.length, 'preview:', text.substring(0, 80));

        // 1. 优先检测分享链接 /s/xxx
        const shareMatch = text.match(/\/s\/([A-Za-z0-9_-]{6,20})/);
        if (shareMatch) {
          const shareId = shareMatch[1];
          console.log('[Clipboard] Share link detected, shareId:', shareId);
          try {
            const response = await api.get(`/s/${shareId}`);
            if (response.data?.isOwner) {
              console.log('[Clipboard] User is owner, skip');
              return;
            }
            const createdAt = response.data?.createdAt;
            if (createdAt) {
              const createdTime = new Date(createdAt).getTime();
              if (Date.now() - createdTime < 5 * 60 * 1000) {
                console.log('[Clipboard] Share created too recently, skip');
                return;
              }
            }
          } catch (err) {
            console.log('[Clipboard] Share link fetch failed, skip:', err);
            return;
          }

          lastCheckedRef.current = text;

          if (!consentRef.current) {
            await new Promise<void>((resolve) => {
              Alert.alert(
                t('share.clipboardDetected'),
                t('share.clipboardDetectedDesc'),
                [
                  { text: t('common.cancel'), style: 'cancel', onPress: () => resolve() },
                  {
                    text: t('share.viewShare'),
                    style: 'default',
                    onPress: () => {
                      consentRef.current = true;
                      AsyncStorage.setItem(CLIPBOARD_CONSENT_KEY, 'granted');
                      (navigationRef as any).navigate('ShareDetail', { shareId });
                      resolve();
                    },
                  },
                ]
              );
            });
            return;
          }

          setTimeout(() => {
            Alert.alert(
              t('share.clipboardDetected'),
              t('share.clipboardDetectedDesc'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('share.viewShare'),
                  style: 'default',
                  onPress: () => {
                    (navigationRef as any).navigate('ShareDetail', { shareId });
                  },
                },
              ]
            );
          }, 500);
          return;
        }

        // 2. 检测一般 URL
        const urlRegex = /(https?:\/\/[^\s]+)/i;
        const urlMatch = text.match(urlRegex);
        if (!urlMatch) {
          console.log('[Clipboard] No URL found in clipboard content, skip');
          return;
        }

        const detectedUrl = urlMatch[1];
        console.log('[Clipboard] URL detected:', detectedUrl);

        // 确认有有效内容需要处理后才记录，避免无效文本污染缓存
        lastCheckedRef.current = text;

        if (autoDetectLinkMode === 'openQuickAdd') {
          console.log('[Clipboard] Opening QuickAdd with URL:', detectedUrl);
          // ★ 用 navigate 而非 push：navigationRef 只有 navigate/reset/goBack，没有 push
          (navigationRef as any).navigate('QuickAdd', { mode: 'quickAdd', url: detectedUrl });
          return;
        }

        if (autoDetectLinkMode === 'autoSave') {
          console.log('[Clipboard] Auto-saving URL:', detectedUrl);
          const targetListId = userSettings.defaultListId;
          try {
            // ★ 优化体验：先创建收藏（用URL做标题），再异步解析更新
            const createRes = await api.post('/collections', {
              url: detectedUrl,
              title: detectedUrl, // 临时标题，后续异步更新
              tagIds: userSettings.defaultTagIds || [],
              listIds: targetListId ? [targetListId] : undefined,
            });

            const collectionId = createRes.data?.data?.id;
            console.log('[Clipboard] Collection created, id:', collectionId);

            // 先提示保存成功
            Toast.show({
              type: 'success',
              text1: t('common.success'),
              text2: t('add.addedSuccess'),
              visibilityTime: 3000,
            });

            // 刷新首页列表
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            queryClient.invalidateQueries({ queryKey: ['quota'] });

            // 异步解析并更新标题、封面、平台
            if (collectionId) {
              api.post('/collections/smart-parse', { input: detectedUrl.trim() })
                .then(async (parseRes) => {
                  const parsed = parseRes.data?.data;
                  if (parsed && (parsed.title || parsed.coverImage || parsed.platform)) {
                    const updateData: any = {};
                    if (parsed.title && parsed.title !== detectedUrl) updateData.title = parsed.title;
                    if (parsed.coverImage) updateData.coverImage = parsed.coverImage;
                    if (parsed.platform) updateData.platform = parsed.platform;
                    if (parsed.url) updateData.url = parsed.url;

                    await api.put(`/collections/${collectionId}`, updateData);
                    console.log('[Clipboard] Collection updated with parsed metadata');
                    // 再次刷新首页
                    queryClient.invalidateQueries({ queryKey: ['collections'] });
                  }
                })
                .catch((err) => {
                  console.log('[Clipboard] Background parse failed, collection saved with URL as title:', err?.message);
                });
            }
          } catch (err: any) {
            console.error('[Clipboard] Auto-save error:', err?.response?.data || err?.message || err);
            Toast.show({
              type: 'error',
              text1: t('common.error'),
              text2: t('add.saveFailed'),
              visibilityTime: 4000,
            });
          }
          return;
        }

        console.log('[Clipboard] Unknown autoDetectLinkMode:', autoDetectLinkMode);
      } catch (err) {
        console.error('[Clipboard] Unexpected error:', err);
      } finally {
        clearTimeout(timeoutId);
        isProcessingRef.current = false;
      }
    };

    checkClipboardRef.current = checkClipboard as any;
    checkClipboard();

    // ★ 主要检测机制：剪贴板内容变化时主动触发
    const clipboardSubscription = Clipboard.addClipboardListener(() => {
      console.log('[Clipboard] Clipboard changed, trigger check');
      setTimeout(() => checkClipboard(), 300);
    });

    // 补充检测：App 回到前台时触发（处理后台期间剪贴板已变化的情况）
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[Clipboard] AppState active, trigger check');
        setTimeout(() => checkClipboard(), 500);
      }
    });

    return () => {
      clipboardSubscription.remove();
      appStateSubscription.remove();
    };
  }, []); // 空依赖，永不重装

  // 追踪用户是否在本会话中登录过，用于控制登出后是否回到登录页
  const wasEverLoggedInRef = useRef(false);

  useEffect(() => {
    if (token) {
      wasEverLoggedInRef.current = true;
    }
  }, [token]);

  const checkAuth = async () => {
    try {
      // 并行初始化，减少白屏时间
      const [, , storedToken] = await Promise.all([
        initApiUrl(),
        loadTheme(),
        SecureStore.getItemAsync('linkchest_token'),
      ]);

      if (storedToken) {
        useAuthStore.setState({ token: storedToken });
        wasEverLoggedInRef.current = true;
        // 异步验证用户，不阻塞 UI 渲染
        api.get('/auth/me').then((response) => {
          const userData = response.data.data || response.data;
          setUser(userData);
          // 登录成功后清空剪贴板缓存，允许重新检测
          lastCheckedRef.current = '';
          // Firebase Analytics 设置用户ID和属性
          if (userData?.id) {
            setUserId(userData.id);
            setUserProperties({
              tier: userData.userTier || 'medium',
              lang: userData.lang || 'zh',
              auth_source: userData.authSource || 'email',
            });
            logEvent('login', { method: userData.authSource || 'email' });
          }
          // 获取并上报 Push Token
          getPushToken().then((pushToken) => {
            if (pushToken) {
              api.patch('/users/profile', { pushToken }).catch(() => {});
            }
          }).catch(() => {});
        }).catch(() => {
          // 认证失败，清理 token
          SecureStore.deleteItemAsync('linkchest_token');
          useAuthStore.setState({ token: null, user: null });
        });
      }
    } catch (error) {
      // 初始化失败
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  const brandTheme = resolvedTheme === 'dark' ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: darkColors.primary,
      background: darkColors.background,
      card: darkColors.card,
      text: darkColors.text,
      border: darkColors.border,
      notification: darkColors.primary,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: lightColors.primary,
      background: lightColors.background,
      card: lightColors.card,
      text: lightColors.text,
      border: lightColors.border,
      notification: lightColors.primary,
    },
  };

  return (
    <ErrorBoundaryInner>
      <NavigationContainer
        ref={navigationRef}
        theme={brandTheme}
        onReady={() => {
          // addClipboardListener 已覆盖冷启动场景，无需额外检测
        }}
        onStateChange={(state) => {
          if (state) {
            const routeName = getActiveRouteName(state);
            if (routeName) {
              logScreenView(routeName, 'App');
            }
          }
        }}
      >
        <Stack.Navigator
          initialRouteName={wasEverLoggedInRef.current ? 'Main' : (token ? 'Main' : 'Login')}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen 
            name="AddCollection" 
            component={CollectionFormScreen}
            options={{ 
              headerShown: true,
              title: t('nav.addCollection'),
              presentation: 'modal'
            }}
            initialParams={{ mode: 'add' }}
          />
          <Stack.Screen 
            name="CollectionDetail" 
            component={CollectionDetailScreen}
            options={{ 
              headerShown: true,
              title: t('nav.collectionDetail')
            }}
          />
          <Stack.Screen 
            name="EditCollection" 
            component={CollectionFormScreen}
            options={{ 
              headerShown: true,
              title: t('edit.title')
            }}
          />
          <Stack.Screen 
            name="PlatformSelect" 
            component={PlatformSelectScreen}
            options={{ 
              headerShown: true,
              title: '选择平台'
            }}
          />
          <Stack.Screen 
            name="ShareManagement" 
            component={ShareManagementScreen}
            options={{ 
              headerShown: true,
              title: t('share.shareLinks')
            }}
          />
          <Stack.Screen 
            name="CreateShare" 
            component={CreateShareScreen}
            options={{ 
              headerShown: true,
              title: t('share.createShare')
            }}
          />
          <Stack.Screen 
            name="ShareDetail" 
            component={ShareDetailScreen}
            options={{ 
              headerShown: true,
              title: t('nav.shareDetail')
            }}
          />
          <Stack.Screen 
            name="AccountSettings" 
            component={AccountSettingsScreen}
            options={{ 
              headerShown: true,
              title: t('profile.accountSettings')
            }}
          />
          <Stack.Screen 
            name="TagManage" 
            component={TagManageScreen}
            options={{ 
              headerShown: true,
              title: t('profile.tagManagement')
            }}
          />
          <Stack.Screen 
            name="PlatformStats" 
            component={PlatformStatsScreen}
            options={{ 
              headerShown: true,
              title: t('profile.platformStats')
            }}
          />
          <Stack.Screen 
            name="Tier" 
            component={TierScreen}
            options={{ 
              headerShown: true,
              title: t('tier.title')
            }}
          />
          <Stack.Screen 
            name="TierUpgrade" 
            component={TierUpgradeScreen}
            options={{ 
              headerShown: true,
              title: t('tier.comparePlans')
            }}
          />
          <Stack.Screen 
            name="Terms" 
            component={TermsScreen}
            options={{ 
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="QuickAdd" 
            component={CollectionFormScreen}
            options={{ 
              headerShown: true,
              title: t('quickAdd.title'),
              presentation: 'modal'
            }}
            initialParams={{ mode: 'quickAdd' }}
          />
          <Stack.Screen 
            name="QuickSaveSettings" 
            component={QuickSaveSettingsScreen}
            options={{ 
              headerShown: true,
              title: t('account.quickSaveSettings'),
            }}
          />
          <Stack.Screen 
            name="CollectionViewConfig" 
            component={CollectionViewConfigScreen}
            options={{ 
              headerShown: true,
              title: '收藏展示设置',
            }}
          />
          <Stack.Screen 
            name="Trash" 
            component={TrashScreen}
            options={{ 
              headerShown: true,
              title: t('collection.trash.title'),
            }}
          />
          <Stack.Screen 
            name="DuplicateDetect" 
            component={DuplicateDetectScreen}
            options={{ 
              headerShown: true,
              title: t('settings.duplicateDetect'),
            }}
          />
          <Stack.Screen 
            name="AutoBackup" 
            component={AutoBackupScreen}
            options={{ 
              headerShown: true,
              title: t('settings.autoBackup'),
            }}
          />
          <Stack.Screen 
            name="Export" 
            component={ExportScreen}
            options={{ 
              headerShown: true,
              title: t('export.title'),
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Toast config={toastConfig} />
    </ErrorBoundaryInner>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundaryInner>
        <I18nProvider>
          <CollectionViewsProvider>
            <AppContent />
          </CollectionViewsProvider>
        </I18nProvider>
      </ErrorBoundaryInner>
    </QueryClientProvider>
  );
}

// 注册根组件
registerRootComponent(App);
