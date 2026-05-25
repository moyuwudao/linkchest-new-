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
  console.log(`[fetchUrlMetadata] cache hit=${!!cached} hasData=${cachedHasData}`)
  if (cachedHasData) {
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

    if (OEMBED_PROVIDERS[platformKey]) {
      metadata = await fetchOEmbedMetadata(normalizedUrl, OEMBED_PROVIDERS[platformKey], signal, platformKey)
      if (platformKey === 'youtube' && metadata && !metadata.title && CLOUDFLARE_WORKER_URL) {
        const wr = await fetchCloudflareWorkerFallback(url, signal)
        if (wr.title || wr.coverImage) metadata = wr
      }
    }

    if (!metadata || (!metadata.title && !metadata.coverImage)) {
      if (platformKey === 'bilibili') metadata = await fetchBilibiliMetadata(normalizedUrl, signal)
      else metadata = await fetchOgsMetadata(normalizedUrl, platformKey, signal)
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
    metadata = { title: effectiveTitle, coverImage: metadata.coverImage || null, favicon: metadata.favicon || fallback.favicon, description: metadata.description || fallback.description }
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
