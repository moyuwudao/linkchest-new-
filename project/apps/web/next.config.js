/** @type {import('next').NextConfig} */

let withPWA = (config) => config;
try {
  withPWA = (require('@ducanh2912/next-pwa').default || require('@ducanh2912/next-pwa'))({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    fallbacks: { document: '/', image: '/favicon.svg' },
    workboxOptions: {
      runtimeCaching: [
        // HTML 页面：NetworkFirst，离线时从缓存读取，大幅加速重新打开
        {
          urlPattern: /\/($|\?|#)/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'linkchest-pages',
            expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
            networkTimeoutSeconds: 3,
          },
        },
        { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } } },
        { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-stylesheets', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
        { urlPattern: /\/_next\/static\/.*/i, handler: 'CacheFirst', options: { cacheName: 'next-static-assets', expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
        { urlPattern: /\/_next\/image\?url=.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'next-image-cache', expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 7 } } },
        // COS 封面图片缓存：CacheFirst 优先读本地，未命中再请求，大幅降低 COS 出流量
        {
          urlPattern: /^https:\/\/.*(?:myqcloud\.com|cos\.).*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'linkchest-cos-image-cache',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // 外部封面图片缓存（YouTube/B站等）
        {
          urlPattern: /\.(jpg|jpeg|png|webp|gif|svg|ico|avif)(\?.*)?$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'linkchest-external-image-cache',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // API 响应缓存（GET 请求），配合 React Query 持久化实现离线可用
        {
          urlPattern: /\/api\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'linkchest-api-cache',
            expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 6 },
            networkTimeoutSeconds: 5,
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
  });
} catch (e) {
  console.warn('[PWA] Failed to load @ducanh2912/next-pwa, running without PWA:', e.message);
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/login',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
        ],
      },
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/tags',
        headers: [
          { key: 'Cache-Control', value: 'no-store, private, must-revalidate' },
        ],
      },
      {
        source: '/lists',
        headers: [
          { key: 'Cache-Control', value: 'no-store, private, must-revalidate' },
        ],
      },
      {
        source: '/shares',
        headers: [
          { key: 'Cache-Control', value: 'no-store, private, must-revalidate' },
        ],
      },
      {
        source: '/settings',
        headers: [
          { key: 'Cache-Control', value: 'no-store, private, must-revalidate' },
        ],
      },
      {
        source: '/account',
        headers: [
          { key: 'Cache-Control', value: 'no-store, private, must-revalidate' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    // 如果已经是绝对路径（含http），提取基础URL；如果是相对路径则跳过rewrites（使用Nginx代理）
    const apiTarget = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : null;
    if (!apiTarget) {
      // 相对路径，不配置rewrites，由Nginx处理代理
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
