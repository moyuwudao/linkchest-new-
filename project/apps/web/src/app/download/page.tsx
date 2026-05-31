'use client';

import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { isLoggedIn } from '@/lib/auth';
import { getMarketConfig, MarketConfig } from '@/lib/api/market';
import { Download, Smartphone, Shield, Zap, Globe, ArrowLeft, CheckCircle, Info, Star, Users, Palette, Languages } from 'lucide-react';
import ICPFiling from '@/components/ICPFiling';

const APK_DOWNLOAD_URL = '/LinkChest.apk';
const MIN_ANDROID_VERSION = 'Android 8.0+';

interface VersionInfo {
  version: string;
  buildDate: string;
  downloadUrl: string;
  size?: string;
  minAndroid: string;
  forceUpdate: boolean;
}

// 使用 Google Chart API 生成真实二维码
function QRCodeImage({ url }: { url: string }) {
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(url)}`;
  return (
    <div className="w-32 h-32 bg-white p-2 rounded-lg shadow-card">
      <img 
        src={qrUrl} 
        alt="扫码下载" 
        className="w-full h-full"
        onError={(e) => {
          // 如果 Google API 失败，显示备用二维码
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-xs text-gray-400">扫码下载</div>';
          }
        }}
      />
      <p className="text-[10px] text-center text-taupe mt-1">扫码下载</p>
    </div>
  );
}

export default function DownloadPage() {
  const { t, locale } = useI18n();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoggedInState, setIsLoggedInState] = useState(false);
  const [marketConfig, setMarketConfig] = useState<MarketConfig | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: '1.0.0',
    buildDate: '',
    downloadUrl: APK_DOWNLOAD_URL,
    size: '-',
    minAndroid: MIN_ANDROID_VERSION,
    forceUpdate: false,
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    };
    checkMobile();
    setIsLoggedInState(isLoggedIn());

    // 获取市场配置
    async function fetchMarketConfig() {
      try {
        const config = await getMarketConfig();
        setMarketConfig(config);
      } catch {
        // 忽略错误
      } finally {
        setMarketLoading(false);
      }
    }
    fetchMarketConfig();

    // 动态获取版本信息
    fetch('/version.json')
      .then(r => r.ok ? r.json() : null)
      .then((data: VersionInfo | null) => {
        if (data) setVersionInfo(data);
      })
      .catch(() => {});
  }, []);

  const isChina = marketConfig?.market === 'china';
  const appName = isChina ? '链藏' : 'LinkChest';
  const supportEmail = isChina ? 'support@linkchest.cn' : 'support@linkchest.net';
  const officialUrl = isChina ? 'https://linkchest.cn' : 'https://linkchest.net';
  const currentUrl = typeof window !== 'undefined' ? window.location.href : officialUrl;

  // 根据语言统一显示内容
  const texts = isChina ? {
    title: `${appName} 安卓客户端`,
    subtitle: '你的个人知识库，随时随地收藏和管理网络内容。支持链接、图片、视频一键保存，多端同步，让有价值的内容不再丢失。',
    downloadBtn: '下载安卓客户端',
    about: `关于 ${appName}`,
    about1: `${appName} 是一款专注于内容收藏与管理的效率工具。无论你是浏览网页、阅读文章还是观看视频，只需一键即可将感兴趣的内容保存到个人收藏库中。我们提供智能分类、标签管理、跨平台同步等功能，帮助你构建属于自己的知识体系。`,
    about2: '应用支持多种登录方式，包括邮箱注册、微信登录和 Google 账号登录，满足不同用户的使用习惯。所有数据均采用加密传输和存储，确保你的隐私安全。',
    about3: `目前 ${appName} 提供 Web 网页版、Chrome 浏览器插件、Android 和 iOS 移动应用四种使用方式，数据实时同步，让你在任何设备上都能无缝访问自己的收藏内容。`,
    installGuide: '安装指南',
    systemReq: '系统要求',
    iosNotice: 'iOS 用户说明',
    iosDesc: `${appName} 同时提供 iOS 版本，你可以在 App Store 搜索 "${appName}" 下载安装，或使用 Web 网页版收藏内容。`,
    contact: '联系我们',
    contactDesc: '如果你在使用过程中遇到任何问题，或有功能建议，欢迎通过以下方式联系我们：',
    email: '邮箱',
    website: '官网',
    footer: '© 2026',
    privacy: '隐私政策',
    terms: '服务条款',
    backHome: '返回首页',
    backLogin: '返回登录',
    feature1: { title: '一键收藏', desc: `浏览网页时发现好内容？一键保存到 ${appName}，支持链接、图片、视频等多种格式，让收藏变得简单高效。` },
    feature2: { title: '跨平台同步', desc: '支持 Web 端、Chrome 插件、Android 和 iOS 客户端多端同步，随时随地访问你的收藏库，数据实时同步不丢失。' },
    feature3: { title: '安全私密', desc: '采用行业标准的加密技术保护你的数据，支持私有收藏和公开分享两种模式，你的数据由你掌控。' },
    feature4: { title: '智能分类', desc: '自动识别链接内容并智能分类，支持自定义标签和文件夹管理，让海量收藏井井有条。' },
    highlight1: { title: '智能解析封面', desc: '自动提取网页标题、描述和封面图' },
    highlight2: { title: '社交分享', desc: '一键生成分享链接，好友无需注册即可查看' },
    highlight3: { title: '个性化展示', desc: '自定义收藏展示方式，打造专属风格' },
    highlight4: { title: '深色模式&多语言', desc: '适配系统主题，支持6种语言切换' },
    step1: '点击上方"下载 APK"按钮获取安装包',
    step2: '在文件管理器中找到下载的 APK 文件',
    step3: '点击安装包，允许"安装未知来源应用"权限',
    step4: '完成安装后打开应用，登录账号即可使用',
    req1: 'Android 8.0 或更高版本 / iOS 14.0+',
    req2: '至少 50MB 可用存储空间',
    req3: '需要网络连接以同步数据',
  } : {
    title: `${appName} Android App`,
    subtitle: 'Your personal knowledge base. Save and manage web content anytime, anywhere. Support links, images, and videos with one-click save and cross-platform sync.',
    downloadBtn: 'Download Android App',
    about: `About ${appName}`,
    about1: `${appName} is a productivity tool focused on content collection and management. Whether you're browsing web pages, reading articles, or watching videos, you can save interesting content to your personal library with one click. We offer smart categorization, tag management, and cross-platform sync to help you build your own knowledge system.`,
    about2: 'The app supports multiple login methods including email registration, Google Sign-In, and Apple Sign-In to meet different user preferences. All data is encrypted during transmission and storage to ensure your privacy.',
    about3: `Currently ${appName} offers Web version, Chrome browser extension, Android and iOS mobile apps with real-time data sync, allowing you to seamlessly access your collections on any device.`,
    installGuide: 'Installation Guide',
    systemReq: 'System Requirements',
    iosNotice: 'For iOS Users',
    iosDesc: `${appName} is also available on iOS. You can search for "${appName}" on the App Store or use the Web version to save content.`,
    contact: 'Contact Us',
    contactDesc: 'If you encounter any issues or have feature suggestions, please contact us:',
    email: 'Email',
    website: 'Website',
    footer: '© 2026',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    backHome: 'Back to Home',
    backLogin: 'Back to Login',
    feature1: { title: 'One-Click Save', desc: `Found something interesting while browsing? Save it to ${appName} with one click. Support links, images, videos and more.` },
    feature2: { title: 'Cross-Platform Sync', desc: 'Support Web, Chrome extension, Android and iOS clients. Access your collections anywhere with real-time sync.' },
    feature3: { title: 'Secure & Private', desc: 'Industry-standard encryption protects your data. Support private collections and public sharing.' },
    feature4: { title: 'Smart Categorization', desc: 'Auto-recognize content and smart categorization. Support custom tags and folder management.' },
    highlight1: { title: 'Smart Cover Extract', desc: 'Auto-extract webpage title, description and cover image' },
    highlight2: { title: 'Social Sharing', desc: 'Generate share links with one click, friends can view without registration' },
    highlight3: { title: 'Personalized Display', desc: 'Customize collection display style, create your own look' },
    highlight4: { title: 'Dark Mode & Languages', desc: 'Adapt to system theme, support 6 languages' },
    step1: 'Click the "Download APK" button above',
    step2: 'Find the downloaded APK file in your file manager',
    step3: 'Tap the APK and allow "Install unknown apps" permission',
    step4: 'Open the app after installation and login to use',
    req1: 'Android 8.0+ / iOS 14.0+',
    req2: 'At least 50MB free storage',
    req3: 'Internet connection required for sync',
  };

  const coreFeatures = [
    { icon: <Zap className="w-6 h-6" />, title: texts.feature1.title, desc: texts.feature1.desc },
    { icon: <Globe className="w-6 h-6" />, title: texts.feature2.title, desc: texts.feature2.desc },
    { icon: <Shield className="w-6 h-6" />, title: texts.feature3.title, desc: texts.feature3.desc },
    { icon: <Smartphone className="w-6 h-6" />, title: texts.feature4.title, desc: texts.feature4.desc },
  ];

  const highlights = [
    { icon: <Star className="w-5 h-5" />, title: texts.highlight1.title, desc: texts.highlight1.desc },
    { icon: <Users className="w-5 h-5" />, title: texts.highlight2.title, desc: texts.highlight2.desc },
    { icon: <Palette className="w-5 h-5" />, title: texts.highlight3.title, desc: texts.highlight3.desc },
    { icon: <Languages className="w-5 h-5" />, title: texts.highlight4.title, desc: texts.highlight4.desc },
  ];

  const installSteps = [texts.step1, texts.step2, texts.step3, texts.step4];

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-surface/80 dark:bg-surface-dark/80 border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={32} />
            <span className="font-display text-lg font-semibold text-charcoal dark:text-parchment group-hover:text-chest-500 transition-colors">
              {appName}
            </span>
          </Link>
          <Link
            href={isLoggedInState ? '/' : '/login'}
            className="flex items-center gap-1.5 text-sm text-taupe hover:text-chest-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isLoggedInState ? texts.backHome : texts.backLogin}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-chest-500 shadow-glow mb-6">
            <Logo size={56} variant="light" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal dark:text-parchment mb-4">
            {texts.title}
          </h1>
          <p className="text-lg text-taupe max-w-2xl mx-auto mb-8">
            {texts.subtitle}
          </p>

          {/* Download Button */}
          <div className="flex flex-col items-center gap-6">
            <a
              href={APK_DOWNLOAD_URL}
              download
              className="inline-flex items-center gap-3 px-8 py-4 bg-chest-500 hover:bg-chest-600 text-white rounded-xl font-semibold text-lg shadow-elevated hover:shadow-floating transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-6 h-6" />
              {texts.downloadBtn}
            </a>

            <div className="flex items-center gap-4 text-sm text-taupe">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                v{versionInfo.version}
              </span>
              <span className="w-1 h-1 rounded-full bg-taupe/40" />
              <span>{versionInfo.size || '-'}</span>
              <span className="w-1 h-1 rounded-full bg-taupe/40" />
              <span>{versionInfo.minAndroid || MIN_ANDROID_VERSION}</span>
            </div>

            {/* QR Code - only show on desktop */}
            {!isMobile && (
              <div className="mt-4">
                <QRCodeImage url={currentUrl} />
              </div>
            )}
          </div>
        </div>

        {/* App Introduction */}
        <div className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-card mb-12">
          <h2 className="font-display text-xl font-bold text-charcoal dark:text-parchment mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-chest-500" />
            {texts.about}
          </h2>
          <div className="space-y-4 text-sm text-charcoal dark:text-parchment/90 leading-relaxed">
            <p>{texts.about1}</p>
            <p>{texts.about2}</p>
            <p>{texts.about3}</p>
          </div>
        </div>

        {/* Core Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {coreFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-5 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="shrink-0 w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold text-charcoal dark:text-parchment mb-1">{feature.title}</h3>
                <p className="text-sm text-taupe leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {highlights.map((item, index) => (
            <div
              key={index}
              className="text-center p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/5"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-chest-500/10 text-chest-500 mb-2">
                {item.icon}
              </div>
              <h4 className="font-medium text-charcoal dark:text-parchment text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-taupe">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Install Guide */}
        <div className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-card mb-12">
          <h2 className="font-display text-xl font-bold text-charcoal dark:text-parchment mb-6 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-chest-500" />
            {texts.installGuide}
          </h2>
          <div className="space-y-4">
            {installSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-chest-500/10 text-chest-500 flex items-center justify-center text-xs font-bold mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-charcoal dark:text-parchment/90 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* System Requirements */}
        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-5 mb-12">
          <h3 className="font-semibold text-charcoal dark:text-parchment mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-sage" />
            {texts.systemReq}
          </h3>
          <ul className="space-y-2 text-sm text-taupe">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
              {texts.req1}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
              {texts.req2}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
              {texts.req3}
            </li>
          </ul>
        </div>

        {/* iOS Notice */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-xl p-5 mb-12">
          <h3 className="font-semibold text-charcoal dark:text-parchment mb-2 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-500" />
            {texts.iosNotice}
          </h3>
          <p className="text-sm text-taupe leading-relaxed">
            {texts.iosDesc}
          </p>
        </div>

        {/* Contact / Support */}
        <div className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-card mb-12">
          <h2 className="font-display text-xl font-bold text-charcoal dark:text-parchment mb-4">
            {texts.contact}
          </h2>
          <p className="text-sm text-taupe leading-relaxed mb-4">
            {texts.contactDesc}
          </p>
          <div className="space-y-2 text-sm text-charcoal dark:text-parchment/90">
            <p>{texts.email}：{supportEmail}</p>
            <p>{texts.website}：{officialUrl}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-black/5 dark:border-white/5">
          <p className="text-sm text-taupe">
            {texts.footer} {appName}. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-taupe">
            <Link href="/privacy" className="hover:text-chest-500 transition-colors">
              {texts.privacy}
            </Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-chest-500 transition-colors">
              {texts.terms}
            </Link>
          </div>
          {/* 备案号 - 仅国内版显示 */}
          <ICPFiling />
        </div>
      </main>
    </div>
  );
}
