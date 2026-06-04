'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Crown,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Bookmark,
  Tag,
  FolderTree,
  Share2,
  ImageIcon,
  Package,
  Download,
  Shield,
  XCircle,
} from 'lucide-react';
import { api, getMarketConfig, type MarketConfig } from '@/lib/api';
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
  allTiers: TierConfig[];
}

const limitIcons: Record<string, React.ElementType> = {
  collections: Bookmark,
  tags: Tag,
  lists: FolderTree,
  shares: Share2,
  shareItems: Share2,
  coverImages: ImageIcon,
  coverImagesDaily: ImageIcon,
  maxItemsPerShare: Package,
  dailyImportLimit: Download,
  metadataDailyLimit: Download,
  trashRetentionDays: Package,
};

// 需要从配额列表中完全隐藏的功能开关字段（包括已废弃的 shareExpiry）
const hiddenQuotaKeys = new Set(['sharePassword', 'shareStats', 'shareRating', 'shareViews', 'shareExpiry']);

function getLimitKeys(allTiers: TierConfig[]) {
  const keys = Array.from(new Set(allTiers.flatMap(t => Object.keys(t.limits || {}))));
  // v3.0: 只展示有区分度的数值配额项，过滤掉 boolean 功能开关和功能性无限项
  const distinctKeys = keys.filter(k => {
    if (hiddenQuotaKeys.has(k)) return false;
    const values = allTiers.map(t => t.limits?.[k]).filter(v => v !== undefined);
    // 排除 boolean 类型的功能开关字段
    if (values.some(v => typeof v === 'boolean')) return false;
    const uniqueValues = new Set(values);
    return uniqueValues.size > 1;
  });
  const priority = ['shares', 'maxItemsPerShare', 'dailyImportLimit', 'coverImagesDaily', 'metadataDailyLimit', 'trashRetentionDays'];
  const prioritySet = new Set(priority);
  const sorted = [
    ...priority.filter(k => distinctKeys.includes(k)),
    ...distinctKeys.filter(k => !prioritySet.has(k)),
  ];
  return sorted;
}

// 要展示的特权开关（boolean 字段）- 与后台套餐对比保持一致
const featureFlagKeys = ['sharePassword', 'shareStats', 'shareRating', 'shareViews'];

function getFeatureFlags(tier: TierConfig) {
  return featureFlagKeys.map(key => ({
    key,
    enabled: !!tier.limits?.[key],
    labelKey: `tier.${key}`,
  }));
}

// benefit 文本到 i18n key 的映射（支持英文 key 和中文文本）
const benefitI18nMap: Record<string, string> = {
  batchops: 'tier.benefitBatchOps',
  批量操作: 'tier.benefitBatchOps',
  exportpdf: 'tier.benefitExportPdf',
  导出pdf: 'tier.benefitExportPdf',
  sharestats: 'tier.shareStats',
  分享访问统计: 'tier.shareStats',
  earlyaccess: 'tier.benefitEarlyAccess',
  新功能优先体验: 'tier.benefitEarlyAccess',
  sharelayout: 'tier.benefitShareLayout',
  分享布局: 'tier.benefitShareLayout',
  sharepassword: 'tier.sharePassword',
  分享密码保护: 'tier.sharePassword',
  prioritysupport: 'tier.benefitPrioritySupport',
  优先技术支持: 'tier.benefitPrioritySupport',
  customsharecover: 'tier.benefitCustomShareCover',
  自定义分享封面: 'tier.benefitCustomShareCover',
};

// 已在 feature flags 区域展示的功能，不在 benefits 中重复显示
const hiddenBenefitKeys = ['batchops', 'exportpdf', 'sharestats', 'earlyaccess', 'sharelayout', 'sharepassword', 'prioritysupport', 'customsharecover', 'shareexpiry', 'sharerating', 'shareviews'];

function TierUpgradePageContent() {
  const { t, locale } = useI18n();
  const { showAlert } = useToast();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [payingTier, setPayingTier] = useState<string | null>(null);
  const [marketConfig, setMarketConfig] = useState<MarketConfig | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);

  // 使用 React Query 共享缓存（与 account 页面共用 my-tier key）
  const {
    data,
    isLoading: loading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['my-tier'],
    queryFn: async () => {
      const res = await api.get('/tiers/me');
      return (res.data.data || res.data) as MyTierData;
    },
    // 套餐配置由管理后台控制，价格/权益变更需立即生效，不允许 5 分钟缓存
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (isError) {
      showAlert(t('common.loadFailed').replace('{error}', ''), 'error');
    }
  }, [isError, showAlert, t]);

  // 获取市场配置
  useEffect(() => {
    getMarketConfig()
      .then(config => setMarketConfig(config))
      .catch(() => setMarketConfig(null))
      .finally(() => setMarketLoading(false));
  }, []);

  function getTierColor(tier: string) {
    const map: Record<string, string> = {
      medium: 'from-gray-400 to-gray-500',
      heavy: 'from-chest-500 to-chest-600',
      super: 'from-amber-400 to-amber-600',
    };
    return map[tier] || 'from-gray-400 to-gray-500';
  }

  function getTierBorder(tier: string, isCurrent: boolean) {
    if (isCurrent) return 'border-amber-400 ring-2 ring-amber-400/20';
    const map: Record<string, string> = {
      medium: 'border-gray-200 dark:border-gray-700',
      heavy: 'border-chest-200 dark:border-chest-800',
      super: 'border-amber-200 dark:border-amber-800',
    };
    return map[tier] || 'border-gray-200 dark:border-gray-700';
  }

  function getPrice(tier: TierConfig) {
    const config = (tier.pricing || {}) as Record<string, { usd?: number; cny?: number }>;
    const cycleConfig = config[billingCycle];
    const isChina = marketConfig?.market === 'china';

    if (isChina) {
      // 国内市场：优先读取 cny（人民币分），fallback 到 usd（美元美分）并按汇率折算显示
      const cnyPrice = cycleConfig?.cny;
      if (typeof cnyPrice === 'number' && cnyPrice > 0) {
        // cny 是「分」单位，需要除以 100 转为元
        const yuan = cnyPrice / 100;
        // 整数元显示（如 19），小数显示（如 19.9）
        return { price: Number.isInteger(yuan) ? yuan.toString() : yuan.toFixed(2), symbol: '¥', period: t(`tier.${billingCycle}`) };
      }
      // 兜底：cny 缺失时，警示用户（避免显示美元或 0）
      return null;
    } else {
      // 海外市场：读取 usd（美分）
      const price = cycleConfig?.usd;
      if (typeof price === 'number' && price > 0) {
        const displayPrice = (price / 100).toFixed(2);
        return { price: displayPrice, symbol: '$', period: t(`tier.${billingCycle}`) };
      }
    }

    // 兼容旧数据结构
    const legacy = tier.pricing as Record<string, number> | undefined;
    if (billingCycle === 'yearly' && legacy?.yearlyPrice) {
      const symbol = isChina ? '¥' : '$';
      return { price: legacy.yearlyPrice, symbol, period: t('tier.yearly') };
    }
    if (legacy?.monthlyPrice) {
      const symbol = isChina ? '¥' : '$';
      return { price: legacy.monthlyPrice, symbol, period: t('tier.monthly') };
    }
    return null;
  }

  function getCurrentTierExpiresAt(data: MyTierData) {
    if (data.tier === 'super' && data.superExpiresAt) {
      return data.superExpiresAt;
    }
    if (data.tier === 'heavy' && data.heavyExpiresAt) {
      return data.heavyExpiresAt;
    }
    if (data.subscription?.expiresAt) {
      return data.subscription.expiresAt;
    }
    return null;
  }

  // PayPal SDK 加载
  const [paypalReady, setPaypalReady] = useState(false);
  const paypalClientId = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID : '';
  useEffect(() => {
    if (!paypalClientId || !marketConfig?.paymentProviders.paypal) return;
    if ((window as any).paypal) {
      setPaypalReady(true);
      return;
    }
    if (document.getElementById('paypal-sdk')) return;

    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD&intent=capture`;
    script.onload = () => setPaypalReady(true);
    script.onerror = () => setPaypalReady(false);
    document.body.appendChild(script);
  }, [paypalClientId, marketConfig?.paymentProviders.paypal]);

  // 微信支付
  function WechatPayButton({ tierKey }: { tierKey: string }) {
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);

    const handlePay = async () => {
      setLoading(true);
      try {
        const res = await api.post('/payments/wechat/create-order', {
          tier: tierKey,
          billingCycle,
        });
        const { orderId, extra } = res.data?.data || {};
        if (extra?.codeUrl) {
          setQrCode(extra.codeUrl);
        }
      } catch (err: any) {
        showAlert(err.response?.data?.message || t('payment.error'), 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <>
        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#07C160] text-white hover:bg-[#06ad56] flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
              微信支付
            </>
          )}
        </button>
        {qrCode && (
          <div className="mt-3 p-4 bg-white rounded-lg border border-chest-200">
            <p className="text-sm text-center text-taupe mb-2">请使用微信扫码支付</p>
            {/* TODO: 使用 qrcode 库生成二维码 */}
            <p className="text-xs text-center text-taupe/60 break-all">{qrCode}</p>
          </div>
        )}
      </>
    );
  }

  // 支付宝支付
  function AlipayButton({ tierKey }: { tierKey: string }) {
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
      setLoading(true);
      try {
        const res = await api.post('/payments/alipay/create-order', {
          tier: tierKey,
          billingCycle,
        });
        const { extra } = res.data?.data || {};
        if (extra?.payUrl) {
          window.location.href = extra.payUrl;
        }
      } catch (err: any) {
        showAlert(err.response?.data?.message || t('payment.error'), 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#1677FF] text-white hover:bg-[#1466d6] flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.5 2h13A2.5 2.5 0 0 1 21 4.5v15a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 19.5v-15A2.5 2.5 0 0 1 5.5 2zm2.646 5.646a.5.5 0 0 0-.707.708l3.5 3.5a.5.5 0 0 0 .707 0l3.5-3.5a.5.5 0 0 0-.707-.708L12 10.793 8.146 6.646zM7 14a.5.5 0 0 0 0 1h10a.5.5 0 0 0 0-1H7z"/>
            </svg>
            支付宝
          </>
        )}
      </button>
    );
  }

  function PayPalCheckoutButton({ tierKey }: { tierKey: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [payMode, setPayMode] = useState<'one_time' | 'subscription'>('subscription');

    useEffect(() => {
      const paypal = (window as any).paypal;
      if (!paypalReady || !containerRef.current || !paypal) return;

      containerRef.current.innerHTML = '';

      const buttons = paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
        createOrder: async () => {
          setPayingTier(tierKey);
          try {
            const res = await api.post('/payments/paypal/create-order', {
              tier: tierKey,
              billingCycle,
              mode: payMode,
            });
            const data = res.data?.data;
            if (data?.mode === 'subscription' && data?.redirectUrl) {
              window.location.href = data.redirectUrl;
              return '';
            }
            return data?.orderId;
          } catch (err: any) {
            showAlert(err.response?.data?.message || t('payment.paypalError'), 'error');
            throw err;
          } finally {
            setPayingTier(null);
          }
        },
        onApprove: async (data: any) => {
          if (payMode === 'subscription') return;
          setPayingTier(tierKey);
          try {
            await api.post('/payments/paypal/capture', {
              orderId: data.orderID,
              tier: tierKey,
              billingCycle,
              mode: payMode,
            });
            showAlert(t('payment.success'), 'success');
            refetch();
          } catch (err: any) {
            showAlert(err.response?.data?.message || t('payment.paypalCaptureFailed'), 'error');
          } finally {
            setPayingTier(null);
          }
        },
        onError: () => {
          showAlert(t('payment.paypalError'), 'error');
          setPayingTier(null);
        },
        onCancel: () => {
          setPayingTier(null);
        },
      });

      buttons.render(containerRef.current);
    }, [tierKey, billingCycle, paypalReady, payMode]);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs">
          <button
            onClick={() => setPayMode('subscription')}
            className={`px-2 py-1 rounded ${payMode === 'subscription' ? 'bg-amber-400 text-chest-500 font-medium' : 'text-taupe dark:text-parchment/60 hover:bg-parchment/10'}`}
          >
            {t('payment.monthlyBilling') || '按月付费'}
          </button>
          <button
            onClick={() => setPayMode('one_time')}
            className={`px-2 py-1 rounded ${payMode === 'one_time' ? 'bg-amber-400 text-chest-500 font-medium' : 'text-taupe dark:text-parchment/60 hover:bg-parchment/10'}`}
          >
            {t('payment.oneTimePurchase') || '一次订购'}
          </button>
        </div>
        {!paypalReady ? (
          <button disabled className="w-full py-2.5 rounded-lg text-sm font-medium bg-chest-100 dark:bg-chest-700 text-taupe dark:text-parchment/60 cursor-default flex items-center justify-center gap-1.5">
            <Loader2 size={14} className="animate-spin" />
            {t('payment.processing') || t('common.loading')}
          </button>
        ) : (
          <div ref={containerRef} className="w-full min-h-[40px]" />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-taupe/40 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-taupe dark:text-parchment/60">{t('common.noData')}</p>
          <button onClick={() => refetch()} className="mt-2 text-sm text-amber-500 hover:text-amber-600">
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const currentLang = locale === 'zh' ? 'nameZh' : 'nameEn';
  const sortedTiers = data.allTiers
    .filter((t) => t.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* 头部 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/account')}
            className="p-2 hover:bg-parchment/10 dark:hover:bg-chest-700/40 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-charcoal dark:text-parchment" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-charcoal dark:text-parchment">{t('tier.comparePlans')}</h2>
            <p className="text-sm text-taupe dark:text-parchment/60 mt-0.5">{t('tier.upgradeHint')}</p>
          </div>
        </div>

        {/* 计费周期切换 */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-amber-400 text-chest-500'
                : 'bg-parchment/10 dark:bg-chest-700/40 text-charcoal dark:text-parchment hover:bg-parchment/20'
            }`}
          >
            {t('tier.monthly')}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-amber-400 text-chest-500'
                : 'bg-parchment/10 dark:bg-chest-700/40 text-charcoal dark:text-parchment hover:bg-parchment/20'
            }`}
          >
            {t('tier.yearly')}
          </button>
        </div>

        {/* 套餐卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedTiers.map((tier) => {
            const isCurrent = tier.key === data.tier;
            const priceInfo = getPrice(tier);
            const isPaying = payingTier === tier.key;
            const canUpgrade = tier.key !== 'medium' && !isCurrent;
            const expiresAt = isCurrent ? getCurrentTierExpiresAt(data) : null;
            return (
              <div
                key={tier.key}
                className={`card border-2 ${getTierBorder(tier.key, isCurrent)} relative overflow-hidden`}
              >
                {isCurrent && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-chest-500">
                    {t('tier.current')}
                  </div>
                )}
                <div className="p-5 text-center">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getTierColor(tier.key)} flex items-center justify-center mx-auto shadow-lg`}>
                    <Crown size={28} className="text-white" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-charcoal dark:text-parchment">
                    {tier[currentLang]}
                  </h3>
                  <p className="text-sm text-taupe dark:text-parchment/60 mt-1">
                    {tier.description || ''}
                  </p>
                  <div className="mt-4">
                    {priceInfo ? (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-2xl font-bold text-charcoal dark:text-parchment">
                          {priceInfo.symbol}{priceInfo.price}
                        </span>
                        <span className="text-sm text-taupe dark:text-parchment/60">
                          {priceInfo.period}
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-charcoal dark:text-parchment">{t('tier.free')}</span>
                    )}
                  </div>
                  {expiresAt && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      {t('tier.expiresAt', { date: new Date(expiresAt).toLocaleDateString() })}
                    </p>
                  )}
                </div>

                {/* 配额列表 */}
                <div className="px-5 pb-3 space-y-2">
                  {getLimitKeys(data.allTiers).map((key) => {
                    const Icon = limitIcons[key] || Bookmark;
                    const val = tier.limits?.[key] ?? '-';
                    const labelMap: Record<string, string> = {
                      collections: t('tier.collections'),
                      tags: t('tier.tags'),
                      lists: t('tier.lists'),
                      shares: t('tier.shares'),
                      shareItems: t('tier.shareItems'),
                      coverImages: t('tier.coverImages'),
                      coverImagesDaily: t('tier.coverImagesDaily'),
                      maxItemsPerShare: t('tier.maxItemsPerShare'),
                      dailyImportLimit: t('tier.dailyImportLimit'),
                      metadataDailyLimit: t('tier.metadataDailyLimit'),
                      trashRetentionDays: t('tier.trashRetentionDays'),
                    };
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <Icon size={14} className="text-taupe/50 dark:text-parchment/40 shrink-0" />
                        <span className="text-charcoal/80 dark:text-parchment/80">{labelMap[key] || key}</span>
                        <span className="flex-1 text-right font-medium text-charcoal dark:text-parchment">
                          {val === -1 || val === 999999 ? '∞' : val}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 特权开关 */}
                <div className="px-5 pb-3 space-y-1.5">
                  {getFeatureFlags(tier).map((feature) => (
                    <div key={feature.key} className="flex items-center gap-2 text-sm">
                      {feature.enabled ? (
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-taupe/30 dark:text-parchment/20 shrink-0" />
                      )}
                      <span className={feature.enabled ? 'text-charcoal/80 dark:text-parchment/80' : 'text-taupe/50 dark:text-parchment/40'}>
                        {t(feature.labelKey) || feature.key}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 权益 */}
                <div className="px-5 pb-5 space-y-1.5">
                  {(tier.benefits || []).filter((b) => {
                    const lower = b.toLowerCase();
                    return !hiddenBenefitKeys.some(h => lower.includes(h));
                  }).map((benefit, idx) => {
                    const i18nKey = benefitI18nMap[benefit] || benefitI18nMap[benefit.toLowerCase()];
                    const displayText = i18nKey ? t(i18nKey) : null;
                    if (!displayText) return null;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm text-charcoal/80 dark:text-parchment/80">
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                        <span>{displayText}</span>
                      </div>
                    );
                  })}
                </div>

                {/* 操作按钮 */}
                <div className="px-5 pb-5">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-chest-100 dark:bg-chest-700 text-taupe dark:text-parchment/60 cursor-default"
                    >
                      {t('tier.current')}
                    </button>
                  ) : canUpgrade ? (
                    <div className="space-y-2">
                      {!marketLoading && marketConfig?.paymentProviders.paypal && (
                        <PayPalCheckoutButton tierKey={tier.key} />
                      )}
                      {!marketLoading && marketConfig?.paymentProviders.wechat_pay && (
                        <WechatPayButton tierKey={tier.key} />
                      )}
                      {!marketLoading && marketConfig?.paymentProviders.alipay && (
                        <AlipayButton tierKey={tier.key} />
                      )}
                      {marketLoading && (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-lg text-sm font-medium bg-chest-100 dark:bg-chest-700 text-taupe dark:text-parchment/60 cursor-default flex items-center justify-center gap-2"
                        >
                          <Loader2 size={14} className="animate-spin" />
                          {t('common.loading')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-chest-100 dark:bg-chest-700 text-taupe dark:text-parchment/60 cursor-default"
                    >
                      {t('tier.free')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function TierUpgradePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-taupe/40 animate-spin" />
        </div>
      }
    >
      <TierUpgradePageContent />
    </Suspense>
  );
}
