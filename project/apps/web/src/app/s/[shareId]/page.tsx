import type { Metadata } from 'next';
import { cache } from 'react';
import SharePageClient from './SharePageClient';

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
  url?: string;
}

interface ShareData {
  id: string;
  title: string;
  description?: string;
  hasPassword?: boolean;
  needsPassword?: boolean;
  isOwner?: boolean;
  expiresAt?: string;
  viewCount?: number;
  collections?: Collection[];
}

const getShareData = cache(async (shareId: string): Promise<ShareData | null> => {
  try {
    // SSR 阶段直接请求本地 API (127.0.0.1:3001)，避免公网往返和 Nginx 代理问题
    // 生产环境 API 与 Web 同机部署，不走 NEXT_PUBLIC_API_URL（那是给浏览器用的）
    const baseUrl = 'http://127.0.0.1:3001';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${baseUrl}/s/${shareId}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    // 防御性校验：确保返回的是分享对象而非 HTML/错误页
    if (!data || typeof data !== 'object' || !data.id || !Array.isArray(data.collections)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: { params: { shareId: string } }): Promise<Metadata> {
  const data = await getShareData(params.shareId);

  const title = data?.title || '链藏 LinkChest 分享';
  const description = data?.description || '查看 LinkChest 分享的内容收藏';
  const firstCover = data?.collections?.[0]?.coverImage;

  return {
    title: `${title} - 链藏 LinkChest`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://linkchest.net/s/${params.shareId}`,
      images: firstCover
        ? [{ url: firstCover, width: 800, height: 450, alt: title }]
        : [{ url: 'https://linkchest.net/og-image.svg', width: 1200, height: 630, alt: '链藏 LinkChest' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: firstCover ? [firstCover] : ['https://linkchest.net/og-image.svg'],
    },
  };
}

// ISR: 分享页静态化，1 小时重新验证（分享数据创建后基本不变）
// 配合 Redis 7 天缓存 + 主动失效，公开分享页面几乎完全走缓存
export const revalidate = 3600;
export const dynamicParams = true;

export default async function SharePage({ params }: { params: { shareId: string } }) {
  const initialData = await getShareData(params.shareId);
  return <SharePageClient initialData={initialData || undefined} />;
}
