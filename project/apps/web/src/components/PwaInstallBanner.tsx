'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getMarketConfig } from '@/lib/api/market';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA 文本配置
const PWA_TEXTS = {
  china: {
    installTitle: '安装链藏到桌面',
    installDesc: '像 App 一样快速访问，支持离线浏览',
    installNow: '立即安装',
    later: '稍后再说',
    close: '关闭',
  },
  global: {
    installTitle: 'Install LinkChest to Desktop',
    installDesc: 'Quick access like an app, supports offline browsing',
    installNow: 'Install Now',
    later: 'Later',
    close: 'Close',
  },
};

export default function PwaInstallBanner() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [market, setMarket] = useState<'china' | 'global'>('global');

  useEffect(() => {
    const config = getMarketConfig();
    setMarket(config.market as 'china' | 'global');
  }, []);

  useEffect(() => {
    // 检查是否已安装（standalone 模式）
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // 检查用户是否之前关闭过提示
    const closed = localStorage.getItem('pwa-install-dismissed');
    if (closed) {
      const closedTime = parseInt(closed, 10);
      // 7 天内不再提示
      if (Date.now() - closedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  const texts = PWA_TEXTS[market];

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[90] bg-white dark:bg-chest-800 rounded-2xl shadow-modal border border-chest-500/[0.08] dark:border-parchment/10 p-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-chest-500/10 dark:bg-amber-400/10 flex items-center justify-center flex-shrink-0">
          <Download size={20} className="text-chest-500 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-charcoal dark:text-parchment">
            {texts.installTitle}
          </h3>
          <p className="text-xs text-taupe dark:text-parchment/60 mt-0.5">
            {texts.installDesc}
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-chest-500 dark:bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-chest-600 dark:hover:bg-amber-600 transition-colors cursor-pointer"
            >
              {texts.installNow}
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-taupe dark:text-parchment/60 hover:bg-parchment/20 dark:hover:bg-charcoal/30 rounded-lg transition-colors cursor-pointer"
            >
              {texts.later}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-parchment/20 dark:hover:bg-charcoal/30 rounded-lg transition-colors flex-shrink-0"
          aria-label={texts.close}>
          <X size={14} className="text-taupe" />
        </button>
      </div>
    </div>
  );
}
