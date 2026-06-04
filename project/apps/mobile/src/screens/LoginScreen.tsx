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
import { api, getMarketConfig, type MarketConfig } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useThemeStore } from '../store/theme';
import { useI18n, type SupportedLocale } from '../lib/i18n';
import { ErrorCodeToI18nKey, AuthErrorCodes } from '../lib/errorCodes';
import { Ionicons } from '@expo/vector-icons';
import { usePressableScale } from '../lib/animations';
import { isChinaMarket } from '../lib/market';
import GoogleLoginSection from './GoogleLoginSection'
import WeChatLoginSection from '../components/WeChatLoginSection'

type AccountType = 'email';

// 检测账号类型（仅邮箱）
function detectAccountType(value: string): 'email' | 'unknown' {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(value)) return 'email';
  return 'unknown';
}

// 统一的错误处理函数
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

  // 同步语言选择器与全局 locale
  useEffect(() => {
    setLang(locale);
  }, [locale]);

  // 登录状态
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 注册弹窗状态
  const [showRegister, setShowRegister] = useState(false);
  // 注册类型固定为邮箱
  const registerType: AccountType = 'email';
  const [regAccount, setRegAccount] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regReferralCode, setRegReferralCode] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 找回密码弹窗状态
  const [showForgot, setShowForgot] = useState(false);
  const [forgotAccount, setForgotAccount] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // 市场配置
  const [marketConfig, setMarketConfig] = useState<MarketConfig | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);

  const { setToken, setUser } = useAuthStore();

  // 默认市场配置（API 失败时使用）
  // 注意：Android 海外版不需要 Apple 登录（仅 iOS 需要）
  const defaultMarketConfig: MarketConfig = isChinaMarket()
    ? {
        market: 'china',
        authProviders: { google: false, apple: false, wechat: true, alipay_auth: false, facebook: false },
        paymentProviders: { paypal: false, wechat_pay: true, alipay: true, google_pay: false, apple_iap: false, google_play_billing: false },
        features: { contentModeration: true, referralProgram: true },
      }
    : {
        market: 'global',
        authProviders: { google: true, apple: false, wechat: false, alipay_auth: false, facebook: false },
        paymentProviders: { paypal: true, wechat_pay: false, alipay: false, google_pay: true, apple_iap: false, google_play_billing: true },
        features: { contentModeration: false, referralProgram: true },
      };

  // 获取市场配置
  useEffect(() => {
    async function fetchMarketConfig() {
      try {
        const config = await getMarketConfig();
        setMarketConfig(config);
      } catch (err) {
        console.warn('获取市场配置失败，使用本地回退:', err);
        // API 不可用时，使用本地默认配置
        setMarketConfig(defaultMarketConfig);
      } finally {
        setMarketLoading(false);
      }
    }
    fetchMarketConfig();
  }, []);

  // 倒计时定时器引用，用于组件卸载时清理
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // 语言切换
  const handleLanguageChange = useCallback((newLang: SupportedLocale) => {
    setLang(newLang);
    setLocale(newLang);
  }, [setLocale]);



  // 发送验证码（仅邮箱）
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

  // 登录
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
      // 主动导航到主页，避免条件渲染 Navigator 导致的切换问题
      navigation.replace('Main' as never);
    } catch (error: any) {
      const errorCode = error.response?.data?.error || AuthErrorCodes.SERVER_ERROR;
      Alert.alert(t('common.error'), getErrorMessage(errorCode, t));
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async () => {
    if (!regAccount || !regCode || !regPassword || !regConfirmPassword) {
      Alert.alert(t('common.hint'), t('login.fillAllFields'));
      return;
    }

    if (regPassword !== regConfirmPassword) {
      Alert.alert(t('common.hint'), t('error.passwordMismatch'));
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(regPassword)) {
      Alert.alert(t('common.hint'), t('error.invalidPasswordFormat'));
      return;
    }

    try {
      setRegLoading(true);
      const body = { email: regAccount, code: regCode, password: regPassword, confirmPassword: regConfirmPassword, lang, referralCode: regReferralCode };

      const response = await api.post('/auth/register-email', body);
      const { token, user } = response.data;

      await setToken(token);
      setUser(user);
      setShowRegister(false);
      // 主动导航到主页
      navigation.replace('Main' as never);
    } catch (error: any) {
      const errorCode = error.response?.data?.error || AuthErrorCodes.SERVER_ERROR;
      Alert.alert(t('common.error'), getErrorMessage(errorCode, t));
    } finally {
      setRegLoading(false);
    }
  };

  // 找回密码
  const handleForgotPassword = async () => {
    if (!forgotAccount || !forgotCode || !forgotNewPassword || !forgotConfirmPassword) {
      Alert.alert(t('common.hint'), t('login.fillAllFields'));
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert(t('common.hint'), t('error.passwordMismatch'));
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(forgotNewPassword)) {
      Alert.alert(t('common.hint'), t('error.invalidPasswordFormat'));
      return;
    }

    try {
      setForgotLoading(true);
      await api.post('/auth/reset-password', {
        email: forgotAccount,
        code: forgotCode,
        newPassword: forgotNewPassword,
      });
      Alert.alert(t('common.success'), t('login.resetPassword'));
      setShowForgot(false);
      setForgotAccount('');
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (error: any) {
      const errorCode = error.response?.data?.error || AuthErrorCodes.SERVER_ERROR;
      Alert.alert(t('common.error'), getErrorMessage(errorCode, t));
    } finally {
      setForgotLoading(false);
    }
  };

  const [showLangPicker, setShowLangPicker] = useState(false);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Header - Language Picker */}
          <View style={styles.header}>
            <View style={{ width: 40 }} />
            <View style={{ flex: 1 }} />
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                style={[styles.langPickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowLangPicker(!showLangPicker)}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={16} color={colors.textTertiary} />
                <Text style={[styles.langPickerText, { color: colors.text }]}>
                  {lang === 'zh' ? '中文' : lang === 'ja' ? '日本語' : lang === 'ko' ? '한국어' : lang === 'fr' ? 'Français' : lang === 'de' ? 'Deutsch' : 'EN'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
                {showLangPicker && (
                <View style={[styles.langPickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.langPickerOption, lang === 'zh' && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { handleLanguageChange('zh'); setShowLangPicker(false); }}
                  >
                    <Text style={[styles.langPickerOptionText, { color: lang === 'zh' ? colors.primary : colors.text }]}>中文</Text>
                    {lang === 'zh' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langPickerOption, lang === 'en' && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { handleLanguageChange('en'); setShowLangPicker(false); }}
                  >
                    <Text style={[styles.langPickerOptionText, { color: lang === 'en' ? colors.primary : colors.text }]}>English</Text>
                    {lang === 'en' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langPickerOption, lang === 'ja' && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { handleLanguageChange('ja'); setShowLangPicker(false); }}
                  >
                    <Text style={[styles.langPickerOptionText, { color: lang === 'ja' ? colors.primary : colors.text }]}>日本語</Text>
                    {lang === 'ja' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langPickerOption, lang === 'ko' && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { handleLanguageChange('ko'); setShowLangPicker(false); }}
                  >
                    <Text style={[styles.langPickerOptionText, { color: lang === 'ko' ? colors.primary : colors.text }]}>한국어</Text>
                    {lang === 'ko' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langPickerOption, lang === 'fr' && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { handleLanguageChange('fr'); setShowLangPicker(false); }}
                  >
                    <Text style={[styles.langPickerOptionText, { color: lang === 'fr' ? colors.primary : colors.text }]}>Français</Text>
                    {lang === 'fr' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langPickerOption, lang === 'de' && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => { handleLanguageChange('de'); setShowLangPicker(false); }}
                  >
                    <Text style={[styles.langPickerOptionText, { color: lang === 'de' ? colors.primary : colors.text }]}>Deutsch</Text>
                    {lang === 'de' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Logo Area */}
          <View style={styles.logoArea}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 48, height: 48, borderRadius: 12 }}
                resizeMode="contain"
              />
              <Text style={[styles.logoText, { color: colors.text }]}>
                {locale === 'zh' ? '链藏' : 'LinkChest'}
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('app.subtitle')}</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder={t('login.accountPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              value={account}
              onChangeText={setAccount}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, paddingRight: 48 }]}
                placeholder={t('login.password')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotBtn} onPress={() => setShowForgot(true)}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>{t('login.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <ScaleButton
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t('login.login')}</Text>
              )}
            </ScaleButton>

            {/* Register Button */}
            <ScaleButton
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              onPress={() => setShowRegister(true)}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>{t('login.register')}</Text>
            </ScaleButton>

            {/* Terms Notice */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
              <Text style={[styles.termsText, { color: colors.textTertiary }]}>{t('login.termsPrefix')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Terms' as never, { tab: 'terms' })}>
                <Text style={[styles.termsText, { color: colors.primary }]}>{t('login.termsLink')}</Text>
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: colors.textTertiary }]}>{t('login.termsAnd')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Terms' as never, { tab: 'privacy' })}>
                <Text style={[styles.termsText, { color: colors.primary }]}>{t('login.privacyLink')}</Text>
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: colors.textTertiary }]}>{t('login.termsSuffix')}</Text>
            </View>
          </View>

          {/* 第三方登录 */}
          <View style={styles.thirdPartyArea}>
            <Text style={[styles.thirdPartyLabel, { color: colors.textTertiary }]}>{t('login.otherLoginMethods')}</Text>
            <View style={styles.thirdPartyIcons}>
              {isChinaMarket() ? (
                /* 国内版 */
                <>
                  {/* iOS国内版：Apple + 微信 */}
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[styles.thirdPartyBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => Alert.alert('Apple Sign In', '功能开发中')}
                      disabled={loading}
                    >
                      <Ionicons name="logo-apple" size={24} color="#000" />
                    </TouchableOpacity>
                  )}
                  {/* 国内版：微信 */}
                  <WeChatLoginSection
                    colors={colors}
                    loading={loading}
                    t={t}
                    lang={lang}
                    setLoading={setLoading}
                    wechatClientId={marketConfig?.clientIds?.wechatMobile}
                    onSuccess={() => navigation.replace('Main' as never)}
                  />
                </>
              ) : (
                /* 海外版 */
                <>
                  {/* 海外版：Google */}
                  <GoogleLoginSection
                    colors={colors}
                    loading={loading}
                    t={t}
                    lang={lang}
                    setLoading={setLoading}
                  />
                  {/* iOS海外版：Apple */}
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[styles.thirdPartyBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => Alert.alert('Apple Sign In', '功能开发中')}
                      disabled={loading}
                    >
                      <Ionicons name="logo-apple" size={24} color="#000" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Register Modal */}
      <Modal visible={showRegister} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('login.register')}</Text>
              <TouchableOpacity onPress={() => setShowRegister(false)}>
                <Text style={[styles.modalClose, { color: colors.textTertiary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder={t('login.enterEmail')}
                placeholderTextColor={colors.textTertiary}
                value={regAccount}
                onChangeText={setRegAccount}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Verification Code Row */}
              <View style={styles.codeRow}>
                <TextInput
                  style={[styles.codeInput, styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder={t('login.enterCode')}
                  placeholderTextColor={colors.textTertiary}
                  value={regCode}
                  onChangeText={setRegCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.codeBtn, { backgroundColor: countdown > 0 ? colors.border : colors.primary }]}
                  onPress={() => sendCode()}
                  disabled={countdown > 0 || regLoading}
                >
                  <Text style={styles.codeBtnText}>
                    {countdown > 0 ? `${countdown}s` : t('login.getCode')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder={t('login.password')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={regPassword}
                onChangeText={setRegPassword}
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder={t('login.confirmPassword')}
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={regConfirmPassword}
                onChangeText={setRegConfirmPassword}
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder={t('login.referralCode')}
                placeholderTextColor={colors.textTertiary}
                value={regReferralCode}
                onChangeText={setRegReferralCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                onPress={handleRegister}
                disabled={regLoading}
              >
                {regLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('login.register')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal visible={showForgot} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('login.forgotPassword')}</Text>
              <TouchableOpacity onPress={() => setShowForgot(false)}>
                <Text style={[styles.modalClose, { color: colors.textTertiary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder={t('login.enterEmail')}
              placeholderTextColor={colors.textTertiary}
              value={forgotAccount}
              onChangeText={setForgotAccount}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.codeRow}>
              <TextInput
                style={[styles.codeInput, styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                placeholder={t('login.enterCode')}
                placeholderTextColor={colors.textTertiary}
                value={forgotCode}
                onChangeText={setForgotCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.codeBtn, { backgroundColor: countdown > 0 ? colors.border : colors.primary }]}
                onPress={() => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotAccount)) {
                    Alert.alert(t('common.hint'), t('error.invalidEmailFormat'));
                    return;
                  }
                  sendCode(forgotAccount);
                }}
                disabled={countdown > 0 || regLoading}
              >
                <Text style={styles.codeBtnText}>{countdown > 0 ? `${countdown}s` : t('login.getCode')}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder={t('login.newPassword')}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={forgotNewPassword}
              onChangeText={setForgotNewPassword}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder={t('login.confirmNewPassword')}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={forgotConfirmPassword}
              onChangeText={setForgotConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              onPress={handleForgotPassword}
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{t('login.resetPassword')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 50,
  },
  langPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  langPickerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  langPickerDropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 100,
    overflow: 'hidden',
  },
  langPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  langPickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoArea: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  forgotBtn: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 14,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  thirdPartyArea: {
    marginTop: 40,
    alignItems: 'center',
  },
  thirdPartyLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  thirdPartyIcons: {
    flexDirection: 'row',
    gap: 24,
  },
  thirdPartyBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thirdPartyIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  codeInput: {
    flex: 1,
  },
  codeBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  codeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});