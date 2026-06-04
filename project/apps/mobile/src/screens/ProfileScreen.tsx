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
import { api, getSupportEmail, getDownloadUrl } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { isChinaMarket } from '../lib/market';

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
        // 使用后端专用统计端点（后台轮询：失败不弹 server busy toast）
        const overviewRes = await api.get('/stats/overview', { __silent: true } as any);
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

  // 缓存当前用户信息（避免每次进入页面都打 /auth/me）
  // staleTime: 60s 内复用缓存，避免切 Tab 触发重复请求
  const { data: cachedMe } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      // 后台缓存用户信息：失败不弹 server busy toast
      const res = await api.get('/auth/me', { __silent: true } as any);
      return res.data.data || res.data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // 屏幕获得焦点时刷新用户信息和统计数据
  // 注意：cachedMe 60s 内复用缓存，refetchStats 触发统计刷新（不触发 auth 限流）
  useFocusEffect(
    React.useCallback(() => {
      if (cachedMe) setUser(cachedMe);
      refetchStats();
    }, [cachedMe, refetchStats])
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
      title: t('settings.collectionViewTitle'),
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
      onPress: () => {
        const storeButton = isChinaMarket()
          ? {
              text: t('profile.yingyongbao'),
              onPress: () => {
                const yingyongbaoUrl = 'https://android.myapp.com/myapp/detail.htm?apkName=com.linkchest.app';
                Linking.openURL(yingyongbaoUrl).catch(() =>
                  Alert.alert(t('common.hint'), t('profile.openStoreFailed'))
                );
              },
            }
          : {
              text: 'Google Play',
              onPress: () => {
                const playUrl = 'https://play.google.com/store/apps/details?id=com.linkchest.app';
                Linking.openURL(playUrl).catch(() =>
                  Alert.alert(t('common.hint'), t('profile.openStoreFailed'))
                );
              },
            };
        Alert.alert(
          t('profile.checkUpdate'),
          t('profile.updateDesc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            storeButton,
            {
              text: t('profile.downloadApk'),
              onPress: () => {
                const apkUrl = getDownloadUrl(locale);
                Linking.openURL(apkUrl).catch(() =>
                  Alert.alert(t('common.hint'), t('profile.openDownloadFailed').replace('{url}', apkUrl))
                );
              },
            },
          ]
        );
      },
    },
    {
      icon: 'chatbubble-outline',
      title: t('profile.feedback'),
      onPress: () => {
        const supportEmail = getSupportEmail();
        Alert.alert(
          t('profile.feedback'),
          supportEmail,
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.copy'),
              onPress: async () => {
                try {
                  const { Clipboard } = await import('expo-clipboard');
                  await Clipboard.setStringAsync(supportEmail);
                  Alert.alert(t('common.success'), t('common.copied'));
                } catch {
                  Alert.alert(t('common.error'), t('common.copyFailed'));
                }
              },
            },
          ]
        );
      },
    },
  ];

  const renderSection = (title: string, items: any[], showBorder: boolean = true) => (
    <View style={{ marginTop: 8 }}>
      {title && <Text style={{ fontSize: 13, color: colors.textTertiary, marginLeft: 16, marginBottom: 6 }}>{title}</Text>}
      <View style={{ backgroundColor: colors.menuBg, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' }}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: showBorder && index < items.length - 1 ? 1 : 0, borderBottomColor: colors.menuBorder }}
            onPress={item.onPress}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <Text style={{ fontSize: 16, color: colors.text }}>{item.title}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.value && <Text style={{ fontSize: 14, color: colors.textTertiary }}>{item.value}</Text>}
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 用户信息卡片 */}
      <TouchableOpacity
        style={{
          backgroundColor: resolvedTheme === 'light' ? '#1B2A4A' : '#C8956C',
          margin: 12,
          padding: 18,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={() => navigation.navigate('AccountSettings' as any)}
        activeOpacity={0.7}
      >
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={{ width: 52, height: 52, borderRadius: 26 }} />
          ) : (
            <Ionicons name="person" size={28} color={resolvedTheme === 'light' ? '#C8956C' : '#FFFFFF'} />
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: resolvedTheme === 'light' ? '#C8956C' : '#FFFFFF' }}>{user?.username || user?.nickname || t('profile.user')}</Text>
          {user?.email ? <Text style={{ fontSize: 13, color: resolvedTheme === 'light' ? '#C8956C' : '#FFFFFF', opacity: 0.7, marginTop: 2 }}>{user.email}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={resolvedTheme === 'light' ? '#C8956C' : '#FFFFFF'} style={{ opacity: 0.7 }} />
      </TouchableOpacity>

      {/* 数据管理 */}
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 13, color: colors.textTertiary, marginLeft: 16, marginBottom: 6 }}>{t('profile.dataManagement')}</Text>

        {/* 统计卡片 */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: 12, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 12, marginBottom: 8 }}>
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => navigation.navigate('Collections' as any)}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{stats?.collections || 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{t('nav.collections')}</Text>
          </TouchableOpacity>
          <View style={{ width: 1, backgroundColor: colors.statDivider, marginVertical: 8 }} />
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => navigation.navigate('Management' as any)}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{stats?.lists || 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{t('nav.groups')}</Text>
          </TouchableOpacity>
          <View style={{ width: 1, backgroundColor: colors.statDivider, marginVertical: 8 }} />
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => navigation.navigate('Management' as any)}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{stats?.tags || 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{t('nav.tags')}</Text>
          </TouchableOpacity>
          <View style={{ width: 1, backgroundColor: colors.statDivider, marginVertical: 8 }} />
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => navigation.navigate('Shares' as any)}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{stats?.shareCount || 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{t('nav.shares')}</Text>
          </TouchableOpacity>
          <View style={{ width: 1, backgroundColor: colors.statDivider, marginVertical: 8 }} />
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => navigation.navigate('Shares' as any)}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{stats?.shareViewCount || 0}</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{t('profile.shareViews')}</Text>
          </TouchableOpacity>
        </View>

        {/* 数据管理菜单 */}
        <View style={{ backgroundColor: colors.menuBg, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' }}>
          {dataManagementItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: index < dataManagementItems.length - 1 ? 1 : 0, borderBottomColor: colors.menuBorder }}
              onPress={item.onPress}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                <Text style={{ fontSize: 16, color: colors.text }}>{item.title}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {item.value && <Text style={{ fontSize: 14, color: colors.textTertiary }}>{item.value}</Text>}
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 系统设置 */}
      {renderSection(t('profile.systemSettings'), systemSettingsItems)}

      {/* 其他 */}
      {renderSection(t('profile.other'), otherItems)}

      {/* 退出登录 */}
      <TouchableOpacity style={{ backgroundColor: colors.card, margin: 12, padding: 16, borderRadius: 12, alignItems: 'center' }} onPress={handleLogout}>
        <Text style={{ fontSize: 16, color: colors.danger, fontWeight: '500' }}>{t('profile.logout')}</Text>
      </TouchableOpacity>

      <Text style={{ textAlign: 'center', color: colors.textTertiary, fontSize: 12, marginBottom: 20 }}>LinkChest V1.0</Text>

      {/* 语言选择底部滑动 Modal */}
      <Modal
        visible={showLangModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.overlay }}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={{ flex: 1 }} />
        </TouchableOpacity>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 }}>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 12 }}>{t('profile.language')}</Text>
          {([
            { key: 'zh', label: t('profile.languageZh') },
            { key: 'en', label: t('profile.languageEn') },
            { key: 'ja', label: t('profile.languageJa') },
            { key: 'ko', label: t('profile.languageKo') },
            { key: 'fr', label: t('profile.languageFr') },
            { key: 'de', label: t('profile.languageDe') },
          ] as { key: typeof locale; label: string }[]).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.menuBorder }}
              onPress={() => { setLocale(key); setShowLangModal(false); }}
            >
              <Text style={{ fontSize: 16, color: locale === key ? colors.primary : colors.text }}>{label}</Text>
              {locale === key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={{ marginHorizontal: 20, marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.menuBg, alignItems: 'center' }}
            onPress={() => setShowLangModal(false)}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
});
