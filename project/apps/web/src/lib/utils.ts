import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 检查字符串是否为有效URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 解析分享文本，提取其中的URL
 */
export function parseShareText(text: string): { isShareText: boolean; url?: string } {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  if (matches && matches.length > 0) {
    return { isShareText: true, url: matches[0] };
  }
  return { isShareText: false };
}

/**
 * 从URL解析平台标识
 */
export function parseUrlPlatform(url: string): string {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();

    const platformMap: Record<string, string> = {
      'douyin.com': 'douyin',
      'iesdouyin.com': 'douyin',
      'xiaohongshu.com': 'xiaohongshu',
      'xhslink.com': 'xiaohongshu',
      'bilibili.com': 'bilibili',
      'b23.tv': 'bilibili',
      'weibo.com': 'weibo',
      'weibo.cn': 'weibo',
      'zhihu.com': 'zhihu',
      'taobao.com': 'taobao',
      'tmall.com': 'taobao',
      'jd.com': 'jd',
      'youtube.com': 'youtube',
      'youtu.be': 'youtube',
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'instagram.com': 'instagram',
      'tiktok.com': 'tiktok',
      'amazon.com': 'amazon',
      'github.com': 'github',
    };

    for (const [domain, platform] of Object.entries(platformMap)) {
      if (host.includes(domain)) {
        return platform;
      }
    }

    return 'other';
  } catch {
    return 'other';
  }
}
