/**
 * LinkChest Metadata Fetcher - Cloudflare Worker
 * 
 * 用于抓取被反爬平台（抖音/小红书等）的元数据
 * 运行在 Cloudflare 边缘网络，使用移动端 UA 绕过反爬
 */

export interface Env {
  METADATA_CACHE?: KVNamespace;
}

interface UrlMetadata {
  title: string | null;
  coverImage: string | null;
  favicon: string | null;
  description: string | null;
}

// 平台检测
function detectPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('douyin.com')) return 'douyin';
    if (hostname.includes('xiaohongshu.com')) return 'xiaohongshu';
    if (hostname.includes('kuaishou.com')) return 'kuaishou';
    if (hostname.includes('bilibili.com')) return 'bilibili';
    if (hostname.includes('zhihu.com')) return 'zhihu';
    if (hostname.includes('weibo.com')) return 'weibo';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    return 'other';
  } catch {
    return 'other';
  }
}

// 移动端 UA（关键：很多平台对移动端更友好）
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

// 抖音元数据提取
async function fetchDouyinMetadata(url: string): Promise<UrlMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return { title: null, coverImage: null, favicon: null, description: null };
    }

    const html = await response.text();

    // 检查是否被反爬
    if (html.includes('_$jsvmprt')) {
      return { title: null, coverImage: null, favicon: null, description: null };
    }

    let title: string | null = null;
    let coverImage: string | null = null;
    let description: string | null = null;

    // 尝试从 SSR_HYDRATED_DATA 提取
    const ssrMatch = html.match(/<script>window\._SSR_HYDRATED_DATA=(.+?)<\/script>/)
      || html.match(/window\._SSR_HYDRATED_DATA\s*=\s*(.+?);\s*<\/script>/);

    if (ssrMatch) {
      try {
        const data = JSON.parse(ssrMatch[1]);
        const app = data?.app;
        if (app) {
          // 用户页
          if (app.user || app.userInfo) {
            const user = app.user || app.userInfo;
            title = user.nickname || user.uniqueId || null;
            coverImage = user.avatar?.urlList?.[0] || user.avatarUrl || null;
          }
          // 视频列表页
          else {
            const videoId = new URL(url).searchParams.get('modal_id');
            const videos = app.videoList || app.itemList || [];
            const video = videos.find((v: any) => v.videoId === videoId || v.awemeId === videoId) || videos[0];
            if (video) {
              title = video.title || video.desc || null;
              coverImage = video.cover?.urlList?.[0] || video.originCover?.urlList?.[0] || null;
            }
          }
        }
      } catch {}
    }

    // OG 标签兜底
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
      if (ogTitleMatch) title = ogTitleMatch[1];
    }
    if (!coverImage) {
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
      if (ogImageMatch) coverImage = ogImageMatch[1];
    }
    if (!description) {
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
      if (ogDescMatch) description = ogDescMatch[1];
    }

    return { title, coverImage, favicon: 'https://www.douyin.com/favicon.ico', description };
  } catch {
    return { title: null, coverImage: null, favicon: null, description: null };
  }
}

// 小红书元数据提取
async function fetchXiaohongshuMetadata(url: string): Promise<UrlMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return { title: null, coverImage: null, favicon: null, description: null };
    }

    const html = await response.text();

    // 检查是否被反爬
    if (html.includes('xhs_sec') || response.url.includes('/404/sec_')) {
      return { title: null, coverImage: null, favicon: null, description: null };
    }

    let title: string | null = null;
    let coverImage: string | null = null;
    let description: string | null = null;

    // 从 __INITIAL_STATE__ 提取
    const initMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)(?:;\s*<\/script>|<\/script>)/);
    if (initMatch) {
      try {
        let jsonStr = initMatch[1].trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
        const state = JSON.parse(jsonStr.replace(/undefined/g, 'null'));

        const findNote = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.noteId || (obj.note && obj.note.noteId)) return obj.note || obj;
          if (obj.noteDetailMap) {
            for (const key of Object.keys(obj.noteDetailMap)) {
              if (obj.noteDetailMap[key]?.note) return obj.noteDetailMap[key].note;
            }
          }
          if (obj.noteData?.data) return obj.noteData.data;
          for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              const found = findNote(val);
              if (found) return found;
            }
          }
          return null;
        };

        const note = findNote(state);
        if (note) {
          title = note.title || note.displayTitle || null;
          coverImage = note.cover?.url || note.cover?.urlDefault || null;
          if (!coverImage && note.imageList && note.imageList[0]) {
            coverImage = note.imageList[0].url || note.imageList[0].urlDefault || null;
          }
          description = note.desc || null;
        }
      } catch {}
    }

    // OG 标签兜底
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
      if (ogTitleMatch) title = ogTitleMatch[1];
    }
    if (!coverImage) {
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
      if (ogImageMatch) coverImage = ogImageMatch[1];
    }

    return { title, coverImage, favicon: 'https://www.xiaohongshu.com/favicon.ico', description };
  } catch {
    return { title: null, coverImage: null, favicon: null, description: null };
  }
}

// Twitter/X 使用官方 oEmbed
async function fetchTwitterMetadata(url: string): Promise<UrlMetadata> {
  try {
    const oembedUrl = url.replace(/\/\/x\.com\//, '//twitter.com/');
    const response = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(oembedUrl)}`);
    if (!response.ok) return { title: null, coverImage: null, favicon: null, description: null };
    
    const data: any = await response.json();
    let coverImage: string | null = null;
    
    // 从 HTML 中提取图片
    const imgMatch = data.html?.match(/https:\/\/pbs\.twimg\.com\/[^\s"<>]+/);
    if (imgMatch) coverImage = imgMatch[0].replace(/&amp;/g, '&');
    
    // 提取文本内容
    let title = data.author_name || null;
    const textMatch = data.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (textMatch) {
      title = textMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 100);
    }

    return { title, coverImage, favicon: 'https://abs.twimg.com/favicons/twitter.ico', description: title };
  } catch {
    return { title: null, coverImage: null, favicon: null, description: null };
  }
}

// 微博用户页提取
async function fetchWeiboMetadata(url: string): Promise<UrlMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return { title: null, coverImage: null, favicon: null, description: null };
    }

    const html = await response.text();
    let title: string | null = null;
    let coverImage: string | null = null;

    // 从 title 提取用户名
    const titleMatch = html.match(/<title[^>]*>([^<]+?)的微博/i);
    if (titleMatch) title = titleMatch[1].trim() + '的微博';

    // 构造头像 URL（从 URL 提取 uid）
    const uidMatch = url.match(/\/u\/(\d+)/);
    if (uidMatch) {
      coverImage = `https://tvax3.sinaimg.cn/crop.0.0.180.180.180/${uidMatch[1]}/none.jpg`;
    }

    // OG 标签兜底
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
      if (ogTitleMatch) title = ogTitleMatch[1];
    }
    if (!coverImage) {
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
      if (ogImageMatch) coverImage = ogImageMatch[1];
    }

    return { title, coverImage, favicon: 'https://weibo.com/favicon.ico', description: null };
  } catch {
    return { title: null, coverImage: null, favicon: null, description: null };
  }
}

// 知乎文章提取
async function fetchZhihuMetadata(url: string): Promise<UrlMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.zhihu.com/',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return { title: null, coverImage: null, favicon: null, description: null };
    }

    const html = await response.text();
    let title: string | null = null;
    let coverImage: string | null = null;
    let description: string | null = null;

    // 从 initialData 提取
    const initMatch = html.match(/<script\s+id=["']js-initialData["'][^>]*>([\s\S]*?)<\/script>/);
    if (initMatch) {
      try {
        const data = JSON.parse(initMatch[1]);
        const article = data?.initialState?.entities?.articles;
        if (article) {
          const articleId = Object.keys(article)[0];
          const a = article[articleId];
          if (a) {
            title = a.title || null;
            coverImage = a.titleImage || a.imageUrl || null;
            description = a.excerpt || null;
          }
        }
      } catch {}
    }

    // 从 HTML 中提取 zhimg 图片
    if (!coverImage) {
      const zhimgMatch = html.match(/https?:\/\/pic[0-9]*\.zhimg\.com\/v2-[^"'\s]+_[rl]\.jpg/i);
      if (zhimgMatch) coverImage = zhimgMatch[0];
    }

    // OG 标签兜底
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
      if (ogTitleMatch) title = ogTitleMatch[1];
    }
    if (!coverImage) {
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
      if (ogImageMatch) coverImage = ogImageMatch[1];
    }

    return { title, coverImage, favicon: 'https://static.zhihu.com/heifetz/favicon.ico', description };
  } catch {
    return { title: null, coverImage: null, favicon: null, description: null };
  }
}

// 通用 OGS 提取
async function fetchOgsMetadata(url: string): Promise<UrlMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return { title: null, coverImage: null, favicon: null, description: null };
    }

    const html = await response.text();

    let title: string | null = null;
    let coverImage: string | null = null;
    let favicon: string | null = null;
    let description: string | null = null;

    // og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) title = ogTitleMatch[1];

    // og:image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) coverImage = ogImageMatch[1];

    // og:description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) description = ogDescMatch[1];

    // title tag
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();
    }

    // favicon
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']*)["']/i);
    if (faviconMatch) {
      favicon = faviconMatch[1];
      if (favicon && !favicon.startsWith('http')) {
        const baseUrl = new URL(url);
        favicon = favicon.startsWith('/')
          ? `${baseUrl.protocol}//${baseUrl.host}${favicon}`
          : `${baseUrl.protocol}//${baseUrl.host}/${favicon}`;
      }
    }

    return { title, coverImage, favicon, description };
  } catch {
    return { title: null, coverImage: null, favicon: null, description: null };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400, headers: corsHeaders,
      });
    }

    let validatedUrl: string;
    try {
      validatedUrl = new URL(targetUrl).toString();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // 缓存检查
    const cacheKey = validatedUrl;
    if (env.METADATA_CACHE) {
      try {
        const cached = await env.METADATA_CACHE.get(cacheKey);
        if (cached) {
          return new Response(cached, { headers: { ...corsHeaders, 'X-Cache': 'HIT' } });
        }
      } catch {}
    }

    // 根据平台选择提取策略
    const platform = detectPlatform(validatedUrl);
    let metadata: UrlMetadata;

    switch (platform) {
      case 'douyin':
        metadata = await fetchDouyinMetadata(validatedUrl);
        break;
      case 'xiaohongshu':
        metadata = await fetchXiaohongshuMetadata(validatedUrl);
        break;
      case 'twitter':
        metadata = await fetchTwitterMetadata(validatedUrl);
        break;
      case 'weibo':
        metadata = await fetchWeiboMetadata(validatedUrl);
        break;
      case 'zhihu':
        metadata = await fetchZhihuMetadata(validatedUrl);
        break;
      default:
        metadata = await fetchOgsMetadata(validatedUrl);
        break;
    }

    const response = JSON.stringify(metadata);

    // 写入缓存（5分钟）
    if (env.METADATA_CACHE && (metadata.title || metadata.coverImage)) {
      await env.METADATA_CACHE.put(cacheKey, response, { expirationTtl: 300 }).catch(() => {});
    }

    return new Response(response, { headers: { ...corsHeaders, 'X-Cache': 'MISS' } });
  },
};
