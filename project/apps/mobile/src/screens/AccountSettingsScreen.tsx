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
import { api, setApiUrl, resetApiUrl, getApiUrl, getBaseDomain } from '../lib/api';
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
      // ignore
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

  // 查询系统封面和用户封面（用于头像选择）
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

  const setPasswordMutation = useMutation({
    mutationFn: (password: string) => api.post('/auth/set-password', { password }),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('account.passwordSetSuccess'));
      setPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      api.get('/auth/me').then((res: any) => {
        setUser(res.data.data || res.data);
      }).catch(() => {});
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('account.setPasswordFailed'));
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ oldPwd, newPwd }: { oldPwd: string; newPwd: string }) =>
      api.put('/auth/change-password', { oldPassword: oldPwd, newPassword: newPwd }),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('account.passwordChangedSuccess'));
      setPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.message || error.response?.data?.error || t('account.changePasswordFailed'));
    },
  });

  const handleSaveUsername = () => {
    if (!usernameValue.trim()) {
      Alert.alert(t('common.hint'), t('account.enterUsername'));
      return;
    }
    profileMutation.mutate({ username: usernameValue.trim(), nickname: usernameValue.trim() }, {
      onSuccess: () => {
        setUsernameModal(false);
        Alert.alert(t('common.success'), t('account.usernameChanged'));
      },
    });
  };

  const isChangingEmail = !!user?.email && emailValue.trim() !== user?.email;

  const handleSendEmailCode = async () => {
    const target = emailValue.trim();
    if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      Alert.alert(t('common.hint'), t('login.invalidEmailFormat'));
      return;
    }
    try {
      setEmailSending(true);
      const payload = { email: target, type: 'email' };
      const response = await api.post('/auth/send-code', payload);
      const devCode = response.data?.code;
      if (devCode) {
        Alert.alert(t('common.success'), `${t('login.codeSent')}\n${t('login.yourCodeIs', { code: devCode })}`);
      } else {
        Alert.alert(t('common.success'), t('login.codeSent'));
      }
      setEmailCountdown(60);
      if (emailTimerRef.current) clearInterval(emailTimerRef.current);
      emailTimerRef.current = setInterval(() => {
        setEmailCountdown(prev => {
          if (prev <= 1) { if (emailTimerRef.current) clearInterval(emailTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.response?.data?.error || t('login.sendCodeFailed'));
    } finally {
      setEmailSending(false);
    }
  };

  const handleSaveEmail = () => {
    if (!emailValue.trim()) {
      Alert.alert(t('common.hint'), t('account.enterEmailHint'));
      return;
    }
    if (isChangingEmail && !emailCode.trim()) {
      Alert.alert(t('common.hint'), t('account.enterCode'));
      return;
    }
    const payload: Record<string, string> = { email: emailValue.trim() };
    if (isChangingEmail) payload.code = emailCode.trim();
    profileMutation.mutate(payload, {
      onSuccess: () => {
        setEmailModal(false);
        setEmailCode('');
        Alert.alert(t('common.success'), t('account.emailBound'));
      },
    });
  };

  const handleSavePassword = () => {
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (user?.hasPassword) {
      if (!oldPassword || !newPassword || !confirmPassword) {
        Alert.alert(t('common.hint'), t('account.fillComplete'));
        return;
      }
      if (!pwdRegex.test(newPassword)) {
        Alert.alert(t('common.hint'), t('error.invalidPasswordFormat'));
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert(t('common.hint'), t('account.passwordMismatch'));
        return;
      }
      changePasswordMutation.mutate({ oldPwd: oldPassword, newPwd: newPassword });
    } else {
      if (!newPassword || !confirmPassword) {
        Alert.alert(t('common.hint'), t('account.fillComplete'));
        return;
      }
      if (!pwdRegex.test(newPassword)) {
        Alert.alert(t('common.hint'), t('error.invalidPasswordFormat'));
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert(t('common.hint'), t('account.passwordMismatch'));
        return;
      }
      setPasswordMutation.mutate(newPassword);
    }
  };

  const handleSaveServer = async () => {
    if (!serverValue.trim()) {
      Alert.alert(t('common.hint'), t('account.enterServerAddress'));
      return;
    }
    try {
      await setApiUrl(serverValue.trim());
      setServerModal(false);
      Alert.alert(t('common.success'), t('account.serverUpdated'));
    } catch {
      Alert.alert(t('common.error'), t('account.serverSetFailed'));
    }
  };

  const handleResetServer = async () => {
    try {
      await resetApiUrl();
      setServerModal(false);
      Alert.alert(t('common.success'), t('account.serverReset'));
    } catch {
      Alert.alert(t('common.error'), t('account.serverResetFailed'));
    }
  };

  const handleAvatarPick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(t('common.hint'), t('account.needPhotoPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setAvatarUploading(true);

      // Read as base64 and upload
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const mimeType = asset.mimeType || 'image/jpeg';
      const imageData = `data:${mimeType};base64,${base64}`;

      const response = await api.post('/upload/avatar', { imageData }, { timeout: 30000 });
      const avatarUrl = response.data?.data?.url;

      if (avatarUrl) {
        // Refresh user data
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.data || meRes.data);
        Alert.alert(t('common.success'), t('account.avatarUpdated'));
      } else {
        Alert.alert(t('common.error'), t('account.avatarUploadFailed'));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || t('account.avatarUploadFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarFromUrl = async (imageUrl: string) => {
    setAvatarUploading(true);
    try {
      const response = await api.post('/upload/avatar-from-cover', { coverUrl: imageUrl });
      const avatarUrl = response.data?.data?.url;
      if (avatarUrl) {
        const meRes = await api.get('/auth/me');
        setUser(meRes.data.data || meRes.data);
        Alert.alert(t('common.success'), t('account.avatarUpdated'));
      }
      setShowCoverPicker(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || t('account.avatarUploadFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAvatar = () => {
    Alert.alert(t('account.deleteAvatar'), t('account.deleteAvatarConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/upload/avatar');
            const meRes = await api.get('/auth/me');
            setUser(meRes.data.data || meRes.data);
            Alert.alert(t('common.success'), t('account.avatarDeleted'));
          } catch {
            Alert.alert(t('common.error'), t('account.avatarDeleteFailed'));
          }
        },
      },
    ]);
  };

  const renderItem = (icon: string, iconColor: string, title: string, value: string, onPress: () => void) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
        <Text style={{ fontSize: 16, color: colors.text }}>{title}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14, color: colors.textTertiary }}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* 头像区域 */}
        <View style={{ backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(t('account.changeAvatar'), '', [
                { text: t('account.chooseFromAlbum'), onPress: () => handleAvatarPick() },
                { text: t('account.selectFromCover'), onPress: () => setShowCoverPicker(true) },
                ...(user?.avatar ? [{ text: t('account.deleteAvatarBtn'), style: 'destructive' as const, onPress: handleDeleteAvatar }] : []),
                { text: t('common.cancel'), style: 'cancel' as const },
              ]);
            }}
            disabled={avatarUploading}
            activeOpacity={0.7}
          >
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              {avatarUploading ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              ) : (
                <Ionicons name="person" size={36} color={colors.primary} />
              )}
            </View>
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.card }}>
              <Ionicons name="images" size={13} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 8 }}>{t('account.tapToChangeAvatar')}</Text>
        </View>

        {renderItem('at-outline', colors.primary, t('account.username'), user?.username || user?.nickname || t('account.notSet'), () => { setUsernameValue(user?.username || ''); setUsernameModal(true); })}
        {renderItem('lock-closed-outline', colors.primary, t('account.password'), user?.hasPassword ? t('account.set') : t('account.notSet'), () => { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordModal(true); })}
        {renderItem('mail-outline', colors.primary, t('account.email'), (user?.authSource === 'google' || user?.googleId) ? `${user?.email || ''} (${t('account.googleEmailLocked')})` : (user?.email || t('account.notBound')), () => {
          if (user?.authSource === 'google' || user?.googleId) {
            Alert.alert(t('common.hint'), t('error.googleEmailCannotChange'));
            return;
          }
          setEmailValue(user?.email || '');
          setEmailModal(true);
        })}

        {tierData && (
          <View style={{ backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: tierColor('heavy'), justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                <Ionicons name="trophy-outline" size={14} color="#fff" />
              </View>
              <Text style={{ fontSize: 14, color: colors.text }}>{t('tier.pro')}</Text>
              <Text style={{ fontSize: 13, color: colors.warning, marginLeft: 'auto' }}>
                {tierData.heavyExpiresAt
                  ? t('tier.expiresAt', { date: new Date(tierData.heavyExpiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') })
                  : t('tier.forever')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: tierColor('super'), justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                <Ionicons name="trophy-outline" size={14} color="#fff" />
              </View>
              <Text style={{ fontSize: 14, color: colors.text }}>{t('tier.super')}</Text>
              <Text style={{ fontSize: 13, color: colors.warning, marginLeft: 'auto' }}>
                {tierData.superExpiresAt
                  ? t('tier.expiresAt', { date: new Date(tierData.superExpiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') })
                  : t('tier.forever')}
              </Text>
            </View>
          </View>
        )}

        {/* 当前套餐 */}
        {tierLoading ? (
          <View style={{ backgroundColor: colors.card, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 8 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : tierData ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('TierUpgrade' as any)}
            style={{ backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 8 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tierColor(tierData.tier), justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Ionicons name="trophy-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              {tierData.superExpiresAt || tierData.heavyExpiresAt || tierData.subscription?.expiresAt ? (
                <Text style={{ fontSize: 12, color: colors.warning, marginBottom: 2 }}>
                  {t('tier.expiresAt', { date: new Date(tierData.superExpiresAt || tierData.heavyExpiresAt || tierData.subscription?.expiresAt!).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')})}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                  {locale === 'zh' ? tierData.planNameZh : tierData.planNameEn}
                </Text>
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: 'rgba(255, 149, 0, 0.15)' }}>
                  <Text style={{ fontSize: 10, color: '#FF9500', fontWeight: '600' }}>{t('tier.current')}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}

        {/* 邀请码 */}
        <View style={{ backgroundColor: colors.card, marginTop: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textTertiary }}>{t('account.myReferralCode')}</Text>
        </View>
        {referralLoading ? (
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : referralCode ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>{t('account.referralDesc')}</Text>
              <TouchableOpacity onPress={() => {
                const baseDomain = getBaseDomain();
                Linking.openURL(`https://${baseDomain}/docs/referral-rules.html`);
              }}>
                <Text style={{ fontSize: 11, color: colors.primary, textDecorationLine: 'underline' }}>{t('account.referralRulesLink')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, padding: 8, backgroundColor: colors.secondaryBg, borderRadius: 6, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text, textAlign: 'center', letterSpacing: 2 }}>{referralCode}</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  await Clipboard.setStringAsync(referralCode);
                  Alert.alert(t('common.success'), t('account.referralCopied'));
                }}
                style={{ padding: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}
              >
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {referralStats && (
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 6 }}>
                <View style={{ flex: 1, padding: 6, backgroundColor: colors.secondaryBg, borderRadius: 6, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>{referralStats.totalInvited ?? referralStats.total ?? 0}</Text>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 1 }}>{t('account.referralTotalInvited')}</Text>
                </View>
                <View style={{ flex: 1, padding: 6, backgroundColor: colors.secondaryBg, borderRadius: 6, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>{referralStats.upgradedCount ?? referralStats.registered ?? 0}</Text>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 1 }}>{t('account.referralUpgraded')}</Text>
                </View>
                <View style={{ flex: 1, padding: 6, backgroundColor: colors.secondaryBg, borderRadius: 6, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>{referralStats.totalRewardDays ?? referralStats.rewarded ?? 0}</Text>
                  <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 1 }}>{t('account.referralRewardDays')}</Text>
                </View>
              </View>
              )}
            </View>
          ) : referralError ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.textTertiary }}>{t('common.networkError')}</Text>
              <TouchableOpacity onPress={loadReferralData} style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.primaryBg }}>
                <Text style={{ fontSize: 14, color: colors.primary }}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingVertical: 24, alignItems: 'center', paddingHorizontal: 24 }}>
              <Ionicons name="gift-outline" size={28} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>{t('account.referralEmpty')}</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Username Modal */}
      <Modal visible={usernameModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: colors.text }}>{t('account.setUsername')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text }}
              placeholder={t('account.usernamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={usernameValue}
              onChangeText={setUsernameValue}
              maxLength={20}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.secondaryBg }} onPress={() => setUsernameModal(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary }} onPress={handleSaveUsername}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={passwordModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: colors.text }}>{user?.hasPassword ? t('account.changePassword') : t('account.setPassword')}</Text>
            {user?.hasPassword && (
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text }}
                placeholder={t('account.oldPassword')}
                placeholderTextColor={colors.textTertiary}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry
                maxLength={20}
              />
            )}
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 4, color: colors.text }}
              placeholder={t('account.newPassword')}
              placeholderTextColor={colors.textTertiary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              maxLength={20}
            />
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 12 }}>{t('account.passwordHint')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text }}
              placeholder={t('account.confirmNewPassword')}
              placeholderTextColor={colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              maxLength={20}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.secondaryBg }} onPress={() => setPasswordModal(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary }} onPress={handleSavePassword}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal visible={emailModal} animationType="slide" transparent onRequestClose={() => setEmailModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: colors.text }}>{user?.email ? t('account.changeEmail') : t('account.bindEmail')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text }}
              placeholder={t('account.enterEmail')}
              placeholderTextColor={colors.textTertiary}
              value={emailValue}
              onChangeText={v => { setEmailValue(v); setEmailCode(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            {isChangingEmail && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TextInput
                  style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text }}
                  placeholder={t('account.enterCode')}
                  placeholderTextColor={colors.textTertiary}
                  value={emailCode}
                  onChangeText={setEmailCode}
                  maxLength={6}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  onPress={handleSendEmailCode}
                  disabled={emailCountdown > 0 || emailSending}
                  style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', opacity: emailCountdown > 0 || emailSending ? 0.5 : 1 }}
                >
                  <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '500' }}>
                    {emailCountdown > 0 ? `${emailCountdown}s` : t('account.getCode')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.secondaryBg }} onPress={() => setEmailModal(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary }} onPress={handleSaveEmail}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Server Modal */}
      <Modal visible={serverModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: colors.text }}>{t('account.serverAddress')}</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12, color: colors.text }}
              placeholder={t('account.serverExample')}
              placeholderTextColor={colors.textTertiary}
              value={serverValue}
              onChangeText={setServerValue}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Text style={{ fontSize: 12, color: colors.warning, marginBottom: 12 }}>
              {t('account.serverWarningDetail')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 12 }}>
              {t('account.serverHint')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.secondaryBg }} onPress={() => setServerModal(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#FF9500' }} onPress={handleResetServer}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('account.resetDefault')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: colors.primary }} onPress={handleSaveServer}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cover Picker Modal */}
      <Modal visible={showCoverPicker} animationType="slide" transparent onRequestClose={() => setShowCoverPicker(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay }}>
          <View style={{ flex: 1, backgroundColor: colors.background, marginTop: 60 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{t('account.selectFromCover')}</Text>
              <TouchableOpacity onPress={() => setShowCoverPicker(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {avatarUploading && (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>{t('common.loading')}</Text>
              </View>
            )}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {/* AI Covers */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 }}>{t('cover.modeAi')}</Text>
                {systemCoversData?.data && systemCoversData.data.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(systemCoversData.data as { id: string; cosUrl: string }[]).map((cover) => (
                      <TouchableOpacity
                        key={cover.id}
                        style={{
                          width: '23%',
                          aspectRatio: 1,
                          borderRadius: 8,
                          overflow: 'hidden',
                          borderWidth: 2,
                          borderColor: colors.border,
                        }}
                        onPress={() => handleAvatarFromUrl(cover.cosUrl)}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: cover.cosUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
                    <Ionicons name="images-outline" size={32} color={colors.textTertiary} />
                    <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 6 }}>{t('edit.noCoversInLibrary')}</Text>
                  </View>
                )}
              </View>
              {/* My Covers */}
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 }}>{t('cover.modeLibrary')}</Text>
                {coverLibraryData?.data && coverLibraryData.data.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(coverLibraryData.data as { id: string; cosUrl: string }[]).map((cover) => (
                      <TouchableOpacity
                        key={cover.id}
                        style={{
                          width: '23%',
                          aspectRatio: 1,
                          borderRadius: 8,
                          overflow: 'hidden',
                          borderWidth: 2,
                          borderColor: colors.border,
                        }}
                        onPress={() => handleAvatarFromUrl(cover.cosUrl)}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: cover.cosUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
                    <Ionicons name="images-outline" size={32} color={colors.textTertiary} />
                    <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 6 }}>{t('edit.noCoversInLibrary')}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
