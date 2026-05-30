'use client';

import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Globe, ChevronDown, Check } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { setToken, setUser, isLoggedIn } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { SupportedLocale } from '@linkchest/i18n';
import { useToast } from '@/components/Toast';
import Logo from '@/components/Logo';
import { getErrorMessage } from '@linkchest/i18n';
import { getMarketConfig, MarketConfig } from '@/lib/api/market';
import ICPFiling from '@/components/ICPFiling';

// 动态导入 Google 组件，避免服务端渲染问题
const GoogleLoginButton = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  ? lazy(() => import('@/components/GoogleLoginButton'))
  : null;

import type { CredentialResponse } from '@react-oauth/google';

// 错误码映射（login-email / register-email 返回的 error 字段）
const ERROR_CODE_MAP: Record<string, string> = {
  ERR_INVALID_EMAIL_FORMAT: 'invalidEmailFormat',
  ERR_INVALID_PASSWORD_FORMAT: 'invalidPasswordFormat',
  ERR_INVALID_CODE_FORMAT: 'invalidCodeFormat',
  ERR_INVALID_REFERRAL_CODE: 'invalidReferralCode',
  ERR_USER_NOT_FOUND: 'userNotFound',
  ERR_INVALID_PASSWORD: 'invalidPassword',
  ERR_ACCOUNT_LOCKED: 'accountLocked',
  ERR_ACCOUNT_BANNED: 'accountBanned',
  ERR_ACCOUNT_SUSPENDED: 'accountSuspended',
  ERR_INVALID_CODE: 'invalidCode',
  ERR_CODE_EXPIRED: 'codeExpired',
  ERR_EMAIL_EXISTS: 'emailExists',
  ERR_GOOGLE_AUTH_FAILED: 'googleAuthFailed',
  ERR_GOOGLE_EMAIL_MISSING: 'googleEmailMissing',
  ERR_SERVER_ERROR: 'serverError',
  // 微信登录错误
  invalid_code: 'wechatInvalidCode',
  invalid_credential: 'wechatInvalidCredential',
  login_failed: 'loginFailed',
};

function getAccountType(value: string): 'email' | 'phone' | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(value)) return 'email';
  const phoneRegex = /^\+?[\d\s-]{7,20}$/;
  if (phoneRegex.test(value)) return 'phone';
  return null;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirect = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/';
  const { t, locale, setLocale } = useI18n();
  const { showToast } = useToast();

  const getErrorMessage = (errCode: string): string => {
    const key = ERROR_CODE_MAP[errCode];
    if (key) {
      const translated = t(`error.${key}`);
      if (translated !== `error.${key}`) return translated;
    }
    return errCode;
  };

  const isLogoutFlow = searchParams.get('logout') === '1';

  // 语言
  const lang = locale;
  const handleLangChange = (newLang: SupportedLocale) => {
    setLocale(newLang);
  };

  // 登录表单状态
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 注册弹窗状态
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerCode, setRegisterCode] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Google 密码设置弹窗
  const [showGooglePasswordModal, setShowGooglePasswordModal] = useState(false);
  const [googlePassword, setGooglePassword] = useState('');
  const [googlePasswordLoading, setGooglePasswordLoading] = useState(false);

  // 忘记密码弹窗
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const [forgotLoading, setForgotLoading] = useState(false);

  // 语言下拉
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // 市场配置
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketConfig, setMarketConfig] = useState<MarketConfig | null>(null);

  useEffect(() => {
    if (!isLogoutFlow && isLoggedIn()) {
      router.replace(redirect);
    }
  }, [router, redirect, isLogoutFlow]);

  // 处理 URL 参数中的错误
  useEffect(() => {
    const error = searchParams.get('error');
    const needsPasswordSetup = searchParams.get('needs_password_setup');
    const redirectParam = searchParams.get('redirect');
    const wechatSuccess = searchParams.get('wechat_success');

    if (error) {
      setError(getErrorMessage(error) || t('login.wechatLoginFailed'));
    }

    if (wechatSuccess === '1') {
      (async () => {
        try {
          const meRes = await api.get('/users/me');
          if (meRes.data) {
            setUser(meRes.data);
            if (needsPasswordSetup === '1' || !meRes.data.hasPassword) {
              setShowGooglePasswordModal(true);
            } else {
              router.replace(redirectParam || '/');
            }
          }
        } catch {
          setError(t('login.wechatLoginFailed'));
        }
      })();
    }
  }, [searchParams]);

  // 点击外部关闭语言下拉
  useEffect(() => {
    if (typeof document === 'undefined') return;
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取市场配置
  useEffect(() => {
    async function fetchMarketConfig() {
      try {
        const config = await getMarketConfig();
        setMarketConfig(config);
      } catch {
        // 忽略错误，使用默认状态
      } finally {
        setMarketLoading(false);
      }
    }
    fetchMarketConfig();
  }, []);

  // 处理微信登录回调后的场景
  useEffect(() => {
    const error = searchParams.get('error');
    const needsPasswordSetup = searchParams.get('needs_password_setup');
    const redirectParam = searchParams.get('redirect');
    
    if (error) {
      // 显示错误
      setError(getErrorMessage(error) || t('login.wechatLoginFailed'));
    }

    if (needsPasswordSetup === '1') {
      // 如果用户已经通过 cookie 登录，需要获取用户信息后显示设置密码弹窗
      (async () => {
        try {
          const meRes = await api.get('/users/me');
          if (meRes.data) {
            setUser(meRes.data);
            setShowGooglePasswordModal(true);
          }
        } catch {
          // 如果获取用户信息失败，可能是 cookie 过期了
          setError(t('login.wechatLoginFailed'));
        }
      })();
    } else if (isLoggedIn()) {
      // 如果已经登录，直接跳转
      router.replace(redirectParam || '/');
    }
  }, [searchParams]);

  // 发送验证码
  const sendCode = async (target: string) => {
    if (!target) { setError(t('login.enterEmail')); return; }
    const accountType = getAccountType(target);
    if (!accountType) { setError(t('login.invalidEmailFormat')); return; }
    try {
      setLoading(true);
      const payload = { email: target, lang, type: 'email' };
      const response = await api.post('/auth/send-code', payload);
      const responseData = response.data as { code?: string };
      if (responseData.code) {
        // 开发环境调试使用，生产环境不显示验证码
        if (process.env.NODE_ENV !== 'production') {
          showToast(`验证码: ${responseData.code}`, 'success');
        }
      } else {
        showToast(t('login.codeSent'), 'success');
      }
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setError((err as ApiError).response?.data?.error || t('login.sendCodeFailed'));
    } finally { setLoading(false); }
  };

  // 邮箱密码登录
  const handleAccountLogin = async () => {
    console.log('[Login] handleAccountLogin called', { account, password: !!password });
    if (!account || !password) { setError(t('login.enterAccountAndPassword')); return; }
    const accountType = getAccountType(account);
    if (!accountType) { setError(t('login.invalidEmailFormat')); return; }
    try {
      console.log('[Login] Setting loading state...');
      setLoading(true);
      setError('');
      const payload = { email: account, password, lang };
      console.log('[Login] Sending request to /auth/login-email', payload);
      const response = await api.post('/auth/login-email', payload);
      console.log('[Login] Response received:', response.data);
      const { token, user } = response.data;
      if (!token) { setError(t('login.loginFailed')); return; }
      console.log('[Login] Setting token and user...');
      setToken(token);
      setUser(user);
      console.log('[Login] Redirecting to:', redirect);
      // 使用 window.location.href 进行全页面刷新，确保 cookie 被正确设置
      window.location.href = redirect;
    } catch (err: unknown) {
      console.error('[Login] Error:', err);
      const errCode = (err as ApiError).response?.data?.error;
      setError(getErrorMessage(errCode || '') || t('login.loginFailed'));
    } finally { setLoading(false); }
  };

  // Google 登录
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;
    if (!credential) {
      setError(t('login.googleLoginFailed'));
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/auth/google', { credential, lang });
      const { token, user, needsEmailSetup } = response.data;
      if (!token) {
        setError(t('login.loginFailed'));
        return;
      }
      setToken(token);
      setUser(user);
      if (needsEmailSetup) {
        // 存储标记，跳转到首页后显示邮箱补充提醒
        localStorage.setItem('lc_needs_email_setup', '1');
        router.push(redirect);
      } else if (!user.hasPassword) {
        setShowGooglePasswordModal(true);
      } else {
        router.push(redirect);
      }
    } catch (err: unknown) {
      const errCode = (err as ApiError).response?.data?.error;
      setError(getErrorMessage(errCode || '') || t('login.loginFailed'));
    } finally { setLoading(false); }
  };

  const handleGoogleError = () => {
    setError(t('login.googleLoginFailed'));
  };

  // Apple Sign In 登录
  const handleAppleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // 从 API 获取 Apple Client ID
      let appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
      if (!appleClientId) {
        try {
          const configRes = await api.get('/market/config');
          appleClientId = configRes.data.data?.clientIds?.apple;
        } catch {
          // 忽略错误
        }
      }
      if (!appleClientId) {
        setError(t('login.appleLoginFailed'));
        setLoading(false);
        return;
      }

      // 加载 Apple Sign In JS SDK
      const AppleID = (window as any).AppleID;
      if (!AppleID) {
        // 动态加载 Apple Sign In JS
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.onload = () => {
          (window as any).AppleID.auth.init({
            clientId: appleClientId,
            scope: 'name email',
            redirectURI: `${window.location.origin}/api/auth/apple/callback`,
            usePopup: true,
          });
          (window as any).AppleID.auth.signIn().then((res: any) => {
            if (res.authorization?.id_token) {
              handleOAuthLogin('apple', res.authorization.id_token);
            }
          }).catch(() => {
            setError(t('login.appleLoginFailed'));
          });
        };
        document.head.appendChild(script);
        return;
      }
      (window as any).AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/api/auth/apple/callback`,
        usePopup: true,
      });
      const res = await AppleID.auth.signIn();
      if (res.authorization?.id_token) {
        await handleOAuthLogin('apple', res.authorization.id_token);
      }
    } catch {
      setError(t('login.appleLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 微信登录 - 弹出新窗口（类似 Google/Apple 登录）
  const handleWechatLogin = async () => {
    setError('');
    try {
      // 从 API 获取微信 AppID
      let wechatClientId = process.env.NEXT_PUBLIC_WECHAT_APP_ID;
      if (!wechatClientId) {
        try {
          const configRes = await api.get('/market/config');
          wechatClientId = configRes.data.data?.clientIds?.wechat;
        } catch {
          // 忽略错误
        }
      }
      if (!wechatClientId) {
        setError(t('login.wechatLoginFailed'));
        return;
      }
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/wechat/callback`);
      const state = btoa(JSON.stringify({ redirect, lang }));
      const url = `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatClientId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
      
      // 弹出微信授权窗口（类似 Google/Apple 登录）
      const width = 500;
      const height = 550;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        url,
        'wechat_login',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );
    } catch {
      setError(t('login.wechatLoginFailed'));
    }
  };

  // 通用 OAuth 登录处理
  const handleOAuthLogin = async (provider: string, credential: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post(`/auth/${provider}`, { credential, lang });
      const { token, user, needsEmailSetup } = response.data;
      if (!token) {
        setError(t('login.loginFailed'));
        return;
      }
      setToken(token);
      setUser(user);
      if (needsEmailSetup) {
        localStorage.setItem('lc_needs_email_setup', '1');
        router.push(redirect);
      } else if (!user.hasPassword) {
        setShowGooglePasswordModal(true);
      } else {
        router.push(redirect);
      }
    } catch (err: unknown) {
      const errCode = (err as ApiError).response?.data?.error;
      setError(getErrorMessage(errCode || '') || t('login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 邮箱注册
  const handleRegister = async () => {
    if (!registerEmail || !registerPassword || !registerCode) {
      setError(t('login.fillAllFields'));
      return;
    }
    const accountType = getAccountType(registerEmail);
    if (!accountType) { setError(t('login.invalidEmailFormat')); return; }
    try {
      setRegisterLoading(true);
      setError('');
      const payload = { email: registerEmail, password: registerPassword, code: registerCode, lang };
      const response = await api.post('/auth/register-email', payload);
      const { token, user } = response.data;
      if (!token) { setError(t('login.registerFailed')); return; }
      setToken(token);
      setUser(user);
      setShowRegisterModal(false);
      router.push(redirect);
    } catch (err: unknown) {
      const errCode = (err as ApiError).response?.data?.error;
      setError(getErrorMessage(errCode || '') || t('login.registerFailed'));
    } finally { setRegisterLoading(false); }
  };

  // 设置第三方登录密码
  const handleSetGooglePassword = async () => {
    if (!googlePassword) { setError(t('login.enterPassword')); return; }
    try {
      setGooglePasswordLoading(true);
      setError('');
      await api.post('/auth/set-password', { password: googlePassword });
      setShowGooglePasswordModal(false);
      setGooglePassword('');
      // 显示成功提示
      alert(t('login.passwordSetSuccess'));
      router.push(redirect);
    } catch (err: unknown) {
      const errCode = (err as ApiError).response?.data?.error;
      setError(getErrorMessage(errCode || '') || t('login.setPasswordFailed'));
    } finally { setGooglePasswordLoading(false); }
  };

  // 忘记密码
  const handleForgotPassword = () => {
    setShowForgotModal(true);
    setForgotEmail(account);
  };

  const sendForgotCode = async () => {
    if (!forgotEmail) { setError(t('login.enterEmail')); return; }
    const accountType = getAccountType(forgotEmail);
    if (!accountType) { setError(t('login.invalidEmailFormat')); return; }
    try {
      setForgotLoading(true);
      const payload = { email: forgotEmail, lang, type: 'email' };
      const response = await api.post('/auth/send-code', payload);
      const responseData = response.data as { code?: string };
      if (responseData.code) {
        // 开发环境调试使用，生产环境不显示验证码
        if (process.env.NODE_ENV !== 'production') {
          showToast(`验证码: ${responseData.code}`, 'success');
        }
      } else {
        showToast(t('login.codeSent'), 'success');
      }
      setForgotCountdown(60);
      const timer = setInterval(() => {
        setForgotCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setError((err as ApiError).response?.data?.error || t('login.sendCodeFailed'));
    } finally { setForgotLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!forgotEmail || !forgotCode || !forgotNewPassword) {
      setError(t('login.fillAllFields'));
      return;
    }
    try {
      setForgotLoading(true);
      setError('');
      await api.post('/auth/reset-password', { email: forgotEmail, code: forgotCode, password: forgotNewPassword });
      setShowForgotModal(false);
      showToast(t('login.passwordResetSuccess'), 'success');
    } catch (err: unknown) {
      const errCode = (err as ApiError).response?.data?.error;
      setError(getErrorMessage(errCode || '') || t('login.resetPasswordFailed'));
    } finally { setForgotLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex w-1/2 bg-chest-500 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="shelf" x="0" y="0" width="100" height="60" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="100" height="2" fill="#E8E4DC"/>
                <rect x="10" y="2" width="8" height="40" fill="#E8E4DC"/>
                <rect x="22" y="2" width="6" height="35" fill="#E8E4DC"/>
                <rect x="32" y="2" width="10" height="45" fill="#E8E4DC"/>
                <rect x="46" y="2" width="7" height="38" fill="#E8E4DC"/>
                <rect x="57" y="2" width="9" height="42" fill="#E8E4DC"/>
                <rect x="70" y="2" width="6" height="36" fill="#E8E4DC"/>
                <rect x="80" y="2" width="8" height="44" fill="#E8E4DC"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#shelf)"/>
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Logo size={40} variant="dark" />
          <span className={`text-xl text-parchment tracking-tight ${marketConfig?.market === 'china' ? 'font-black' : 'font-bold'}`}>
            {marketConfig?.market === 'china' ? '链藏' : 'LinkChest'}
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-extrabold text-parchment leading-tight tracking-tight font-display">
            {marketConfig?.market === 'china' ? '解锁你的宝库' : 'Unlock Your Collection'}
          </h2>
        </div>

        <p className={`relative z-10 text-parchment/40 text-sm ${marketConfig?.market === 'china' ? 'font-black' : ''}`}>
          {marketConfig?.market === 'china' ? '链藏' : 'LinkChest'} V1.0
        </p>
      </div>

      {/* 右侧登录区 */}
      <div className="flex-1 flex items-center justify-center bg-paper dark:bg-ink p-6">
        <div className="w-full max-w-md">
          {/* Logo 移动端 */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Logo size={40} variant="light" />
            <span className="text-xl font-bold text-charcoal dark:text-parchment">{t('sidebar.appName')}</span>
          </div>

          {/* 卡片 */}
          <div className="bg-white dark:bg-chest-800/50 rounded-lg border border-chest-500/[0.06] dark:border-parchment/5 p-8 relative">
            {/* 语言切换 */}
            <div className="absolute top-5 right-5" ref={langDropdownRef}>
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-chest-500/10 bg-chest-500/5 text-taupe hover:text-charcoal dark:hover:text-parchment transition-colors cursor-pointer"
              >
                <Globe size={14} />
                <span>{lang === 'zh' ? '中文' : lang === 'ja' ? '日本語' : lang === 'ko' ? '한국어' : lang === 'fr' ? 'Français' : lang === 'de' ? 'Deutsch' : 'English'}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLangDropdown && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-chest-800 border border-chest-500/10 dark:border-parchment/10 rounded-md shadow-lg z-50 overflow-hidden">
                  {([
                    { key: 'zh', label: '中文' },
                    { key: 'en', label: 'English' },
                    { key: 'ja', label: '日本語' },
                    { key: 'ko', label: '한국어' },
                    { key: 'fr', label: 'Français' },
                    { key: 'de', label: 'Deutsch' },
                  ] as { key: SupportedLocale; label: string }[]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { handleLangChange(key); setShowLangDropdown(false); }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        lang === key
                          ? 'bg-chest-500 text-parchment'
                          : 'text-charcoal dark:text-parchment hover:bg-chest-50 dark:hover:bg-chest-700'
                      }`}
                    >
                      <span>{label}</span>
                      {lang === key && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 标题 */}
            <div className="mb-8">
              <h2 className={`text-2xl text-charcoal dark:text-parchment ${marketConfig?.market === 'china' ? 'font-black' : 'font-bold'}`}>
                {marketConfig?.market === 'china' ? '链藏' : 'LinkChest'}
              </h2>
              <p className="text-sm text-taupe mt-1.5">{t('sidebar.subtitle')}</p>
            </div>

            {/* 表单 */}
            <div className="space-y-4">
              <div>
                <label className="label">{t('login.email')}</label>
                <input
                  type="email"
                  placeholder={t('login.enterEmail')}
                  value={account}
                  onChange={(e) => { setAccount(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAccountLogin()}
                  className="input"
                />
              </div>

              <div>
                <label className="label">{t('login.password')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.password')}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAccountLogin()}
                    className="input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-taupe hover:text-charcoal transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-2 text-rust text-sm bg-rust/8 dark:bg-rust/10 px-4 py-3 rounded-md border border-rust/15 dark:border-rust/15">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 忘记密码 */}
              <div className="text-right -mt-1">
                <button onClick={handleForgotPassword} className="text-sm text-chest-500 dark:text-amber-400 hover:text-chest-600 dark:hover:text-amber-300 font-medium transition-colors cursor-pointer">
                  {t('login.forgotPassword')}
                </button>
              </div>

              {/* 登录按钮 */}
              <button
                type="button"
                onClick={() => { console.log('[Login] Button clicked'); handleAccountLogin(); }}
                disabled={loading}
                className="w-full btn-primary btn-lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {t('login.loggingIn')}
                  </span>
                ) : t('login.login')}
              </button>

              {/* 注册提示 */}
              <p className="text-center text-sm text-taupe dark:text-taupe-light/70 pt-1">
                {t('login.noAccount')}
                <button onClick={() => { setError(''); setShowRegisterModal(true); }} className="text-chest-500 dark:text-amber-400 hover:text-chest-600 dark:hover:text-amber-300 font-semibold ml-1 transition-colors cursor-pointer">
                  {t('login.register')}
                </button>
              </p>

              {/* 隐私政策和服务条款 - 注册下方，其他登录方式上方 */}
              <div className="flex items-center justify-center gap-4 text-xs text-taupe py-3">
                <a href="/privacy" className="hover:text-chest-600 dark:hover:text-amber-400 transition-colors">
                  {t('common.privacy') || 'Privacy Policy'}
                </a>
                <span>|</span>
                <a href="/terms" className="hover:text-chest-600 dark:hover:text-amber-400 transition-colors">
                  {t('common.terms') || 'Terms of Service'}
                </a>
              </div>

              {/* 第三方登录 */}
              {!marketLoading && marketConfig && (
                (marketConfig.authProviders.google || marketConfig.authProviders.apple || 
                 marketConfig.authProviders.wechat) && (
                  <div className="pt-4 border-t border-chest-500/[0.06] dark:border-parchment/5">
                    <div className="relative flex items-center py-2">
                      <div className="flex-1 border-t border-taupe/15 dark:border-parchment/10" />
                      <span className="px-3 text-xs text-taupe dark:text-taupe-light/70">{t('login.otherLoginMethods')}</span>
                      <div className="flex-1 border-t border-taupe/15 dark:border-parchment/10" />
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      {GoogleLoginButton && marketConfig.authProviders.google && (
                        <Suspense fallback={<div className="w-10 h-10" />}>
                          <GoogleLoginButton
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                          />
                        </Suspense>
                      )}
                      {marketConfig.authProviders.apple && (
                        <button
                          onClick={handleAppleLogin}
                          className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                          title="Apple Sign In"
                        >
                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.22 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                          </svg>
                        </button>
                      )}
                      {marketConfig.authProviders.wechat && (
                        <button
                          onClick={handleWechatLogin}
                          className="w-10 h-10 rounded-full bg-[#07C160] text-white flex items-center justify-center hover:bg-[#06AD56] transition-colors"
                          title="微信登录"
                        >
                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                          </svg>
                        </button>
                      )}

                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 页面底部备案信息 - 仅国内版显示，右半边中间置地 */}
      <div className="fixed bottom-0 right-0 w-1/2 flex justify-center py-2 bg-paper/80 dark:bg-ink/80 backdrop-blur-sm z-10">
        <ICPFiling />
      </div>

      {/* 注册弹窗 */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-chest-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-charcoal dark:text-parchment mb-4">{t('login.register')}</h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder={t('login.email')}
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                className="input"
              />
              <div className="relative">
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder={t('login.password')}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-taupe hover:text-charcoal transition-colors cursor-pointer"
                >
                  {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('login.verificationCode')}
                  value={registerCode}
                  onChange={(e) => setRegisterCode(e.target.value)}
                  className="input flex-1"
                />
                <button
                  onClick={() => sendCode(registerEmail)}
                  disabled={countdown > 0 || loading}
                  className="btn-secondary px-4 whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : t('login.sendCode')}
                </button>
              </div>
              {error && <p className="text-rust text-sm">{error}</p>}
              <button
                onClick={handleRegister}
                disabled={registerLoading}
                className="w-full btn-primary"
              >
                {registerLoading ? t('login.registering') : t('login.register')}
              </button>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="w-full btn-ghost"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 第三方登录密码设置弹窗 */}
      {showGooglePasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-chest-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-charcoal dark:text-parchment mb-4">{t('login.setPassword')}</h3>
            <p className="text-sm text-taupe mb-4">{t('login.setPasswordPrompt')}</p>
            <div className="space-y-3">
              <input
                type="password"
                placeholder={t('login.password')}
                value={googlePassword}
                onChange={(e) => setGooglePassword(e.target.value)}
                className="input"
              />
              {error && <p className="text-rust text-sm">{error}</p>}
              <button
                onClick={handleSetGooglePassword}
                disabled={googlePasswordLoading}
                className="w-full btn-primary"
              >
                {googlePasswordLoading ? t('common.saving') : t('common.save')}
              </button>
              <button
                onClick={() => {
                  setShowGooglePasswordModal(false);
                  router.push(redirect);
                }}
                className="w-full btn-ghost"
              >
                {t('login.setPasswordLater')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 忘记密码弹窗 */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-chest-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-charcoal dark:text-parchment mb-4">{t('login.resetPassword')}</h3>
            <div className="space-y-3">
              <input
                type="email"
                placeholder={t('login.email')}
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="input"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('login.verificationCode')}
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value)}
                  className="input flex-1"
                />
                <button
                  onClick={() => sendForgotCode()}
                  disabled={forgotCountdown > 0 || forgotLoading}
                  className="btn-secondary px-4 whitespace-nowrap"
                >
                  {forgotCountdown > 0 ? `${forgotCountdown}s` : t('login.sendCode')}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showForgotPassword ? 'text' : 'password'}
                  placeholder={t('login.newPassword')}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(!showForgotPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-taupe hover:text-charcoal transition-colors cursor-pointer"
                >
                  {showForgotPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-rust text-sm">{error}</p>}
              <button
                onClick={handleResetPassword}
                disabled={forgotLoading}
                className="w-full btn-primary"
              >
                {forgotLoading ? t('common.saving') : t('login.resetPassword')}
              </button>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-full btn-ghost"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
