'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, FolderTree, Share2, Globe, Monitor, Smartphone, TabletSmartphone, ArrowRight, Check } from 'lucide-react';
import Logo from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import { isLoggedIn } from '@/lib/auth';
import { getMarketConfig, MarketConfig } from '@/lib/api/market';
import ICPFiling from '@/components/ICPFiling';

// 语言切换按钮
function LanguageSwitcher({
  currentLocale,
  onSwitch,
}: {
  currentLocale: string;
  onSwitch: (locale: 'zh' | 'en') => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-lg p-1">
      <button
        onClick={() => onSwitch('zh')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          currentLocale === 'zh'
            ? 'bg-chest-500 text-white'
            : 'text-taupe hover:text-charcoal dark:hover:text-parchment'
        }`}
      >
        中文
      </button>
      <button
        onClick={() => onSwitch('en')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          currentLocale === 'en'
            ? 'bg-chest-500 text-white'
            : 'text-taupe hover:text-charcoal dark:hover:text-parchment'
        }`}
      >
        EN
      </button>
    </div>
  );
}

// 特性卡片组件
function FeatureCard({
  icon,
  title,
  description,
  highlights,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
  index: number;
}) {
  return (
    <div
      className="group relative bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
    >
      {/* 序号装饰 */}
      <div className="absolute top-6 right-6 text-6xl font-display font-bold text-chest-500/[0.06] dark:text-chest-400/[0.06] leading-none select-none">
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* 图标 */}
      <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5">
        {icon}
      </div>

      {/* 标题与描述 */}
      <h3 className="font-display text-xl font-bold text-charcoal dark:text-parchment mb-2">
        {title}
      </h3>
      <p className="text-sm text-taupe leading-relaxed mb-5">
        {description}
      </p>

      {/* 亮点列表 */}
      <ul className="space-y-2.5">
        {highlights.map((h, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-charcoal/80 dark:text-parchment/80">
            <Check className="w-4 h-4 text-sage shrink-0 mt-0.5" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 平台项组件
function PlatformItem({
  icon,
  label,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5">
      <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
        {icon}
      </div>
      <span className="text-sm font-medium text-charcoal dark:text-parchment">{label}</span>
      {badge && (
        <span className="text-[10px] font-medium text-chest-500 bg-chest-500/10 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [isClient, setIsClient] = useState(false);
  const [marketConfig, setMarketConfig] = useState<MarketConfig | null>(null);

  useEffect(() => {
    setIsClient(true);

    // 已登录用户直接跳转
    if (isLoggedIn()) {
      router.replace('/collections');
      return;
    }

    // 获取市场配置
    async function fetchMarketConfig() {
      try {
        const config = await getMarketConfig();
        setMarketConfig(config);
        // 根据域名设置默认语言
        const isChinaDomain = window.location.hostname.includes('linkchest.cn');
        if (isChinaDomain && locale !== 'zh') {
          setLocale('zh');
        } else if (!isChinaDomain && locale !== 'en') {
          setLocale('en');
        }
      } catch {
        // 忽略错误
      }
    }
    fetchMarketConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 客户端 hydration 完成前显示加载状态
  if (!isClient) {
    return (
      <div className="flex h-screen bg-paper dark:bg-ink items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chest-500"></div>
      </div>
    );
  }

  const isChina = marketConfig?.market === 'china';
  const isZh = locale === 'zh';
  const appName = isChina ? '链藏' : 'LinkChest';

  // 三大核心特性
  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: t('landing.feature1Title'),
      description: t('landing.feature1Desc'),
      highlights: [
        t('landing.feature1H1'),
        t('landing.feature1H2'),
        t('landing.feature1H3'),
      ],
    },
    {
      icon: <FolderTree className="w-6 h-6" />,
      title: t('landing.feature2Title'),
      description: t('landing.feature2Desc'),
      highlights: [
        t('landing.feature2H1'),
        t('landing.feature2H2'),
        t('landing.feature2H3'),
      ],
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: t('landing.feature3Title'),
      description: t('landing.feature3Desc'),
      highlights: [
        t('landing.feature3H1'),
        t('landing.feature3H2'),
        t('landing.feature3H3'),
      ],
    },
  ];

  // 支持的平台
  const platforms = [
    {
      icon: <Monitor className="w-5 h-5" />,
      label: t('landing.platformWeb'),
    },
    {
      icon: <Globe className="w-5 h-5" />,
      label: t('landing.platformChrome'),
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      label: t('landing.platformAndroid'),
    },
    {
      icon: <TabletSmartphone className="w-5 h-5" />,
      label: t('landing.platformIOS'),
      badge: isZh ? '即将上线' : 'Coming Soon',
    },
  ];

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      {/* ====== Header ====== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-surface/80 dark:bg-surface-dark/80 border-b border-black/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={32} />
            <span className="font-display text-lg font-semibold text-charcoal dark:text-parchment group-hover:text-chest-500 transition-colors">
              {appName}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher
              currentLocale={locale}
              onSwitch={(newLocale) => setLocale(newLocale)}
            />
            <Link
              href="/login"
              className="text-sm font-medium text-chest-500 hover:text-chest-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
            >
              {t('landing.login')}
            </Link>
          </div>
        </div>
      </header>

      {/* ====== Hero Section ====== */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-chest-500/[0.04] dark:bg-chest-400/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          {/* Logo + 品牌名 */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-chest-500 shadow-glow flex items-center justify-center">
              <Logo size={44} variant="light" />
            </div>
          </div>

          {/* 主标题 */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal dark:text-parchment leading-tight tracking-tight mb-5">
            {t('landing.heroTitle')}
          </h1>

          {/* 副标题 */}
          <p className="text-lg md:text-xl text-taupe max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.heroSubtitle')}
          </p>

          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-chest-500 hover:bg-chest-600 text-white rounded-xl font-semibold text-base shadow-elevated hover:shadow-floating transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              {t('landing.ctaStart')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 text-charcoal dark:text-parchment rounded-xl font-semibold text-base hover:bg-white/80 dark:hover:bg-white/10 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              {t('landing.ctaDownload')}
            </Link>
          </div>

          {/* 信任标签 */}
          <div className="flex items-center justify-center gap-6 mt-10 text-xs text-taupe">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-sage" />
              {t('landing.trustFree')}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-sage" />
              {t('landing.trustPlatforms')}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-sage" />
              {t('landing.trustSync')}
            </span>
          </div>
        </div>
      </section>

      {/* ====== Core Features ====== */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal dark:text-parchment mb-3">
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-taupe text-base max-w-xl mx-auto">
            {t('landing.featuresSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              highlights={feature.highlights}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* ====== Multi-Platform Section ====== */}
      <section className="bg-white/30 dark:bg-white/[0.02] border-y border-black/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal dark:text-parchment mb-3">
              {t('landing.platformsTitle')}
            </h2>
            <p className="text-taupe text-base max-w-xl mx-auto">
              {t('landing.platformsSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {platforms.map((platform, index) => (
              <PlatformItem
                key={index}
                icon={platform.icon}
                label={platform.label}
                badge={platform.badge}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA Section ====== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-chest-500/[0.04] dark:bg-chest-400/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal dark:text-parchment mb-4">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-taupe text-base max-w-md mx-auto mb-8">
            {t('landing.ctaSubtitle')}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-10 py-4 bg-chest-500 hover:bg-chest-600 text-white rounded-xl font-semibold text-lg shadow-elevated hover:shadow-floating transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {t('landing.ctaRegister')}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer className="border-t border-black/5 dark:border-white/5 bg-white/30 dark:bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            {/* 品牌信息 */}
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="font-display text-sm font-semibold text-charcoal dark:text-parchment">
                {appName}
              </span>
            </div>

            {/* 链接 */}
            <div className="flex items-center gap-4 text-xs text-taupe">
              <Link href="/privacy" className="hover:text-chest-500 transition-colors">
                {t('common.privacy')}
              </Link>
              <span className="w-1 h-1 rounded-full bg-taupe/40" />
              <Link href="/terms" className="hover:text-chest-500 transition-colors">
                {t('common.terms')}
              </Link>
            </div>

            {/* 版权 */}
            <p className="text-xs text-taupe">
              &copy; 2026 {appName}. {t('landing.allRightsReserved')}
            </p>

            {/* ICP 备案（仅国内版） */}
            <ICPFiling />
          </div>
        </div>
      </footer>
    </div>
  );
}
