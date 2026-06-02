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

  // 密码遮罩模式
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState(''); // 已验证的密码，保存时传给后端
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // 保存时密码模态框（仅在已解锁但保存时需要密码的场景）
  const [savePasswordModal, setSavePasswordModal] = useState(false);
  const [savePasswordInput, setSavePasswordInput] = useState('');
  const [savePasswordError, setSavePasswordError] = useState('');

  // 撤销 Snackbar
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; undoId?: string }>({ visible: false, message: '' });
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 是否处于锁定状态（有密码 + 非创建者 + 未验证）
  const isLocked = data?.hasPassword && !isOwner && !isPasswordVerified;

  const fetchShareData = useCallback(async (isMounted = true) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/s/${shareId}`);
      if (!isMounted) return;
      const result = response.data;
      
      // 检查过期
      if (result.isExpired) {
        setIsExpired(true);
        setData(result);
        setLoading(false);
        return;
      }
      
      // 如果是创建者，直接显示
      if (result.isOwner) {
        setData(result);
        setIsOwner(true);
        setLoading(false);
        return;
      }

      // 如果从导航参数知道是 owner，也直接显示
      if (navIsOwner) {
        setIsOwner(true);
        setData({
          ...result,
          isOwner: true,
        });
        setLoading(false);
        return;
      }
      
      // 非创建者：显示数据（如果有密码则进入遮罩模式）
      setData(result);
      setIsOwner(result.isOwner || false);
      // 登录用户浏览后自动上报（静默处理失败）
      recordShareView(shareId).catch(() => {});
      // 检查本地是否已保存过该分享的密码
      if (result.hasPassword && !result.isOwner) {
        try {
          const savedPassword = await AsyncStorage.getItem(`linkchest-share-pwd-${shareId}`);
          if (savedPassword) {
            // 尝试用保存的密码自动验证
            const verifyRes = await api.post(`/s/${shareId}/verify`, { password: savedPassword });
            setData((prev: any) => ({ ...prev, ...verifyRes.data, needsPassword: false }));
            setIsPasswordVerified(true);
            setVerifiedPassword(savedPassword);
          }
        } catch {
          // 自动验证失败，保持锁定状态
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

  // 密码验证
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
      // 用验证后返回的完整数据替换当前数据
      setData({
        ...data!,
        ...verifiedData,
        needsPassword: false,
      });
      setIsPasswordVerified(true);
      setVerifiedPassword(passwordInput.trim());
      setPasswordInput('');
      // 保存密码到本地，下次免输入
      AsyncStorage.setItem(`linkchest-share-pwd-${shareId}`, passwordInput.trim());
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || t('share.view.passwordWrong');
      setPasswordError(errMsg);
    } finally {
      setVerifying(false);
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

  const shareLink = () => {
    const link = data?.shareUrl || `${getPublicBaseUrl()}/s/${shareId}`;
    Share.share({
      message: link,
    });
  };

  // 一键保存
  const saveMutation = useMutation({
    mutationFn: (password?: string) => {
      const body: Record<string, string> = {};
      if (password) body.password = password;
      return api.post(`/s/${shareId}/save`, body);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });

      // 已导入过，显示友好提示
      if (response.data?.alreadyImported) {
        Alert.alert(t('share.view.importAlreadyImported'), t('share.view.importAlreadyImportedDesc', { name: response.data?.existingListName || '' }));
        setSavePasswordModal(false);
        setSavePasswordInput('');
        setSavePasswordError('');
        return;
      }

      const savedListId = response.data?.data?.listId || response.data?.listId;
      setSnackbar({ visible: true, message: t('share.view.savedToNewGroup'), undoId: savedListId });
      setSavePasswordModal(false);
      setSavePasswordInput('');
      setSavePasswordError('');
      undoTimerRef.current = setTimeout(() => setSnackbar({ visible: false, message: '' }), 5000);
    },
    onError: (error: any) => {
      let errMsg = t('share.view.saveFailed');
      if (error.response?.status === 403 && error.response?.data?.needPassword) {
        errMsg = t('share.view.needPasswordDesc');
      } else if (error.response?.status === 401) {
        errMsg = t('share.view.passwordWrong');
      } else if (error.response?.data?.message || error.response?.data?.error) {
        errMsg = error.response?.data?.message || error.response.data.error;
      }
      if (savePasswordModal) {
        setSavePasswordError(errMsg);
      } else {
        Alert.alert(t('share.view.saveFailed'), errMsg);
      }
    },
  });

  // 批量同步封面
  const syncCoversMutation = useMutation({
    mutationFn: () => api.post(`/import/${shareId}/sync-covers`),
    onSuccess: (response) => {
      const { synced, skipped, failed } = response.data?.data || {};
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      Toast.show({
        type: 'success',
        text1: t('share.view.syncCoversSuccess', { synced: synced || 0, skipped: skipped || 0 }),
      });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.response?.data?.error || t('share.view.syncCoversFailed');
      Alert.alert(t('common.error'), msg);
    },
  });

  // 撤销保存
  const handleUndo = async () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (snackbar.undoId) {
      try {
        await api.delete(`/lists/${snackbar.undoId}`);
        queryClient.invalidateQueries({ queryKey: ['collections'] });
        queryClient.invalidateQueries({ queryKey: ['lists'] });
        setSnackbar({ visible: false, message: '' });
      } catch {
        setSnackbar({ visible: false, message: '' });
      }
    }
  };

  const handleSave = () => {
    // 如果已通过密码验证，保存时不需要再输密码（后端验证已通过的数据不需要密码）
    // 但如果未验证密码且有密码（理论上不会到这，因为锁定时按钮隐藏），仍需要密码
    if (data?.hasPassword && !isOwner && !isPasswordVerified) {
      setSavePasswordModal(true);
      return;
    }
    // 如果有密码且已验证，保存时传已验证的密码
    if (data?.hasPassword && !isOwner && isPasswordVerified) {
      doCheckAndConfirm(verifiedPassword);
      return;
    }
    doCheckAndConfirm();
  };

  // 预检并显示确认
  const doCheckAndConfirm = async (password?: string) => {
    try {
      const params = new URLSearchParams();
      if (password) params.set('password', password);
      const response = await api.get(`/s/check/${shareId}?${params}`);
      const result = response.data;

      if (!result.canImport) {
        if (result.reason === 'already_imported') {
          Alert.alert(t('share.view.importAlreadyImported'), t('share.view.importAlreadyImportedDesc', { name: result.existingListName || '' }));
        } else if (result.reason === 'list_limit_reached') {
          Alert.alert(t('share.view.importListLimitReached'), t('share.view.importListLimitReachedDesc', { current: result.currentListCount, limit: result.listLimit }));
        } else if (result.reason === 'collection_limit_reached') {
          Alert.alert(t('share.view.importCollectionLimitReached'), t('share.view.importCollectionLimitReachedDesc', { current: result.currentCollectionCount || 0, limit: result.collectionLimit }));
        } else if (result.needPassword) {
          setSavePasswordModal(true);
        }
        return;
      }

      // 确认导入
      Alert.alert(
        t('share.view.importConfirmTitle'),
        t('share.view.importConfirmDesc', {
          total: result.totalCount,
          duplicate: result.duplicateCount,
          new: result.newCount,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('share.view.importBtn'),
            onPress: () => saveMutation.mutate(password),
          },
        ]
      );
    } catch {
      Toast.show({ type: 'error', text1: t('share.view.checkFailed') });
    }
  };

  const handleSavePasswordSubmit = () => {
    if (!savePasswordInput.trim()) {
      setSavePasswordError(t('share.view.pleaseEnterPassword'));
      return;
    }
    setSavePasswordError('');
    doCheckAndConfirm(savePasswordInput);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 16, color: colors.textTertiary, marginTop: 12 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
        <Text style={{ fontSize: 16, color: colors.textTertiary, marginTop: 12, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  // 过期提示
  if (isExpired) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
        <Ionicons name="time-outline" size={64} color={colors.warning} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.warning, marginTop: 16 }}>{t('share.view.shareExpired')}</Text>
        <Text style={{ fontSize: 14, color: colors.textTertiary, marginTop: 8 }}>{t('share.view.shareExpiredDesc')}</Text>
      </View>
    );
  }

  if (!data) return null;

  const renderItem = ({ item }: { item: Collection }) => (
    <TouchableOpacity 
      style={{ backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}
      onPress={() => item.url ? openUrl(item.url, item.platform) : undefined}
      activeOpacity={0.7}
      disabled={isLocked}
    >
      <View style={{ opacity: isLocked ? 0.3 : 1 }}>
        <LazyImage uri={item.coverStrategy === 'brand' ? null : item.coverImage} style={{ width: '100%', height: 180 }} fallbackPlatform={item.platform} fallbackTitle={item.title} showGradientFallback={item.coverStrategy === 'brand'} />
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <Ionicons name={getPlatformIcon(item.platform) as any} size={12} color={getPlatformColor(item.platform)} />
            <Text style={{ fontSize: 12, fontWeight: '500', color: getPlatformColor(item.platform) }}>
              {getPlatformName(item.platform)}
            </Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 22, marginBottom: 6 }} numberOfLines={2}>{item.title}</Text>
          {item.rating !== undefined && item.rating !== null && (
            <View style={{ marginBottom: 6 }}>
              <StarRating
                value={item.rating}
                readonly
                size={16}
              />
            </View>
          )}
          {!isLocked && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
              <Text style={{ fontSize: 14, color: colors.primary }}>{t('share.view.clickToOpen')}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.card, padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: isLocked ? colors.textTertiary : colors.text, flex: 1, marginRight: 12 }} numberOfLines={2}>
            {isLocked ? t('share.view.contentLocked') : data.title}
          </Text>
          {!isLocked && (
            <TouchableOpacity
              style={{ padding: 6, backgroundColor: colors.primaryBg, borderRadius: 8, alignSelf: 'flex-start' }}
              onPress={shareLink}
            >
              <Ionicons name="share-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14, color: colors.textTertiary }}>{t('share.itemCount', { count: data.collections?.length || 0 })}</Text>
          {typeof data.viewCount === 'number' && (
            <Text style={{ fontSize: 14, color: colors.textTertiary }}>
              · {t('share.viewCount', { count: data.viewCount })}
            </Text>
          )}
        </View>
        {!isLocked && data.description && (
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 }} numberOfLines={3}>{data.description}</Text>
        )}
        {data.hasPassword && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <Ionicons name="lock-closed" size={14} color={colors.warning} />
            {isOwner && data.password ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.warning }}>{t('share.password', { password: data.password })}</Text>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await Clipboard.setStringAsync(data.password!);
                      Toast.show({ type: 'success', text1: t('share.passwordCopied') });
                    } catch {}
                  }}
                >
                  <Ionicons name="copy-outline" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: colors.warning }}>{t('share.view.passwordSet')}</Text>
            )}
          </View>
        )}
        {data.expiresAt && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {t('share.view.validUntil', { date: new Date(data.expiresAt).toLocaleString() })}
            </Text>
          </View>
        )}
      </View>

      {/* 密码验证区域（锁定时显示） */}
      {isLocked && (
        <View style={{ backgroundColor: colors.card, margin: 12, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: colors.primary + '30' }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 4 }}>{t('share.view.passwordRequired')}</Text>
            <Text style={{ fontSize: 13, color: colors.textTertiary, textAlign: 'center' }}>{t('share.view.passwordRequiredDesc')}</Text>
          </View>
          <TextInput
            style={{ width: '100%', borderWidth: 1, borderColor: passwordError ? colors.danger : colors.border, borderRadius: 10, padding: 13, fontSize: 16, textAlign: 'center', color: colors.text, backgroundColor: colors.inputBg, marginBottom: passwordError ? 6 : 0 }}
            placeholder={t('share.view.enterPassword')}
            placeholderTextColor={colors.textTertiary}
            value={passwordInput}
            onChangeText={(text) => { setPasswordInput(text); setPasswordError(''); }}
            secureTextEntry
            maxLength={20}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleVerifyPassword}
          />
          {passwordError ? (
            <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 6, textAlign: 'center' }}>{passwordError}</Text>
          ) : null}
          <TouchableOpacity
            style={{ backgroundColor: (!passwordInput.trim() || verifying) ? colors.border : colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 13, borderRadius: 10, gap: 8, marginTop: 8 }}
            onPress={handleVerifyPassword}
            disabled={!passwordInput.trim() || verifying}
          >
            {verifying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="unlock-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('share.view.verifyPassword')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 一键保存按钮（仅解锁后或无密码时显示） */}
      {!isOwner && !isLocked && (
        <TouchableOpacity style={{ backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 12, marginBottom: 0, padding: 14, borderRadius: 10, gap: 8 }} onPress={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('share.view.saveToMyCollections')}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* 同步所有封面按钮（仅解锁后或无密码时显示，且非创建者） */}
      {!isOwner && !isLocked && (
        <TouchableOpacity
          style={{ backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 12, marginBottom: 0, padding: 14, borderRadius: 10, gap: 8, borderWidth: 1, borderColor: colors.primary }}
          onPress={() => {
            Alert.alert(
              t('share.view.syncCoversTitle'),
              t('share.view.syncCoversDesc'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('share.view.syncCoversBtn'), onPress: () => syncCoversMutation.mutate() },
              ]
            );
          }}
          disabled={syncCoversMutation.isPending}
        >
          {syncCoversMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="sync-outline" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('share.view.syncAllCovers')}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      

      {/* Collection List */}
      <FlatList
        data={data.collections || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        scrollEnabled={!isLocked}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="bookmark-outline" size={36} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{t('share.view.noContent')}</Text>
            <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center', paddingHorizontal: 40 }}>{t('share.view.noContentHint')}</Text>
          </View>
        }
      />

      {/* 撤销 Snackbar */}
      {snackbar.visible && (
        <View style={{ position: 'absolute', bottom: 60, left: 12, right: 12, backgroundColor: colors.text, borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 }}>
          <Text style={{ color: '#fff', fontSize: 14, flex: 1 }}>{snackbar.message}</Text>
          <TouchableOpacity onPress={handleUndo}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 16 }}>{t('common.undo')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 保存密码模态框（仅保留用于极端场景） */}
      <Modal
        visible={savePasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setSavePasswordModal(false); setSavePasswordError(''); setSavePasswordInput(''); }}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '85%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 4 }}>{t('share.view.needPassword')}</Text>
            <Text style={{ fontSize: 14, color: colors.textTertiary, marginBottom: 20, textAlign: 'center' }}>{t('share.view.needPasswordDesc')}</Text>
            <TextInput
              style={{ width: '100%', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 16, textAlign: 'center', color: colors.text, backgroundColor: colors.inputBg }}
              placeholder={t('share.view.enterPassword')}
              placeholderTextColor={colors.textTertiary}
              value={savePasswordInput}
              onChangeText={(text) => { setSavePasswordInput(text); setSavePasswordError(''); }}
              secureTextEntry
              maxLength={20}
              autoFocus
            />
            {savePasswordError ? (
              <Text style={{ color: colors.danger, fontSize: 13, marginTop: 8 }}>{savePasswordError}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                onPress={() => { setSavePasswordModal(false); setSavePasswordError(''); setSavePasswordInput(''); }}
              >
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: (!savePasswordInput.trim() || saveMutation.isPending) ? colors.border : colors.primary, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={handleSavePasswordSubmit}
                disabled={!savePasswordInput.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 16, color: '#fff', fontWeight: '600' }}>{t('share.view.confirmSave')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      {!isLocked && (
        <View style={{ padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.card }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{t('share.view.generatedBy')}</Text>
        </View>
      )}
    </View>
  );
}
