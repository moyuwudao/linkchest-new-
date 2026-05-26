/**
 * LinkChest Metadata Fetcher - Cloudflare Worker
 * 支持抖音/小红书等反爬平台的元数据抓取
 */

export interface Env {
  METADATA_CACHE?: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    // 检查缓存
    const cacheKey = validatedUrl;
    if (env.METADATA_CACHE) {
      try {
        const cached = await env.METADATA_CACHE.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            headers: { ...corsHeaders, 'X-Cache': 'HIT' },
          });
        }
      } catch {}
    }

    // 检测平台
    const hostname = new URL(validatedUrl).hostname.toLowerCase();
    const isDouyin = hostname.includes('douyin.com');
    const isXiaohongshu = hostname.includes('xiaohongshu.com');

    // 抓取页面
    let html = '';
    try {
      const res = await fetch(validatedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err: any) {
      return new Response(JSON.stringify({ 
        error: 'fetch failed', 
        detail: err.message 
      }), { status: 502, headers: corsHeaders });
    }

    let title = null;
    let coverImage = null;
    let description = null;
    let favicon = null;

    // 检测是否为抖音用户页
    const isDouyinUserPage = isDouyin && /\/user\//.test(validatedUrl);

    // 抖音专用提取（精选页/视频详情）
    if (isDouyin && !html.includes('_$jsvmprt')) {
      const ssrMatch = html.match(/<script>window\._SSR_HYDRATED_DATA=(.+?)<\/script>/)
        || html.match(/window\._SSR_HYDRATED_DATA\s*=\s*(.+?);\s*<\/script>/);
      if (ssrMatch) {
        try {
          const data = JSON.parse(ssrMatch[1]);
          const app = data?.app;
          if (app) {
            const videoId = new URL(validatedUrl).searchParams.get('modal_id');
            const videos = app.videoList || app.itemList || [];
            const video = videos.find((v: any) => v.videoId === videoId || v.awemeId === videoId) || videos[0];
            if (video) {
              title = video.title || video.desc || null;
              coverImage = video.cover?.urlList?.[0]
                || video.originCover?.urlList?.[0]
                || video.dynamicCover?.urlList?.[0]
                || null;
            }

            // 抖音用户页提取用户信息
            if (isDouyinUserPage) {
              const userInfo = app.user?.userInfo || app.author || app.userInfo;
              if (userInfo) {
                title = userInfo.nickname || userInfo.shortId || title;
                coverImage = userInfo.avatar?.urlList?.[0]
                  || userInfo.avatarThumb?.urlList?.[0]
                  || userInfo.avatarUrl
                  || coverImage;
                description = userInfo.signature || userInfo.desc || null;
              }

              // 尝试从用户主页提取封面（用户头像作为封面）
              if (!coverImage) {
                const author = app.author || app.user;
                if (author) {
                  coverImage = author.avatar?.urlList?.[0]
                    || author.avatarThumb?.urlList?.[0]
                    || coverImage;
                  if (!title) {
                    title = author.nickname || author.uniqueId || author.shortId || title;
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    }

    // 小红书专用提取
    if (isXiaohongshu && !html.includes('xhs_sec') && !html.includes('/404/sec_')) {
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

          // 尝试提取笔记详情
          const note = findNote(state);
          if (note) {
            title = note.title || note.displayTitle || null;
            coverImage = note.cover?.url || note.cover?.urlDefault || null;
            if (!coverImage && note.imageList && note.imageList[0]) {
              coverImage = note.imageList[0].url || note.imageList[0].urlDefault || null;
            }
            description = note.desc || null;
          }

          // 尝试提取用户信息（用户主页）
          if (!title) {
            const user = state?.user || state?.userInfo || state?.creator;
            if (user) {
              title = user.nickname || user.displayName || null;
              coverImage = user.avatar || user.avatarUrl || coverImage;
              description = user.desc || user.intro || null;
            }
          }
        } catch (e) {}
      }
    }

    // 通用 OGS 兜底
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
      if (ogTitleMatch) title = ogTitleMatch[1];
    }

    if (!coverImage) {
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
      if (ogImageMatch) coverImage = ogImageMatch[1];
    }

    if (!description) {
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
      if (ogDescMatch) description = ogDescMatch[1];
    }

    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^\u003c]*)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();
    }

    const metadata = {
      title: title ? decodeHTMLEntities(title) : null,
      coverImage: coverImage ? decodeHTMLEntities(coverImage) : null,
      description: description ? decodeHTMLEntities(description) : null,
      favicon,
    };

    const response = JSON.stringify(metadata);

    // 写入缓存
    if (env.METADATA_CACHE && (metadata.title || metadata.coverImage)) {
      try {
        await env.METADATA_CACHE.put(cacheKey, response, { expirationTtl: 300 });
      } catch {}
    }

    return new Response(response, {
      headers: { ...corsHeaders, 'X-Cache': 'MISS' },
    });
  },
};

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
