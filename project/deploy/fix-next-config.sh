#!/bin/bash
# 修复next.config.js

cd /opt/linkchest/web-app/apps/web

cat > next.config.js << 'NEXTEOF'
/** @type {import('next').NextConfig} */

let withPWA = (config) => config;
try {
  withPWA = (require('@ducanh2912/next-pwa').default || require('@ducanh2912/next-pwa'))({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: true,
    fallbacks: { document: '/', image: '/favicon.svg' },
  });
} catch (e) {
  console.warn('[PWA] Failed to load @ducanh2912/next-pwa, running without PWA:', e.message);
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: '/opt/linkchest/web-app/apps/web'
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    const apiTarget = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
NEXTEOF

echo "next.config.js已更新"
