'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Lock, Mail, AlertTriangle, X,
  ChevronRight, Trash2, Loader2, ImageIcon,
  Crown, Zap, Copy,
} from 'lucide-react';
import { api, type ApiError } from '@/lib/api';
import { getUser, setUser as saveUser, logout } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';

import { UsernameModal, PasswordModal, EmailModal, EmailSetupModal } from '@/components/modals/AccountModals';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';

interface TierConfig {
  id: string;
  key: string;
  nameZh: string;
  nameEn: string;
  description?: string;
  limits: Record<string, number>;
  pricing?: Record<string, unknown>;
  benefits?: string[];
  isActive: boolean;
  sortOrder: number;
}

interface MyTierData {
  tier: string;
  planNameZh: string;
  planNameEn: string;
  heavyExpiresAt: string | null;
  superExpiresAt: string | null;
  subscription: {
    status: string;
    expiresAt: string | null;
    source: string | null;
  } | null;
  limits: Record<string, number>;
  usage: Record<string, number>;
  benefits: string[];
  allTiers: TierConfig[];
}

// ==================== Delete Account Modal ====================

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const requiredText = t('account.deleteAccountConfirmPhrase');

  const handleDelete = async () => {
    if (confirmText !== requiredText) return;
    setLoading(true);
    try {
      await api.delete('/auth/account');
      logout(); // logout() 内部已处理跳转到 /login
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      showAlert(apiErr.response?.data?.message || apiErr.response?.data?.error || t('account.deleteAccountFailed'), 'error');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-paper dark:bg-chest-800 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-rust">{t('account.deleteAccount')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/50 rounded"><X size={20} className="text-taupe dark:text-parchment/60" /></button>
        </div>
        <div className="mb-4 p-3 bg-rust/5 dark:bg-rust/10 rounded-lg">
          <p className="text-sm text-rust dark:text-rust/80 font-medium">{t('account.irreversibleWarning')}</p>
          <p className="text-sm text-rust dark:text-rust/80 mt-1">{t('account.dataWillBeDeleted')}</p>
        </div>
        <p className="text-sm text-charcoal/80 dark:text-parchment/80 mb-2">{t('account.enterToConfirm')}<strong className="text-rust">{requiredText}</strong>{t('account.toConfirmDelete')}：</p>
        <input
          type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
          placeholder={requiredText} className="input mb-4" autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-chest-200 dark:border-chest-600/40 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/40 text-charcoal/80 dark:text-parchment/80">{t('common.cancel')}</button>
          <button onClick={handleDelete} disabled={confirmText !== requiredText || loading}
            className="flex-1 py-2 bg-rust text-white rounded-lg hover:bg-rust/90 disabled:bg-chest-200 dark:disabled:bg-chest-700">
            {loading ? t('account.deleting') : t('account.permanentlyDelete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Account Page ====================

export default function AccountPage() {
  const { t, locale } = useI18n();
  const { showToast, showAlert } = useToast();
  const router = useRouter();
  const [user, setLocalUser] = useState<{
    id?: string;
    email?: string | null;
    googleId?: string | null;
    appleId?: string | null;
    wechatOpenId?: string | null;
    alipayId?: string | null;
    authSource?: string | null;
    [key: string]: unknown;
  } | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalUser(getUser()); }, []);

  // Tier data — 使用 React Query 缓存，关闭网页再打开可从持久化缓存秒开
  const {
    data: tierData,
    isLoading: tierLoading,
    isError: tierError,
    refetch: refetchTier,
  } = useQuery({
    queryKey: ['my-tier'],
    queryFn: async () => {
      const res = await api.get('/tiers/me');
      const payload = res.data?.data || res.data;
      return payload && typeof payload === 'object' && 'tier' in payload
        ? (payload as MyTierData)
        : null;
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内视为新鲜，减少重复请求
    refetchOnWindowFocus: false,
  });

  // Referral data — 同样使用 React Query 缓存
  const {
    data: referralData,
    isLoading: referralLoading,
  } = useQuery({
    queryKey: ['referral-data'],
    queryFn: async () => {
      const [codeRes, statsRes] = await Promise.all([
        api.post('/referrals/code').catch(() => ({ data: { data: null } })),
        api.get('/referrals/stats').catch(() => ({ data: { data: null } })),
      ]);
      return {
        code: codeRes.data?.data?.code || null,
        stats: statsRes.data?.data || null,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const referralCode = referralData?.code || null;
  const referralStats = referralData?.stats || null;

  function getTierColor(tier: string) {
    const map: Record<string, string> = {
      medium: 'from-gray-300 to-gray-400',
      heavy: 'from-blue-600 to-blue-800',
      super: 'from-amber-400 to-amber-600',
    };
    return map[tier] || 'from-gray-300 to-gray-400';
  }

  function getTierBg(tier: string) {
    const map: Record<string, string> = {
      medium: 'bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700',
      heavy: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      super: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    };
    return map[tier] || 'bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700';
  }

  // 查询系统封面（AI封面）和用户封面
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

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data.data || res.data;
      saveUser(userData);
      setLocalUser(userData);
    } catch { /* ignore */ }
  };

  const compressImage = (file: File, maxWidth = 400, maxHeight = 400, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(img.src);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('图片加载失败，可能是不支持的格式'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showAlert(t('cover.uploadTooLarge'), 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showAlert(t('cover.uploadInvalid'), 'error');
      return;
    }

    setAvatarUploading(true);
    try {
      console.log('[Avatar] 原始文件大小:', (file.size / 1024).toFixed(1), 'KB');
      const base64 = await compressImage(file, 400, 400, 0.8);
      console.log('[Avatar] 压缩后 base64 长度:', base64.length, '字符, 约', (base64.length / 1024).toFixed(1), 'KB');
      const response = await api.post('/upload/avatar', { imageData: base64 });
      console.log('[Avatar] 上传响应:', response.data);
      const avatarUrl = response.data?.data?.url;
      if (avatarUrl) {
        await refreshUser();
        showToast(t('account.avatarUploadSuccess'), 'success');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      // 区分 compressImage 错误和 API 错误
      const isCompressError = !apiErr.response && (err instanceof Error);
      const respData = apiErr.response?.data as Record<string, unknown> | undefined;
      const detail = (respData?.details as Record<string, unknown>)?.detail as string || respData?.detail as string || '';
      const msg = respData?.message as string || (err instanceof Error ? err.message : '') || t('account.avatarUploadFailed');
      const status = apiErr.response?.status;
      console.error('[Avatar Upload Error]', { status, msg, detail, err, responseData: respData });
      if (status === 413) {
        showAlert('图片太大，请尝试选择更小的图片', 'error');
      } else if (isCompressError) {
        showAlert(`图片处理失败: ${msg}`, 'error');
      } else {
        showAlert(detail ? `${msg} (${detail})` : msg, 'error');
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await api.delete('/upload/avatar');
      await refreshUser();
      showToast(t('account.avatarDeleteSuccess'), 'success');
    } catch {
      showAlert(t('account.avatarDeleteFailed'), 'error');
    }
  };

  const handleAvatarFromUrl = async (imageUrl: string) => {
    setAvatarUploading(true);
    try {
      const response = await api.post('/upload/avatar-from-cover', { coverUrl: imageUrl });
      const avatarUrl = response.data?.data?.url;
      if (avatarUrl) {
        await refreshUser();
      }
      setShowCoverPicker(false);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const respData = apiErr.response?.data as Record<string, unknown> | undefined;
      const detail = (respData?.details as Record<string, unknown>)?.detail as string || respData?.detail as string || '';
      const msg = respData?.message as string || (err instanceof Error ? err.message : '') || t('account.avatarUploadFailed');
      showAlert(detail ? `${msg} (${detail})` : msg, 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">

          {/* Page Header */}
          <div>
            <h2 className="text-xl font-semibold text-charcoal dark:text-parchment">{t('account.pageTitle')}</h2>
            <p className="text-sm text-taupe dark:text-parchment/60 mt-1">{t('account.pageDesc')}</p>
          </div>

          {/* ===== Avatar Section ===== */}
          <div className="card">
            <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
              <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('account.avatar')}</h3>
            </div>
            <div className="px-5 py-5 flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-chest-100 dark:bg-chest-700/50 flex items-center justify-center">
                  {user?.avatar ? (
                    <img src={user.avatar as string} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={32} className="text-taupe/40 dark:text-parchment/30" />
                  )}
                </div>
                {avatarUploading && (
                  <div className="absolute inset-0 w-20 h-20 rounded-full bg-black/30 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="px-3 py-1.5 text-sm border border-taupe/15 dark:border-parchment/10 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/40 text-charcoal dark:text-parchment transition-colors disabled:opacity-50"
                  >
                    {t('account.localUpload')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCoverPicker(true)}
                    disabled={avatarUploading}
                    className="px-3 py-1.5 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
                  >
                    {t('account.selectFromCover')}
                  </button>
                </div>
                <p className="text-xs text-taupe dark:text-parchment/50">{t('account.avatarHint')}</p>
                {!!user?.avatar && (
                  <button
                    onClick={handleDeleteAvatar}
                    className="text-xs text-rust hover:text-rust/80 transition-colors"
                  >
                    {t('account.deleteAvatarBtn')}
                  </button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>

        {/* ===== Account & Security ===== */}
        <div className="card">
          <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
            <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('account.accountInfo')}</h3>
          </div>
          <div className="divide-y divide-chest-50 dark:divide-chest-800/50">
            <button onClick={() => setModal('username')} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-parchment/10 dark:hover:bg-chest-700/40 transition-colors">
              <User size={20} className="text-taupe/60 dark:text-parchment/40" />
              <div className="flex-1 text-left">
                <p className="font-medium text-charcoal dark:text-parchment">{t('account.username')}</p>
                <p className="text-sm text-taupe dark:text-parchment/60">{(user?.username as string) || (user?.nickname as string) || t('account.notSet')}</p>
              </div>
              <ChevronRight size={18} className="text-taupe/30 dark:text-parchment/20" />
            </button>
            <button onClick={() => setModal('password')} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-parchment/10 dark:hover:bg-chest-700/40 transition-colors">
              <Lock size={20} className="text-taupe/60 dark:text-parchment/40" />
              <div className="flex-1 text-left">
                <p className="font-medium text-charcoal dark:text-parchment">{t('account.password')}</p>
                <p className="text-sm text-taupe dark:text-parchment/60">{(user?.hasPassword as boolean) ? t('account.set') : t('account.notSet')}</p>
              </div>
              <ChevronRight size={18} className="text-taupe/30 dark:text-parchment/20" />
            </button>
            {/* 邮箱设置 - 所有用户都可以修改，OAuth 用户未设置邮箱时显示补充提醒 */}
            <button onClick={() => setModal(user?.email ? 'email' : 'email-setup')} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-parchment/10 dark:hover:bg-chest-700/40 transition-colors">
              <Mail size={20} className="text-taupe/60 dark:text-parchment/40" />
              <div className="flex-1 text-left">
                <p className="font-medium text-charcoal dark:text-parchment">{t('account.email')}</p>
                <p className="text-sm text-taupe dark:text-parchment/60">
                  {(user?.email as string) || (
                    <span className="text-rust">{t('account.emailNotSet')} — {t('account.clickToSetup')}</span>
                  )}
                </p>
              </div>
              <ChevronRight size={18} className="text-taupe/30 dark:text-parchment/20" />
            </button>

            {/* 第三方登录账户绑定 */}
            <div className="w-full px-5 py-4">
              <p className="text-sm font-medium text-taupe dark:text-parchment/60 mb-3">{t('account.linkedAccounts')}</p>
              <div className="space-y-2">
                {/* Google */}
                {user?.googleId && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-parchment/5 dark:bg-chest-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">G</span>
                    </div>
                    <span className="text-sm text-charcoal dark:text-parchment">{t('account.provider.google')}</span>
                    <span className="ml-auto text-xs text-taupe/50">{t('account.linked')}</span>
                  </div>
                )}
                {/* Apple */}
                {user?.appleId && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-parchment/5 dark:bg-chest-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <span className="text-sm text-charcoal dark:text-parchment">{t('account.provider.apple')}</span>
                    <span className="ml-auto text-xs text-taupe/50">{t('account.linked')}</span>
                  </div>
                )}
                {/* WeChat */}
                {user?.wechatOpenId && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-parchment/5 dark:bg-chest-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">微</span>
                    </div>
                    <span className="text-sm text-charcoal dark:text-parchment">{t('account.provider.wechat')}</span>
                    <span className="ml-auto text-xs text-taupe/50">{t('account.linked')}</span>
                  </div>
                )}
                {/* Alipay */}
                {user?.alipayId && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-parchment/5 dark:bg-chest-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">支</span>
                    </div>
                    <span className="text-sm text-charcoal dark:text-parchment">{t('account.provider.alipay')}</span>
                    <span className="ml-auto text-xs text-taupe/50">{t('account.linked')}</span>
                  </div>
                )}
                {/* 邮箱登录 */}
                {user?.email && !user?.authSource && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-parchment/5 dark:bg-chest-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-chest-500 flex items-center justify-center">
                      <Mail size={14} className="text-white" />
                    </div>
                    <span className="text-sm text-charcoal dark:text-parchment">{t('account.provider.email')}</span>
                    <span className="ml-auto text-xs text-taupe/50">{t('account.linked')}</span>
                  </div>
                )}
                {/* 未绑定任何第三方账户 */}
                {!user?.googleId && !user?.appleId && !user?.wechatOpenId && !user?.alipayId && !user?.email && (
                  <p className="text-xs text-taupe/50 text-center py-2">{t('account.noLinkedAccounts')}</p>
                )}
              </div>
            </div>

            {/* 套餐到期时间 */}
            {tierData && (
              <div className="w-full flex items-center gap-4 px-5 py-4">
                <Crown size={20} className="text-taupe/60 dark:text-parchment/40" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-charcoal dark:text-parchment">{t('tier.currentPlan')}</p>
                  <p className="text-sm text-taupe dark:text-parchment/60">
                    {locale === 'zh' ? tierData.planNameZh : tierData.planNameEn}
                    {tierData.superExpiresAt && (
                      <span className="text-amber-600 dark:text-amber-400 ml-1">
                        · {t('tier.superExpires')} {new Date(tierData.superExpiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                      </span>
                    )}
                    {tierData.heavyExpiresAt && (
                      <span className="text-blue-600 dark:text-blue-400 ml-1">
                        · {t('tier.heavyExpires')} {new Date(tierData.heavyExpiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                      </span>
                    )}
                    {!tierData.superExpiresAt && !tierData.heavyExpiresAt && tierData.subscription?.expiresAt && (
                      <span className="ml-1">
                        · {new Date(tierData.subscription.expiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')} {t('tier.expires')}
                      </span>
                    )}
                    {!tierData.superExpiresAt && !tierData.heavyExpiresAt && !tierData.subscription?.expiresAt && (
                      <span className="ml-1">· {t('tier.free')}</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== Current Tier ===== */}
        {tierLoading ? (
          <div className="card flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-taupe/40 animate-spin" />
          </div>
        ) : tierError ? (
          <div className="card flex flex-col items-center justify-center py-6 gap-3">
            <p className="text-sm text-taupe dark:text-parchment/60">{t('common.loadFailed').replace('{error}', '')}</p>
            <button
              onClick={() => refetchTier()}
              className="px-4 py-2 text-sm font-medium bg-chest-500 text-white rounded-lg hover:bg-chest-600 transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : tierData ? (
          <>
            {/* 当前等级卡片 */}
            <div className={`card border-2 ${getTierBg(tierData.tier)}`}>
              <div className="px-5 pt-5 pb-3 flex items-center gap-5">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getTierColor(tierData.tier)} flex items-center justify-center shadow-lg`}>
                  <Crown size={26} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-charcoal dark:text-parchment">
                      {locale === 'zh' ? tierData.planNameZh : tierData.planNameEn}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      {t('tier.current')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/tier/upgrade')}
                  className="px-4 py-2 bg-amber-400 text-chest-500 rounded-lg text-sm font-semibold hover:bg-amber-500 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Zap size={16} />
                  {t('tier.upgrade')}
                </button>
              </div>
              {/* 到期时间独立显示在账户信息下方 */}
              <div className="px-5 pb-5 space-y-1">
                {tierData.superExpiresAt && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    {t('tier.superExpires')}: {new Date(tierData.superExpiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                  </p>
                )}
                {tierData.heavyExpiresAt && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {t('tier.heavyExpires')}: {new Date(tierData.heavyExpiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                  </p>
                )}
                {!tierData.superExpiresAt && !tierData.heavyExpiresAt && tierData.subscription?.expiresAt && (
                  <p className="text-sm text-taupe dark:text-parchment/60">
                    {new Date(tierData.subscription.expiresAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                    {' '}{t('tier.expires')}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}

        {/* ===== Referral Program ===== */}
        <div className="card">
          <div className="px-5 py-3 border-b border-chest-100 dark:border-chest-700/50">
            <h3 className="text-sm font-medium text-taupe dark:text-parchment/60 uppercase tracking-wide">{t('account.myReferralCode')}</h3>
          </div>
          <div className="px-5 py-5">
            {referralLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-taupe/40 animate-spin" />
              </div>
            ) : referralCode ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                  <p className="text-sm text-amber-700 dark:text-amber-400">{t('account.referralDesc')}</p>
                  <a
                    href="/docs/referral-rules.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-600 dark:text-amber-400 underline mt-1 inline-block hover:text-amber-800 dark:hover:text-amber-300"
                  >
                    {t('account.referralRulesLink')}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 p-3 bg-parchment/5 dark:bg-chest-800/30 rounded-lg border border-dashed border-chest-200 dark:border-chest-600/40">
                    <p className="text-2xl font-bold text-charcoal dark:text-parchment tracking-widest text-center font-mono">{referralCode}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                      showToast(t('account.referralCopied'), 'success');
                    }}
                    className="p-3 border border-taupe/15 dark:border-parchment/10 rounded-lg hover:bg-parchment/10 dark:hover:bg-chest-700/40 text-charcoal dark:text-parchment transition-colors"
                    title={t('account.copyReferralCode')}
                  >
                    <Copy size={20} />
                  </button>
                </div>
                {referralStats && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center p-2 rounded-lg bg-parchment/5 dark:bg-chest-800/30">
                      <p className="text-lg font-bold text-charcoal dark:text-parchment">{referralStats.totalInvited ?? referralStats.total ?? 0}</p>
                      <p className="text-xs text-taupe dark:text-parchment/50">{t('account.referralTotalInvited')}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-parchment/5 dark:bg-chest-800/30">
                      <p className="text-lg font-bold text-charcoal dark:text-parchment">{referralStats.upgradedCount ?? referralStats.registered ?? 0}</p>
                      <p className="text-xs text-taupe dark:text-parchment/50">{t('account.referralUpgraded')}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-parchment/5 dark:bg-chest-800/30">
                      <p className="text-lg font-bold text-charcoal dark:text-parchment">{referralStats.totalRewardDays ?? referralStats.rewarded ?? 0}</p>
                      <p className="text-xs text-taupe dark:text-parchment/50">{t('account.referralRewardDays')}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-taupe dark:text-parchment/60 text-center py-2">{t('account.referralLoading')}</p>
            )}
          </div>
        </div>

        {/* ===== Danger Zone ===== */}
          <div className="card border border-rust/20 dark:border-rust/30">
            <div className="px-5 py-3 border-b border-rust/10 dark:border-rust/20">
              <h3 className="text-sm font-medium text-rust uppercase tracking-wide">{t('account.dangerZone')}</h3>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-charcoal dark:text-parchment">{t('account.deleteAccount')}</p>
                  <p className="text-sm text-taupe dark:text-parchment/60 mt-0.5">{t('account.deleteAccountDesc')}</p>
                </div>
                <button
                  onClick={() => setModal('delete-account')}
                  className="px-4 py-2 text-sm text-rust border border-rust/30 dark:border-rust/40 rounded-lg hover:bg-rust/5 dark:hover:bg-rust/10 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> {t('account.deleteAccount')}
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ===== Modals ===== */}
      {modal === 'username' && (
        <UsernameModal current={(user?.username as string) || ''} onClose={() => setModal(null)}
          onSuccess={v => { const u = { ...user, username: v }; saveUser(u); setLocalUser(u); refreshUser(); }} />
      )}
      {modal === 'password' && (
        <PasswordModal hasPassword={user?.hasPassword as boolean} onClose={() => setModal(null)}
          onSuccess={() => refreshUser()} />
      )}
      {modal === 'email' && (
        <EmailModal current={(user?.email as string) || ''} onClose={() => setModal(null)}
          onSuccess={v => { const u = { ...user, email: v }; saveUser(u); setLocalUser(u); refreshUser(); }} />
      )}
      {modal === 'email-setup' && (
        <EmailSetupModal onClose={() => setModal(null)}
          onSuccess={() => { refreshUser(); }} />
      )}
      {modal === 'delete-account' && (
        <DeleteAccountModal onClose={() => setModal(null)} />
      )}

      {/* Cover Picker Modal */}
      {showCoverPicker && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4" onClick={() => setShowCoverPicker(false)}>
          <div className="bg-paper dark:bg-chest-800 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-chest-100 dark:border-chest-700/50">
              <h3 className="text-base font-semibold text-charcoal dark:text-parchment">{t('account.selectFromCover')}</h3>
              <button onClick={() => setShowCoverPicker(false)} className="p-1.5 hover:bg-parchment/20 dark:hover:bg-chest-700/50 rounded-lg transition-colors">
                <X size={18} className="text-taupe dark:text-parchment/60" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* AI Covers */}
              <div>
                <p className="text-sm font-medium text-charcoal dark:text-parchment mb-2">{t('cover.modeAi')}</p>
                {systemCoversData?.data && systemCoversData.data.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {(systemCoversData.data as { id: string; cosUrl: string }[]).map((cover) => (
                      <button
                        key={cover.id}
                        type="button"
                        onClick={() => handleAvatarFromUrl(cover.cosUrl)}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-parchment/20 dark:border-charcoal/40 hover:border-amber-400 transition-all"
                      >
                        <img src={cover.cosUrl} alt="cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-parchment/20 dark:border-charcoal/40 bg-parchment/5 dark:bg-charcoal/20">
                    <ImageIcon size={24} className="text-taupe/30 dark:text-parchment/20" />
                    <p className="text-xs text-taupe dark:text-parchment/50">{t('cover.noCoversInLibrary')}</p>
                  </div>
                )}
              </div>
              {/* My Covers */}
              <div>
                <p className="text-sm font-medium text-charcoal dark:text-parchment mb-2">{t('cover.modeLibrary')}</p>
                {coverLibraryData?.data && coverLibraryData.data.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {(coverLibraryData.data as { id: string; cosUrl: string }[]).map((cover) => (
                      <button
                        key={cover.id}
                        type="button"
                        onClick={() => handleAvatarFromUrl(cover.cosUrl)}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-parchment/20 dark:border-charcoal/40 hover:border-amber-400 transition-all"
                      >
                        <img src={cover.cosUrl} alt="cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-parchment/20 dark:border-charcoal/40 bg-parchment/5 dark:bg-charcoal/20">
                    <ImageIcon size={24} className="text-taupe/30 dark:text-parchment/20" />
                    <p className="text-xs text-taupe dark:text-parchment/50">{t('cover.noCoversInLibrary')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
