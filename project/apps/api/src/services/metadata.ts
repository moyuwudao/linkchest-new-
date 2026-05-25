import fetch from 'node-fetch'
import https from 'https'
import ogs from 'open-graph-scraper'
import { LRUCache } from 'lru-cache'
import { getRedisClient } from '../lib/redis'
import { METADATA_CONFIG } from '../lib/config'
import logger from '../lib/logger'

// ===== 监控统计 =====
const metadataStats = {
  total: 0,        // 总调用次数
  lruHit: 0,       // LRU 缓存命中
  redisHit: 0,     // Redis 缓存命中
  success: 0,      // 成功抓取（有 title 或 coverImage）
  failed: 0,       // 完全失败（无 title 且无 coverImage）
}

export function getMetadataStats() {
  const { total, lruHit, redisHit, success, failed } = metadataStats
  const cacheHits = lruHit + redisHit
  const cacheHitRate = total > 0 ? ((cacheHits / total) * 100).toFixed(1) : '0.0'
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0'
  return {
    total,
    lruHit,
    redisHit,
    cacheHitRate,
    cacheHits,
    success,
    failed,
    successRate,
  }
}

export interface UrlMetadata {
  title: string | null
  coverImage: string | null
  favicon: string | null
  description: string | null
}

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || ''
const WORKER_FALLBACK_PLATFORMS = [
  'youtube','bilibili','douyin','xiaohongshu','zhihu','weibo','wechat',
  'twitter','tiktok','instagram','facebook','twitch','kuaishou',
  'tencent-video','iqiyi','youku','mgtv','dianping','xueqiu','36kr',
  'toutiao','huxiu','thepaper','netease-news',
]

function extractBV(url: string): string | null {
  try { const m = new URL(url).pathname.match(/\/video\/(BV[a-zA-Z0-9]{10})/); return m ? m[1] : null } catch { return null }
}
function normalizeYoutubeUrl(url: string): string {
  const m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : url
}

function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
const DESKTOP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const FETCH_TIMEOUT_MS = METADATA_CONFIG.fetchTimeoutMs
const TOTAL_TIMEOUT_MS = METADATA_CONFIG.totalTimeoutMs
const CACHE_TTL_SECONDS = METADATA_CONFIG.cacheTtlSeconds

const httpsAgent = new https.Agent({
  rejectUnauthorized: !(process.env.METADATA_ALLOW_INSECURE === 'true'),
})

const lruCache = new LRUCache<string, UrlMetadata>({
  max: METADATA_CONFIG.lruCacheMaxSize,
  ttl: 1000 * 60 * 5,
})

function isAntiBotPage(html: string): boolean {
  if (html.includes('_$jsvmprt')) return true
  if (html.includes('<body></body>') && html.length < 80000) return true
  if (!html.includes('<meta property="og:') && !html.includes('<h1') && html.length < 50000) return true
  return false
}

interface OEmbedConfig { endpoint: (url: string) => string }

const OEMBED_PROVIDERS: Record<string, OEmbedConfig> = {
  youtube:    { endpoint: (url) => `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json` },
  spotify:    { endpoint: (url) => `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}` },
  tiktok:     { endpoint: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}` },
  twitch:     { endpoint: (url) => `https://api.twitch.tv/v4/oembed?url=${encodeURIComponent(url)}` },
  twitter:    { endpoint: (url) => `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}` },
  vimeo:      { endpoint: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}` },
  soundcloud: { endpoint: (url) => `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json` },
  flickr:     { endpoint: (url) => `https://www.flickr.com/services/oembed/?url=${encodeURIComponent(url)}&format=json` },
  instagram:  { endpoint: (url) => `https://graph.facebook.com/v12.0/instagram_oembed?url=${encodeURIComponent(url)}` },
  bilibili:   { endpoint: (url) => { const bv = extractBV(url); return bv ? `https://api.bilibili.com/x/web-interface/view?bvid=${bv}&jsonp=jsonp` : `https://www.bilibili.com/oembed?url=${encodeURIComponent(url)}` } },
  reddit:     { endpoint: (url) => `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}` },
  pinterest:  { endpoint: (url) => `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}` },
}

const PLATFORM_UA_MAP: Record<string, string> = {
  xiaohongshu: DESKTOP_USER_AGENT, douyin: DEFAULT_USER_AGENT,
  bilibili: DESKTOP_USER_AGENT, zhihu: DESKTOP_USER_AGENT,
  weibo: DESKTOP_USER_AGENT, 'tencent-video': DESKTOP_USER_AGENT,
  iqiyi: DESKTOP_USER_AGENT, youku: DESKTOP_USER_AGENT,
  mgtv: DESKTOP_USER_AGENT, kuaishou: DESKTOP_USER_AGENT,
  dianping: DESKTOP_USER_AGENT,
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS)
  try {
    return await fetchUrlMetadataCore(url, controller.signal)
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || err.message === 'TOTAL_TIMEOUT')) {
      console.log(`[fetchUrlMetadata] TOTAL_TIMEOUT fallback for ${url}`)
      try { const { detectPlatform } = await import('./platforms'); const pk = detectPlatform(url); if (pk !== 'other') return getPlatformFallbackMetadata(pk, url) } catch {}
    }
    return { title: null, coverImage: null, favicon: null, description: null }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchUrlMetadataCore(url: string, signal?: AbortSignal): Promise<UrlMetadata> {
  console.log(`[fetchUrlMetadata] START url=${url}`)
  const lruHit = lruCache.get(url)
  if (lruHit && (lruHit.title || lruHit.coverImage)) {
    console.log(`[fetchUrlMetadata] LRU hit ${url}`)
    metadataStats.total++
    metadataStats.lruHit++
    metadataStats.success++
    return lruHit
  }

  const cached = await getCachedMetadata(url)
  const cachedHasData = cached && (cached.title || cached.coverImage || cached.description)
  const cachedHasCover = cached && !!cached.coverImage
  console.log(`[fetchUrlMetadata] cache hit=${!!cached} hasData=${cachedHasData} hasCover=${cachedHasCover}`)

  const SPECIAL_COVER_PLATFORMS = ['douyin', 'xiaohongshu']
  let cachedPlatform = 'other'
  try {
    const { detectPlatform } = await import('./platforms')
    cachedPlatform = detectPlatform(url)
  } catch {}

  if (cachedHasData && (cachedHasCover || !SPECIAL_COVER_PLATFORMS.includes(cachedPlatform))) {
    metadataStats.total++
    metadataStats.redisHit++
    metadataStats.success++
    lruCache.set(url, cached); return cached
  }

  metadataStats.total++ // 计入总调用

  let metadata: UrlMetadata | null = null
  let platformKey = 'other'
  try {
    const { detectPlatform } = await import('./platforms')
    platformKey = detectPlatform(url)
    console.log(`[fetchUrlMetadata] platform=${platformKey}`)
    const normalizedUrl = platformKey === 'youtube' ? normalizeYoutubeUrl(url) : url

    if (platformKey === 'douyin') {
      metadata = await fetchDouyinMetadata(normalizedUrl, signal)
    } else if (platformKey === 'xiaohongshu') {
      metadata = await fetchXiaohongshuMetadata(normalizedUrl, signal)
    } else if (OEMBED_PROVIDERS[platformKey]) {
      metadata = await fetchOEmbedMetadata(normalizedUrl, OEMBED_PROVIDERS[platformKey], signal, platformKey)
      if (platformKey === 'youtube' && metadata && !metadata.title && CLOUDFLARE_WORKER_URL) {
        const wr = await fetchCloudflareWorkerFallback(url, signal)
        if (wr.title || wr.coverImage) metadata = wr
      }
    }

    if (!metadata || (!metadata.title && !metadata.coverImage)) {
      if (platformKey === 'bilibili') metadata = await fetchBilibiliMetadata(normalizedUrl, signal)
      else if (platformKey !== 'douyin' && platformKey !== 'xiaohongshu') metadata = await fetchOgsMetadata(normalizedUrl, platformKey, signal)
    }
  } catch { metadata = await fetchOgsMetadata(url, undefined, signal) }

  const hasAllFieldsEmpty = !metadata || (!metadata.title && !metadata.coverImage && !metadata.description)
  if (hasAllFieldsEmpty && CLOUDFLARE_WORKER_URL) {
    const { detectPlatform } = await import('./platforms')
    const ef = platformKey !== 'other' ? platformKey : detectPlatform(url)
    if (WORKER_FALLBACK_PLATFORMS.includes(ef)) metadata = await fetchCloudflareWorkerFallback(url, signal)
  }

  if (platformKey !== 'other' && metadata) {
    const fallback = await getPlatformFallbackMetadata(platformKey, url)
    const effectiveTitle = metadata.title && !isLowQualityTitle(metadata.title) ? metadata.title : fallback.title
    if (!metadata.coverImage) {
      metadata = { ...metadata, title: effectiveTitle, favicon: metadata.favicon || fallback.favicon, description: metadata.description || fallback.description }
    } else {
      metadata = { title: effectiveTitle, coverImage: metadata.coverImage, favicon: metadata.favicon || fallback.favicon, description: metadata.description || fallback.description }
    }
  }

  if (metadata && (metadata.title || metadata.coverImage)) {
    lruCache.set(url, metadata)
    setCachedMetadata(url, metadata).catch(() => {})
    metadataStats.success++
    return metadata
  }
  metadataStats.failed++
  return { title: null, coverImage: null, favicon: null, description: null }
}

function cacheKey(url: string): string { return `md:${url}` }

async function getCachedMetadata(url: string): Promise<UrlMetadata | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    const raw = await redis.get(cacheKey(url))
    if (!raw) return null
    const parsed = JSON.parse(raw) as UrlMetadata
    if (parsed && (parsed.title || parsed.coverImage)) return parsed
  } catch {}
  return null
}

async function setCachedMetadata(url: string, data: UrlMetadata): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  const hasData = data && (data.title || data.coverImage || data.description)
  if (!hasData) return
  try { await redis.setex(cacheKey(url), CACHE_TTL_SECONDS, JSON.stringify(data)) } catch {}
}

async function fetchOEmbedMetadata(url: string, config: OEmbedConfig, signal?: AbortSignal, platformKey?: string): Promise<UrlMetadata | null> {
  const controller = new AbortController()
  // P1: oEmbed timeout 从 3000ms 缩短到 2000ms，避免阻塞 total timeout
  const timeout = setTimeout(() => controller.abort(), 2000)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    const response = await fetch(config.endpoint(url), {
      headers: { 'User-Agent': DESKTOP_USER_AGENT, 'Accept': 'application/json' },
      signal: controller.signal, follow: 2,
    })
    if (!response.ok) return null
    const data = await response.json() as Record<string, unknown>
    if (data.code === 0 && data.data && typeof data.data === 'object') {
      const bd = data.data as Record<string, unknown>
      return { title: typeof bd.title === 'string' ? bd.title : null, coverImage: typeof bd.pic === 'string' ? bd.pic.replace(/^http:/, 'https:') : null, favicon: 'https://www.bilibili.com/favicon.ico', description: typeof bd.desc === 'string' ? bd.desc.substring(0, 200) : null }
    }
    return { title: typeof data.title === 'string' ? data.title : null, coverImage: ensureHttps(typeof data.thumbnail_url === 'string' ? data.thumbnail_url : typeof data.image === 'string' ? data.image : null), favicon: null, description: typeof data.description === 'string' ? data.description : (typeof data.author_name === 'string' ? `By ${data.author_name}` : null) }
  } catch {
    // oEmbed 失败时立即返回平台 fallback，不返回空值
    if (platformKey && platformKey !== 'other') {
      return getPlatformFallbackMetadata(platformKey, url)
    }
    return null
  } finally { clearTimeout(timeout) }
}

async function fetchBilibiliMetadata(url: string, signal?: AbortSignal): Promise<UrlMetadata> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    const bv = extractBV(url)
    if (!bv) return { title: null, coverImage: null, favicon: null, description: null }
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bv}&jsonp=jsonp`, {
      headers: { 'User-Agent': DESKTOP_USER_AGENT, 'Accept': 'application/json', 'Referer': 'https://www.bilibili.com', 'Origin': 'https://www.bilibili.com' },
      signal: controller.signal, agent: url.startsWith('https') ? httpsAgent : undefined,
    })
    if (!response.ok) return { title: null, coverImage: null, favicon: null, description: null }
    const data = await response.json() as Record<string, unknown>
    const info = data.data && typeof data.data === 'object' ? data.data as Record<string, unknown> : undefined
    if (!info || data.code !== 0) return { title: null, coverImage: null, favicon: null, description: null }
    const infoTitle = info.title as string | undefined
    const infoShortTitle = info.short_title as string | undefined
    const infoPic = info.pic as string | undefined
    const infoDesc = info.desc as string | undefined
    return { title: cleanTitle(infoTitle || infoShortTitle || '') || null, coverImage: infoPic ? resolveUrl(url, infoPic.replace(/^http:/, 'https:')) : null, favicon: 'https://www.bilibili.com/favicon.ico', description: infoDesc ? cleanTitle(infoDesc.substring(0, 200)) : null }
  } catch { return { title: null, coverImage: null, favicon: null, description: null } } finally { clearTimeout(timeout) }
}

function extractDouyinVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    const modalId = u.searchParams.get('modal_id')
    if (modalId) return modalId
    const vid = u.searchParams.get('vid')
    if (vid) return vid
    const pathMatch = u.pathname.match(/\/video\/(\d+)/)
    if (pathMatch) return pathMatch[1]
    const hashMatch = u.hash.match(/modal_id=(\d+)/)
    if (hashMatch) return hashMatch[1]
    const modalIdMatch = url.match(/modal_id=(\d+)/)
    if (modalIdMatch) return modalIdMatch[1]
    const vidMatch = url.match(/[?&]vid=(\d+)/)
    if (vidMatch) return vidMatch[1]
  } catch {}
  return null
}

async function fetchDouyinMetadata(url: string, signal?: AbortSignal): Promise<UrlMetadata> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    const videoId = extractDouyinVideoId(url)
    console.log(`[fetchDouyinMetadata] videoId=${videoId} url=${url}`)

    const headers: Record<string, string> = {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': 'https://www.douyin.com/',
    }

    let title: string | null = null
    let coverImage: string | null = null

    if (videoId) {
      try {
        const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`
        const apiController = new AbortController()
        const apiTimeout = setTimeout(() => apiController.abort(), 4000)
        if (signal) {
          signal.addEventListener('abort', () => apiController.abort(), { once: true })
        }
        try {
          const apiResp = await fetch(apiUrl, {
            headers: { ...headers, 'Referer': 'https://www.douyin.com/' },
            signal: apiController.signal,
          })
          if (apiResp.ok) {
            const data = await apiResp.json() as any
            if (data?.item_list?.[0]) {
              const item = data.item_list[0]
              if (!coverImage && item.video?.cover?.url_list?.[0]) {
                const c = item.video.cover.url_list[0]
                if (c && c.startsWith('http') && !c.includes('avatar')) {
                  coverImage = c
                  console.log('[fetchDouyinMetadata] Cover from API:', coverImage?.substring(0, 80))
                }
              }
              if (!coverImage && item.video?.origin_cover?.url_list?.[0]) {
                const c = item.video.origin_cover.url_list[0]
                if (c && c.startsWith('http')) {
                  coverImage = c
                }
              }
              if (!title && item.desc) {
                title = item.desc
                console.log('[fetchDouyinMetadata] Title from API:', title?.substring(0, 80))
              }
            }
          }
        } catch (e) {
          console.log('[fetchDouyinMetadata] API fetch failed:', (e as Error).message)
        } finally {
          clearTimeout(apiTimeout)
        }
      } catch {}
    }

    if (!coverImage || !title) {
      const htmlResp = await fetch(url, {
        headers,
        signal: controller.signal,
        agent: url.startsWith('https') ? httpsAgent : undefined,
      })

      if (htmlResp.ok) {
        const html = await htmlResp.text()

        if (!isAntiBotPage(html)) {
          if (!coverImage) {
            const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/)
            if (ogImageMatch && ogImageMatch[1].startsWith('http') && !ogImageMatch[1].includes('avatar')) {
              coverImage = ogImageMatch[1]
              console.log('[fetchDouyinMetadata] Cover from og:image:', coverImage?.substring(0, 80))
            }
          }

          if (!title) {
            const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/)
            if (ogTitleMatch) {
              const t = ogTitleMatch[1]
              if (t && t !== '抖音' && t !== '抖音-记录美好生活' && !t.includes('验证') && !t.includes('跳转')) {
                title = t
              }
            }
          }

          if (!title) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/)
            if (titleMatch) {
              let t = titleMatch[1].trim()
              t = t.replace(/\s*[-–—|]\s*抖音.*$/, '').trim()
              if (t && t !== '抖音' && t !== '抖音-记录美好生活' && !isLowQualityTitle(t) && t.length > 1) {
                title = t
              }
            }
          }

          if (!coverImage || !title) {
            try {
              const stateMatch = html.match(/(?:__INITIAL_STATE__|window\.__INITIAL_STATE__)\s*=\s*([\s\S]*?)(?:<\/script>|;)/)
              if (stateMatch) {
                let jsonStr = stateMatch[1].trim()
                if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1)
                if (jsonStr.startsWith('{')) {
                  try {
                    const state = JSON.parse(jsonStr.replace(/undefined/g, 'null'))
                    if (!coverImage) {
                      const findCover = (obj: any): string | null => {
                        if (!obj || typeof obj !== 'object') return null
                        if (Array.isArray(obj)) {
                          for (const item of obj) {
                            const c = findCover(item)
                            if (c) return c
                          }
                        }
                        if (obj.video?.cover?.url_list?.[0]) return obj.video.cover.url_list[0]
                        if (obj.video?.origin_cover?.url_list?.[0]) return obj.video.origin_cover.url_list[0]
                        if (obj.cover?.url_list?.[0]) return obj.cover.url_list[0]
                        for (const key of Object.keys(obj)) {
                          const val = obj[key]
                          if (val && typeof val === 'object') {
                            const c = findCover(val)
                            if (c) return c
                          }
                        }
                        return null
                      }
                      coverImage = findCover(state)
                    }
                    if (!title) {
                      const findTitle = (obj: any): string | null => {
                        if (!obj || typeof obj !== 'object') return null
                        if (Array.isArray(obj)) {
                          for (const item of obj) {
                            const t = findTitle(item)
                            if (t) return t
                          }
                        }
                        if (typeof obj.desc === 'string' && obj.desc.length > 1) return obj.desc
                        if (typeof obj.title === 'string' && obj.title.length > 1) return obj.title
                        for (const key of Object.keys(obj)) {
                          const val = obj[key]
                          if (val && typeof val === 'object') {
                            const t = findTitle(val)
                            if (t) return t
                          }
                        }
                        return null
                      }
                      title = findTitle(state)
                    }
                    if (coverImage) console.log('[fetchDouyinMetadata] Cover from INITIAL_STATE')
                    if (title) console.log('[fetchDouyinMetadata] Title from INITIAL_STATE:', title?.substring(0, 80))
                  } catch {}
                }
              }
            } catch {}
          }
        }
      }
    }

    title = title ? cleanTitle(title) : null
    coverImage = coverImage ? ensureHttps(coverImage) : null

    if (title || coverImage) {
      return {
        title,
        coverImage,
        favicon: 'https://www.douyin.com/favicon.ico',
        description: null,
      }
    }

    return await getPlatformFallbackMetadata('douyin', url)
  } catch {
    return await getPlatformFallbackMetadata('douyin', url)
  } finally {
    clearTimeout(timeout)
  }
}

function extractXiaohongshuNoteId(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\/explore\/([a-zA-Z0-9]+)/)
    if (match) return match[1]
    const match2 = pathname.match(/\/discovery\/item\/([a-zA-Z0-9]+)/)
    if (match2) return match2[1]
  } catch {}
  return null
}

async function fetchXiaohongshuMetadata(url: string, signal?: AbortSignal): Promise<UrlMetadata> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    const noteId = extractXiaohongshuNoteId(url)
    console.log(`[fetchXiaohongshuMetadata] noteId=${noteId} url=${url}`)

    const headers: Record<string, string> = {
      'User-Agent': DESKTOP_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Cookie': '',
    }

    let title: string | null = null
    let coverImage: string | null = null

    const htmlResp = await fetch(url, {
      headers,
      signal: controller.signal,
      agent: url.startsWith('https') ? httpsAgent : undefined,
    })

    if (htmlResp.ok) {
      const html = await htmlResp.text()

      if (!isAntiBotPage(html)) {
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/)
          || html.match(/<meta\s+property=["']og:image:url["']\s+content=["']([^"']+)["']/)
        if (ogImageMatch && ogImageMatch[1].startsWith('http')) {
          coverImage = ogImageMatch[1]
          console.log('[fetchXiaohongshuMetadata] Cover from og:image:', coverImage?.substring(0, 80))
        }

        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/)
        if (ogTitleMatch && ogTitleMatch[1] && ogTitleMatch[1] !== '小红书') {
          title = ogTitleMatch[1]
        }

        if (!title) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/)
          if (titleMatch) {
            let t = titleMatch[1].trim()
            t = t.replace(/\s*[-–—|]\s*小红书.*$/, '').trim()
            if (t && t !== '小红书' && !isLowQualityTitle(t) && t.length > 1) {
              title = t
            }
          }
        }

        if (!coverImage) {
          const imgMatch = html.match(/<img[^>]*src=["']([^"']*xhscdn[^"']*)["'][^>]*>/i)
            || html.match(/<img[^>]*src=["']([^"']*sns-webpic[^"']*)["'][^>]*>/i)
          if (imgMatch) {
            coverImage = imgMatch[1]
            if (coverImage && !coverImage.startsWith('http')) {
              coverImage = 'https:' + coverImage
            }
          }
        }

        if (!coverImage || !title) {
          try {
            const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/)
            if (stateMatch) {
              let jsonStr = stateMatch[1].trim()
              if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1)
              if (jsonStr.startsWith('{')) {
                try {
                  const state = JSON.parse(jsonStr.replace(/undefined/g, 'null'))
                  const findNote = (obj: any): any => {
                    if (!obj || typeof obj !== 'object') return null
                    if (obj.noteId === noteId || obj.note?.noteId === noteId) return obj.note || obj
                    if (obj.noteDetailMap) {
                      for (const key of Object.keys(obj.noteDetailMap)) {
                        if (obj.noteDetailMap[key]?.note) return obj.noteDetailMap[key].note
                      }
                    }
                    for (const key of Object.keys(obj)) {
                      const val = obj[key]
                      if (val && typeof val === 'object' && !Array.isArray(val)) {
                        const found = findNote(val)
                        if (found) return found
                      }
                    }
                    return null
                  }
                  const note = findNote(state)
                  if (note) {
                    if (!title && note.title) title = note.title
                    if (!title && note.displayTitle) title = note.displayTitle
                    if (!coverImage && note.imageList?.[0]?.url) {
                      coverImage = note.imageList[0].url
                    }
                    if (!coverImage && note.cover?.url) {
                      coverImage = note.cover.url
                    }
                  }
                } catch {}
              }
            }
          } catch {}
        }
      }
    }

    title = title ? cleanTitle(title) : null
    coverImage = coverImage ? ensureHttps(coverImage) : null

    if (title || coverImage) {
      return {
        title,
        coverImage,
        favicon: 'https://www.xiaohongshu.com/favicon.ico',
        description: null,
      }
    }

    return await getPlatformFallbackMetadata('xiaohongshu', url)
  } catch {
    return await getPlatformFallbackMetadata('xiaohongshu', url)
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchOgsMetadata(url: string, platformKey?: string, signal?: AbortSignal): Promise<UrlMetadata> {
  if (signal?.aborted) {
    return { title: null, coverImage: null, favicon: null, description: null }
  }
  try {
    const ua = platformKey && PLATFORM_UA_MAP[platformKey] ? PLATFORM_UA_MAP[platformKey] : DESKTOP_USER_AGENT
    // ogs 库内部使用自己的 HTTP 请求，不直接支持 AbortSignal 传递
    // 使用 Promise.race 让外部 abort 信号可以快速取消等待，减少总超时延迟
    const ogsPromise = ogs({
      url, timeout: { request: FETCH_TIMEOUT_MS },
      headers: { 'User-Agent': ua },
      onlyGetOpenGraphInfo: false, followRedirect: true, maxRedirects: 5,
    })

    const { error, result } = signal
      ? await Promise.race([
          ogsPromise,
          new Promise<never>((_, reject) => {
            const handler = () => reject(new Error('AbortError'))
            signal.addEventListener('abort', handler, { once: true })
          }),
        ])
      : await ogsPromise

    if (error || !result) {
      logger.warn({ url, error }, '[fetchOgsMetadata] ogs 返回错误或无结果')
      return { title: null, coverImage: null, favicon: null, description: null }
    }
    const r = result as unknown as {
      ogTitle?: string
      ogImage?: { url: string }[]
      twitterTitle?: string
      twitterImage?: { url: string }[]
      articleTitle?: string
      ogDescription?: string
      twitterDescription?: string
      favicon?: string
    }
    logger.info({ url, ogTitle: r.ogTitle, ogImageCount: r.ogImage?.length, twitterImageCount: r.twitterImage?.length, ogImageUrl: r.ogImage?.[0]?.url, twitterImageUrl: r.twitterImage?.[0]?.url }, '[fetchOgsMetadata] ogs 解析结果')
    const ogImage = r.ogImage?.[0]
    return {
      title: r.ogTitle || r.twitterTitle || r.articleTitle || null,
      coverImage: ensureHttps(ogImage?.url || r.twitterImage?.[0]?.url || null),
      favicon: ensureHttps(r.favicon || null),
      description: r.ogDescription || r.twitterDescription || null,
    }
  } catch (err) {
    logger.error({ url, err }, '[fetchOgsMetadata] 失败')
    return { title: null, coverImage: null, favicon: null, description: null }
  }
}

async function fetchCloudflareWorkerFallback(url: string, signal?: AbortSignal): Promise<UrlMetadata> {
  if (!CLOUDFLARE_WORKER_URL) return { title: null, coverImage: null, favicon: null, description: null }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'LinkChest/1.0', 'Accept': 'application/json' },
      signal: controller.signal, agent: url.startsWith('https') ? httpsAgent : undefined,
    })
    if (!response.ok) return { title: null, coverImage: null, favicon: null, description: null }
    const data = await response.json() as Record<string, unknown>
    if (data.error) return { title: null, coverImage: null, favicon: null, description: null }
    return { title: typeof data.title === 'string' ? data.title : null, coverImage: ensureHttps(typeof data.coverImage === 'string' ? data.coverImage : null), favicon: ensureHttps(typeof data.favicon === 'string' ? data.favicon : null), description: typeof data.description === 'string' ? data.description : null }
  } catch { return { title: null, coverImage: null, favicon: null, description: null } } finally { clearTimeout(timeout) }
}

async function getPlatformFallbackMetadata(platformKey: string, url?: string): Promise<UrlMetadata> {
  const { getSupportedPlatformList } = await import('./platforms')
  const platform = getSupportedPlatformList().find(p => p.key === platformKey)
  if (!platform) return { title: null, coverImage: null, favicon: null, description: null }
  const faviconMap: Record<string, string> = {
    bilibili: 'https://www.bilibili.com/favicon.ico', douyin: 'https://www.douyin.com/favicon.ico',
    wechat: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico', zhihu: 'https://static.zhihu.com/heifetz/favicon.ico',
    weibo: 'https://weibo.com/favicon.ico', youtube: 'https://www.youtube.com/s/desktop/aa71f599/img/favicon_144x144.png',
    tiktok: 'https://www.tiktok.com/favicon.ico', instagram: 'https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png',
    twitter: 'https://abs.twimg.com/favicons/twitter.2.ico', reddit: 'https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png',
    pinterest: 'https://s.pinimg.com/webapp/logo_trans_144x-a77cb6ed.png', xiaohongshu: 'https://www.xiaohongshu.com/favicon.ico',
  }
  let coverImage: string | null = null
  if (platformKey === 'youtube' && url) {
    const videoId = extractYoutubeVideoId(url)
    if (videoId) coverImage = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  }
  return { title: platform.name, coverImage, favicon: faviconMap[platformKey] || null, description: null }
}

function cleanTitle(title: string): string {
  if (!title) return ''
  let c = title.replace(/\s+/g, ' ').trim()
  c = c.replace(/\s*[-–—|]\s*(微博|知乎|抖音|小红书|B站|哔哩哔哩|今日头条|网易|腾讯|优酷|爱奇艺|快手|微信公众号)$/i, '')
    .replace(/\s*[-–—|]\s*(Weibo|Zhihu|Douyin|Xiaohongshu|Bilibili)$/i, '')
    .replace(/\s*[-–—|]\s*首页$/, '')
    .replace(/\s*[-–—|]\s*官方账号$/, '')
  if (c.length > 200) c = c.substring(0, 200)
  return c.trim()
}

function isLowQualityTitle(title: string): boolean {
  const patterns = [
    '身份核实','需您同意','请验证','安全验证','访问验证','验证码中间页','验证','人机验证','智能验证','滑动验证','图形验证',
    '正在跳转','页面跳转中','loading','请稍候','verify','verification','captcha','security check','access denied','blocked','restricted',
    '登录','sign in','log in','signup','register','404','not found','error',' forbidden','bad request','internal server error','service unavailable',
    '无法访问','页面不存在','找不到网页','jsvmprt','anti-bot','antibot',
  ]
  const lower = title.toLowerCase()
  return patterns.some(p => lower.includes(p.toLowerCase()))
}

import { ensureHttps } from '../lib/utils'

function resolveUrl(base: string, relative: string): string {
  try { return new URL(relative, base).href } catch { return relative }
}
