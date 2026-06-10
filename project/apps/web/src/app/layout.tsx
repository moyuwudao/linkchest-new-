import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import FontLoader from './FontLoader';

export const metadata: Metadata = {
  metadataBase: new URL('https://linkchest.net'),
  title: '链藏 LinkChest - 全网好内容，一键收入链藏',
  description: '跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://linkchest.net',
    siteName: '链藏 LinkChest',
    title: '链藏 LinkChest - 全网好内容，一键收入链藏',
    description: '跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: '链藏 LinkChest',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '链藏 LinkChest - 全网好内容，一键收入链藏',
    description: '跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。',
    images: ['/og-image.svg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '链藏 LinkChest',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <FontLoader />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <PwaInstallBanner />
      {/* impeccable-live-start */}
<script src="http://localhost:8400/live.js"></script>
{/* impeccable-live-end */}
</body>
    </html>
  );
}
