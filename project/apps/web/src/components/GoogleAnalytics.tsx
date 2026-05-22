'use client';

import Script from 'next/script';

/**
 * Google Analytics 4 加载组件
 * 仅在设置了 NEXT_PUBLIC_GA_ID 环境变量时加载
 * 使用方式: 在 .env 中添加 NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
 */
export function GoogleAnalytics({ gaId }: { gaId?: string }) {
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_title: document.title,
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}

/**
 * 上报 GA4 自定义事件
 * 仅在 gtag 可用时执行
 */
export function gtagEvent(
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined') return;
  const gtag = (window as any).gtag;
  if (!gtag) return;
  try {
    gtag('event', eventName, eventParams || {});
  } catch {
    // silently ignore
  }
}
