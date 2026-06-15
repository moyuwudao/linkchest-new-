'use client';

import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { isLoggedIn } from '@/lib/auth';
import { getMarketConfig, MarketConfig } from '@/lib/api/market';
import {
  Download,
  Globe,
  ArrowLeft,
  CheckCircle,
  Zap,
  MousePointerClick,
  Keyboard,
  Eye,
  Sparkles,
  Chrome,
  ExternalLink,
  ChevronRight,
  Shield,
  Clock,
  Tag,
  FolderTree,
  Share2,
} from 'lucide-react';
import ICPFiling from '@/components/ICPFiling';

// 语言切换按钮组件
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

export default function ChromeExtensionPage() {
  const { t, locale, setLocale } = useI18n();
  const [isLoggedInState, setIsLoggedInState] = useState(false);
  const [marketConfig, setMarketConfig] = useState<MarketConfig | null>(null);
  const [isChina, setIsChina] = useState(false);
  const [isZh, setIsZh] = useState(false);
  const [appName, setAppName] = useState('LinkChest');

  useEffect(() => {
    setIsLoggedInState(isLoggedIn());

    async function fetchMarketConfig() {
      try {
        const config = await getMarketConfig();
        setMarketConfig(config);
        const isChinaDomain = typeof window !== 'undefined' && window.location.hostname.includes('linkchest.cn');
        const isChinaMarket = config?.market === 'china' || isChinaDomain;
        setIsChina(isChinaMarket);
        setAppName(isChinaMarket ? '链藏' : 'LinkChest');
        
        if (isChinaDomain && locale !== 'zh') {
          setLocale('zh');
          setIsZh(true);
        } else if (!isChinaDomain && locale !== 'en') {
          setLocale('en');
          setIsZh(false);
        } else {
          setIsZh(locale === 'zh');
        }
      } catch {
        // 忽略错误，使用默认英文
      }
    }
    fetchMarketConfig();
  }, []);

  // 当 locale 变化时更新 isZh
  useEffect(() => {
    setIsZh(locale === 'zh');
  }, [locale]);

  // Chrome Web Store 链接（国内/海外）
  const chromeStoreUrl = isChina
    ? 'https://chrome.google.com/webstore/detail/linkchest-collection/abcdefghijklmnopqrstuvwxyz'
    : 'https://chrome.google.com/webstore/detail/linkchest-collection/abcdefghijklmnopqrstuvwxyz';

  // 直接下载链接（COS/TOS 存储桶）— 部署后替换为实际 URL
  const directDownloadUrl = isChina
    ? 'https://linkchest-cos.ap-beijing.myqcloud.com/extensions/linkchest-chrome-extension-v1.1.0.zip'
    : 'https://linkchest-cos.ap-singapore.myqcloud.com/extensions/linkchest-chrome-extension-v1.1.0.zip';

  // 根据当前语言显示内容
  const texts = isZh
    ? {
        title: `${appName} Chrome 插件`,
        subtitle:
          '浏览网页时一键保存到链藏，自动提取标题和封面。支持右键菜单、快捷键、智能识别，让收藏变得前所未有的简单。',
        installBtn: '前往 Chrome 应用商店安装',
        installBtnShort: '立即安装',
        directDownloadBtn: '直接下载安装包',
        directDownloadDesc: '无法访问 Chrome 应用商店？下载后通过开发者模式安装',
        manualInstallTitle: '开发者模式安装指引',
        manualInstallStep1: '下载上方 .zip 安装包并解压到本地文件夹',
        manualInstallStep2: '打开 Chrome 浏览器，地址栏输入 chrome://extensions/ 并回车',
        manualInstallStep3: '打开右上角「开发者模式」开关',
        manualInstallStep4: '点击「加载已解压的扩展程序」按钮',
        manualInstallStep5: '选择刚才解压的文件夹，完成安装',
        manualInstallNote: '安装完成后，建议关闭开发者模式以保持浏览器安全',
        about: '插件介绍',
        about1: `${appName} Chrome 插件让你在浏览网页时，无需离开当前页面即可一键保存内容。支持右键菜单保存、快捷键保存（Ctrl+Shift+S），以及点击扩展图标打开保存面板。`,
        about2: '插件会自动识别网页来源平台（如抖音、小红书、B站、知乎等），智能提取标题、封面图片和作者信息，省去手动填写的麻烦。',
        about3: `保存的内容实时同步到你的 ${appName} 账户，在手机 App、网页端都能随时查看和管理。支持分组标签管理、稍后解析、一键分享等完整功能。`,
        featureTitle: '核心功能',
        feature1: { title: '一键保存', desc: '右键菜单或快捷键 Ctrl+Shift+S，瞬间保存当前页面' },
        feature2: { title: '智能识别', desc: '自动识别平台来源，提取标题、封面和作者信息' },
        feature3: { title: '双模式保存', desc: '静默保存（一键保存）或打开面板（一键新建），随心选择' },
        feature4: { title: '快捷操作', desc: '点击扩展图标打开保存面板，支持分组、标签、备注' },
        feature5: { title: '实时同步', desc: '保存后立即同步到云端，多端实时访问' },
        feature6: { title: '稍后解析', desc: '快速保存后，后台自动补全标题和封面信息' },
        installGuide: '安装方式',
        step1: '点击上方「前往 Chrome 应用商店安装」按钮',
        step2: '在 Chrome 应用商店页面点击「添加至 Chrome」',
        step3: '确认权限请求，完成安装',
        step4: '点击扩展图标或按 Ctrl+Shift+S 开始保存网页',
        shortcutTitle: '快捷键',
        shortcutDesc: 'Ctrl+Shift+S（Mac: Command+Shift+S）— 一键保存当前页面',
        privacyTitle: '隐私说明',
        privacyDesc: '插件仅在用户主动操作时访问当前页面，提取公开可见的标题和封面信息。所有数据通过加密连接传输，不会收集或出售用户数据给第三方。',
        backHome: '返回首页',
        backLogin: '返回登录',
        footer: '© 2026',
        privacy: '隐私政策',
        terms: '服务条款',
        downloadApp: '下载 APP',
        webVersion: '网页版',
        version: '版本 1.1.0',
        free: '免费使用',
        crossPlatform: '多端同步',
      }
    : {
        title: `${appName} Chrome Extension`,
        subtitle:
          'Save any webpage to LinkChest with one click. Auto-extract title and cover. Supports right-click menu, keyboard shortcuts, and smart platform detection.',
        installBtn: 'Install from Chrome Web Store',
        installBtnShort: 'Install Now',
        directDownloadBtn: 'Direct Download',
        directDownloadDesc: 'Cannot access Chrome Web Store? Download and install via developer mode',
        manualInstallTitle: 'Developer Mode Installation Guide',
        manualInstallStep1: 'Download the .zip package above and extract it to a local folder',
        manualInstallStep2: 'Open Chrome browser, type chrome://extensions/ in the address bar and press Enter',
        manualInstallStep3: 'Turn on the "Developer mode" switch in the top right corner',
        manualInstallStep4: 'Click the "Load unpacked" button',
        manualInstallStep5: 'Select the extracted folder to complete installation',
        manualInstallNote: 'After installation, it is recommended to turn off developer mode for browser security',
        about: 'About the Extension',
        about1: `The ${appName} Chrome extension lets you save web content without leaving the current page. Supports right-click menu save, keyboard shortcut save (Ctrl+Shift+S), and clicking the extension icon to open the save panel.`,
        about2: 'The extension automatically detects the source platform (e.g., TikTok, YouTube, Reddit, etc.) and intelligently extracts the title, cover image, and author information.',
        about3: `Saved content syncs in real-time to your ${appName} account, accessible on mobile app and web. Supports group/tag management, parse later, and one-click sharing.`,
        featureTitle: 'Key Features',
        feature1: { title: 'One-Click Save', desc: 'Right-click menu or Ctrl+Shift+S shortcut to instantly save the current page' },
        feature2: { title: 'Smart Detection', desc: 'Auto-detect platform source and extract title, cover, and author info' },
        feature3: { title: 'Dual Save Modes', desc: 'Silent save (one-click) or open panel (one-click new), choose your style' },
        feature4: { title: 'Quick Actions', desc: 'Click extension icon to open save panel with groups, tags, and notes' },
        feature5: { title: 'Real-Time Sync', desc: 'Saved content syncs to cloud immediately, accessible across all devices' },
        feature6: { title: 'Parse Later', desc: 'Save quickly, then let the background fill in title and cover automatically' },
        installGuide: 'Installation',
        step1: 'Click the "Install from Chrome Web Store" button above',
        step2: 'On the Chrome Web Store page, click "Add to Chrome"',
        step3: 'Confirm the permission request to complete installation',
        step4: 'Click the extension icon or press Ctrl+Shift+S to start saving',
        shortcutTitle: 'Keyboard Shortcut',
        shortcutDesc: 'Ctrl+Shift+S (Mac: Command+Shift+S) — Save current page with one keystroke',
        privacyTitle: 'Privacy',
        privacyDesc: 'The extension only accesses the current page when the user actively initiates an action, extracting publicly visible title and cover information. All data is transmitted via encrypted connections. We do not collect or sell user data to third parties.',
        backHome: 'Back to Home',
        backLogin: 'Back to Login',
        footer: '© 2026',
        privacy: 'Privacy Policy',
        terms: 'Terms of Service',
        downloadApp: 'Download App',
        webVersion: 'Web Version',
        version: 'Version 1.1.0',
        free: 'Free to use',
        crossPlatform: 'Cross-device sync',
      };

  const features = [
    { icon: <Zap className="w-6 h-6" />, title: texts.feature1.title, desc: texts.feature1.desc },
    { icon: <Sparkles className="w-6 h-6" />, title: texts.feature2.title, desc: texts.feature2.desc },
    { icon: <MousePointerClick className="w-6 h-6" />, title: texts.feature3.title, desc: texts.feature3.desc },
    { icon: <Eye className="w-6 h-6" />, title: texts.feature4.title, desc: texts.feature4.desc },
    { icon: <Globe className="w-6 h-6" />, title: texts.feature5.title, desc: texts.feature5.desc },
    { icon: <Clock className="w-6 h-6" />, title: texts.feature6.title, desc: texts.feature6.desc },
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
          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale={locale} onSwitch={(newLocale) => setLocale(newLocale)} />
            <Link
              href={isLoggedInState ? '/' : '/login'}
              className="flex items-center gap-1.5 text-sm text-taupe hover:text-chest-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isLoggedInState ? texts.backHome : texts.backLogin}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-glow mb-6">
            <Chrome className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal dark:text-parchment mb-4">
            {texts.title}
          </h1>
          <p className="text-lg text-taupe max-w-2xl mx-auto mb-8">{texts.subtitle}</p>

          {/* Install Buttons */}
          <div className="flex flex-col items-center gap-4">
            <a
              href={chromeStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-chest-500 hover:bg-chest-600 text-white rounded-xl font-semibold text-lg shadow-elevated hover:shadow-floating transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Chrome className="w-6 h-6" />
              {texts.installBtn}
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Direct Download */}
            <div className="flex flex-col items-center gap-2">
              <a
                href={directDownloadUrl}
                download
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-white/5 border border-chest-500/30 hover:border-chest-500/60 text-chest-600 dark:text-chest-400 rounded-lg font-medium text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                {texts.directDownloadBtn}
              </a>
              <p className="text-xs text-taupe">{texts.directDownloadDesc}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-taupe">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-sage" />
                {texts.version}
              </span>
              <span className="w-1 h-1 rounded-full bg-taupe/40" />
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-sage" />
                {texts.free}
              </span>
              <span className="w-1 h-1 rounded-full bg-taupe/40" />
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-sage" />
                {texts.crossPlatform}
              </span>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-card mb-12">
          <h2 className="font-display text-xl font-bold text-charcoal dark:text-parchment mb-4 flex items-center gap-2">
            <Chrome className="w-5 h-5 text-chest-500" />
            {texts.about}
          </h2>
          <div className="space-y-4 text-sm text-charcoal dark:text-parchment/90 leading-relaxed">
            <p>{texts.about1}</p>
            <p>{texts.about2}</p>
            <p>{texts.about3}</p>
          </div>
        </div>

        {/* Core Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {features.map((feature, index) => (
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

        {/* Install Guide */}
        <div className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-card mb-12">
          <h2 className="font-display text-xl font-bold text-charcoal dark:text-parchment mb-6 flex items-center gap-2">
            <Download className="w-5 h-5 text-chest-500" />
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

        {/* Manual Install Guide (Developer Mode) */}
        <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-2xl p-6 md:p-8 shadow-card mb-12">
          <h2 className="font-display text-xl font-bold text-charcoal dark:text-parchment mb-6 flex items-center gap-2">
            <Chrome className="w-5 h-5 text-blue-500" />
            {texts.manualInstallTitle}
          </h2>
          <div className="space-y-4">
            {[
              texts.manualInstallStep1,
              texts.manualInstallStep2,
              texts.manualInstallStep3,
              texts.manualInstallStep4,
              texts.manualInstallStep5,
            ].map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-charcoal dark:text-parchment/90 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              {texts.manualInstallNote}
            </p>
          </div>
        </div>

        {/* Keyboard Shortcut */}
        <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-5 mb-12">
          <h3 className="font-semibold text-charcoal dark:text-parchment mb-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-600" />
            {texts.shortcutTitle}
          </h3>
          <div className="flex items-center gap-3">
            <kbd className="px-3 py-1.5 bg-white dark:bg-chest-800 rounded-lg border border-black/10 dark:border-white/10 text-sm font-mono text-charcoal dark:text-parchment shadow-sm">
              Ctrl
            </kbd>
            <span className="text-taupe">+</span>
            <kbd className="px-3 py-1.5 bg-white dark:bg-chest-800 rounded-lg border border-black/10 dark:border-white/10 text-sm font-mono text-charcoal dark:text-parchment shadow-sm">
              Shift
            </kbd>
            <span className="text-taupe">+</span>
            <kbd className="px-3 py-1.5 bg-white dark:bg-chest-800 rounded-lg border border-black/10 dark:border-white/10 text-sm font-mono text-charcoal dark:text-parchment shadow-sm">
              S
            </kbd>
            <span className="text-sm text-taupe ml-2">— {texts.shortcutDesc}</span>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-card mb-12">
          <h2 className="font-display text-xl font-bold text-charcoal dark:text-parchment mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-chest-500" />
            {texts.privacyTitle}
          </h2>
          <p className="text-sm text-charcoal dark:text-parchment/90 leading-relaxed">{texts.privacyDesc}</p>
        </div>

        {/* Other Download Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <Link
            href="/download"
            className="flex items-center gap-4 p-5 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-chest-500/10 flex items-center justify-center text-chest-500">
              <Download className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-charcoal dark:text-parchment">{texts.downloadApp}</h3>
              <p className="text-sm text-taupe">Android / iOS</p>
            </div>
            <ChevronRight className="w-5 h-5 text-taupe" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-4 p-5 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-chest-500/10 flex items-center justify-center text-chest-500">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-charcoal dark:text-parchment">{texts.webVersion}</h3>
              <p className="text-sm text-taupe">Web App</p>
            </div>
            <ChevronRight className="w-5 h-5 text-taupe" />
          </Link>
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
          <ICPFiling />
        </div>
      </main>
    </div>
  );
}
