'use client';

import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';
import { useI18n } from '@/lib/i18n';
import Link from 'next/link';
import { isLoggedIn } from '@/lib/auth';
import { Download, Smartphone, Shield, Zap, Globe, ArrowLeft, QrCode, CheckCircle, Info } from 'lucide-react';

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

function QRCodeSVG() {
  // 简单的 QR 码占位，实际项目中可以用 qrcode.react 库
  return (
    <div className="w-32 h-32 bg-white p-2 rounded-lg shadow-card">
      <div className="w-full h-full border-2 border-chest-500 rounded flex items-center justify-center">
        <QrCode className="w-16 h-16 text-chest-500" />
      </div>
      <p className="text-[10px] text-center text-taupe mt-1">扫码下载</p>
    </div>
  );
}

export default function DownloadPage() {
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoggedInState, setIsLoggedInState] = useState(false);
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

    // 动态获取版本信息
    fetch('/version.json')
      .then(r => r.ok ? r.json() : null)
      .then((data: VersionInfo | null) => {
        if (data) setVersionInfo(data);
      })
      .catch(() => {});
  }, []);

  const features = [
    { icon: <Zap className="w-5 h-5" />, title: t('download.feature1Title'), desc: t('download.feature1Desc') },
    { icon: <Globe className="w-5 h-5" />, title: t('download.feature2Title'), desc: t('download.feature2Desc') },
    { icon: <Shield className="w-5 h-5" />, title: t('download.feature3Title'), desc: t('download.feature3Desc') },
    { icon: <Smartphone className="w-5 h-5" />, title: t('download.feature4Title'), desc: t('download.feature4Desc') },
  ];

  const installSteps = [
    t('download.step1'),
    t('download.step2'),
    t('download.step3'),
    t('download.step4'),
  ];

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-surface/80 dark:bg-surface-dark/80 border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={32} />
            <span className="font-display text-lg font-semibold text-charcoal dark:text-parchment group-hover:text-chest-500 transition-colors">
              LinkChest
            </span>
          </Link>
          <Link
            href={isLoggedInState ? '/' : '/login'}
            className="flex items-center gap-1.5 text-sm text-taupe hover:text-chest-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {isLoggedInState ? t('download.backToHome') : t('download.backToLogin')}
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
            {t('download.title')}
          </h1>
          <p className="text-lg text-taupe max-w-lg mx-auto mb-8">
            {t('download.subtitle')}
          </p>

          {/* Download Button */}
          <div className="flex flex-col items-center gap-6">
            <a
              href={APK_DOWNLOAD_URL}
              download
              className="inline-flex items-center gap-3 px-8 py-4 bg-chest-500 hover:bg-chest-600 text-white rounded-xl font-semibold text-lg shadow-elevated hover:shadow-floating transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-6 h-6" />
              {t('download.downloadApk')}
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
                <QRCodeSVG />
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-5 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
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
            <Smartphone className="w-5 h-5 text-chest-500" />
            {t('download.installGuide')}
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
            {t('download.systemRequirements')}
          </h3>
          <ul className="space-y-2 text-sm text-taupe">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
              {t('download.req1')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
              {t('download.req2')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
              {t('download.req3')}
            </li>
          </ul>
        </div>

        {/* Warning for iOS users */}
        {isMobile && !/Android/i.test(navigator.userAgent) && (
          <div className="bg-rust/10 border border-rust/20 rounded-xl p-5 mb-12">
            <p className="text-sm text-rust leading-relaxed">
              {t('download.iosWarning')}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 border-t border-black/5 dark:border-white/5">
          <p className="text-sm text-taupe">
            {t('download.copyright')}
          </p>
        </div>
      </main>
    </div>
  );
}
