/**
 * 元数据抓取服务 v4.0 — Puppeteer 核心架构
 *
 * 抓取策略链：
 * 1. LRU 内存缓存 → Redis 缓存（命中直接返回）
 * 2. 快速 API 通道（B站 API / YouTube 缩略图 / OEmbed，< 1s）
 * 3. Puppeteer 渲染（核心通道，3-8s，覆盖所有平台）
 * 4. 截图兜底（Puppeteer 渲染后无 og:image 时截图）
 * 5. 封面持久化到 COS（外部 URL 永不过期）
 * 6. 平台品牌色降级（最后兜底）
 */
import fetch from 'node-fetch'
import https from 'https'
import ogs from 'open-graph-scraper'
import { LRUCache } from 'lru-cache'
import sharp from 'sharp'
import { getRedisClient } from '../lib/redis'
import { METADATA_CONFIG, COS_CONFIG } from '../lib/config'
import logger from '../lib/logger'
import { getBrowserPool } from './browser-pool'
import { uploadToCos, getSignedUrl } from './cos'
import type { Page } from 'puppeteer'

// ===== 监控统计 =====
const metadataStats = {
  total: 0,
  lruHit: 0,
  redisHit: 0,
  success: 0,
  failed: 0,
  puppeteerUsed: 0,
  screenshotUsed: 0,
  cosPersisted: 0,
}

export function getMetadataStats() {
  const { total, lruHit, redisHit, success, failed, puppeteerUsed, screenshotUsed, cosPersisted } = metadataStats
  const cacheHits = lruHit + redisHit
  const cacheHitRate = total > 0 ? ((cacheHits / total) * 100).toFixed(1) : '0.0'
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0'
  return {
    total, lruHit, redisHit, cacheHitRate, cacheHits,
    success, failed, successRate,
    puppeteerUsed, screenshotUsed, cosPersisted,
  }
}

export interface UrlMetadata {
  title: string | null
  coverImage: string | null
  favicon: string | null
  description: string | null
}

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || ''

// ===== 平台检测辅助 =====

function extractBV(url: string): string | null {
  const m = url.match(/BV[0-9A-Za-z]{10}/)
  return m ? m[0] : null
}

function normalizeYoutubeUrl(url: string): string {
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
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

// ===== 常量 =====

const DESKTOP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const FETCH_TIMEOUT_MS = METADATA_CONFIG.fetchTimeoutMs
const TOTAL_TIMEOUT_MS = 15_000 // Puppeteer 需要更长的总超时
const CACHE_TTL_SECONDS = METADATA_CONFIG.cacheTtlSeconds

const httpsAgent = new https.Agent({
  rejectUnauthorized: !(process.env.METADATA_ALLOW_INSECURE === 'true'),
})

const lruCache = new LRUCache<string, UrlMetadata>({
  max: METADATA_CONFIG.lruCacheMaxSize,
  ttl: 1000 * 60 * 5,
})

// ===== OEmbed 配置（快速通道） =====

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
  bilibili:   { endpoint: (url) => { const bv = extractBV(url); return bv ? `https://api.bilibili.com/x/web-interface/view?bvid=${bv}&jsonp=jsonp` : `https://www.bilibili.com/oembed?url=${encodeURIComponent(url)}` } },
  reddit:     { endpoint: (url) => `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}` },
  pinterest:  { endpoint: (url) => `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(url)}` },
}

// ===== 平台专用 Puppeteer 等待策略 =====

interface PlatformWaitStrategy {
  /** 等待选择器（优先） */
  waitForSelector?: string
  /** 等待函数（更灵活） */
  waitForFunction?: string
  /** 额外等待时间（ms），确保 SPA 渲染完成 */
  extraWaitMs?: number
  /** 是否使用移动端 UA */
  mobileUA?: boolean
  /** 超时时间（ms） */
  timeout?: number
}

const PLATFORM_WAIT_STRATEGIES: Record<string, PlatformWaitStrategy> = {
  douyin: {
    waitForSelector: 'video, [data-e2e="video-desc"], meta[property="og:image"]',
    extraWaitMs: 2000,
    mobileUA: true,
    timeout: 10000,
  },
  xiaohongshu: {
    waitForSelector: '.note-content, meta[property="og:image"], [class*="note-detail"]',
    extraWaitMs: 2500,
    mobileUA: true,
    timeout: 10000,
  },
  kuaishou: {
    waitForSelector: 'video, meta[property="og:image"]',
    extraWaitMs: 2000,
    mobileUA: true,
    timeout: 10000,
  },
  weibo: {
    waitForSelector: '.WB_editor_iframe_new img, meta[property="og:image"]',
    extraWaitMs: 1000,
    timeout: 8000,
  },
  zhihu: {
    waitForSelector: '.ContentItem, meta[property="og:image"]',
    extraWaitMs: 1000,
    timeout: 8000,
  },
  wechat: {
    waitForSelector: 'meta[property="og:image"], .rich_media_content img',
    extraWaitMs: 1500,
    timeout: 10000,
  },
  bilibili: {
    waitForSelector: 'meta[property="og:image"]',
    extraWaitMs: 500,
    timeout: 8000,
  },
}

const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'

// ===== 主入口 =====

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TOTAL_TIMEOUT_MS)
  try {
    return await fetchUrlMetadataCore(url, controller.signal)
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || err.message === 'TOTAL_TIMEOUT')) {
      logger.warn({ url }, '[metadata] TOTAL_TIMEOUT，尝试平台降级')
      try {
        const { detectPlatform } = await import('./platforms')
        const pk = detectPlatform(url)
        if (pk !== 'other') return getPlatformFallbackMetadata(pk, url)
      } catch { /* 忽略 */ }
    }
    return { title: null, coverImage: null, favicon: null, description: null }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchUrlMetadataCore(url: string, signal?: AbortSignal): Promise<UrlMetadata> {
  logger.debug({ url }, '[metadata] START')

  // 1. LRU 缓存
  const lruHit = lruCache.get(url)
  if (lruHit && (lruHit.title || lruHit.coverImage)) {
    logger.debug({ url }, '[metadata] LRU hit')
    metadataStats.total++
    metadataStats.lruHit++
    metadataStats.success++
    return lruHit
  }

  // 2. Redis 缓存
  const cached = await getCachedMetadata(url)
  const cachedHasData = cached && (cached.title || cached.coverImage || cached.description)
  if (cachedHasData) {
    metadataStats.total++
    metadataStats.redisHit++
    metadataStats.success++
    lruCache.set(url, cached!)
    return cached!
  }

  metadataStats.total++

  // 3. 平台检测
  let platformKey = 'other'
  try {
    const { detectPlatform } = await import('./platforms')
    platformKey = detectPlatform(url)
  } catch { /* 忽略 */ }
  logger.debug({ url, platform: platformKey }, '[metadata] platform detected')

  const normalizedUrl = platformKey === 'youtube' ? normalizeYoutubeUrl(url) : url

  // 4. 快速 API 通道（并行尝试）
  const fastResult = await tryFastChannels(normalizedUrl, platformKey, signal)
  if (fastResult && (fastResult.title || fastResult.coverImage)) {
    return finalizeMetadata(url, fastResult, platformKey)
  }

  // 5. Puppeteer 渲染（核心通道）
  const puppeteerResult = await fetchWithPuppeteer(normalizedUrl, platformKey, signal)
  if (puppeteerResult && (puppeteerResult.title || puppeteerResult.coverImage)) {
    return finalizeMetadata(url, puppeteerResult, platformKey)
  }

  // 6. Cloudflare Worker 兜底（如果配置了）
  if (CLOUDFLARE_WORKER_URL) {
    const workerResult = await fetchCloudflareWorkerFallback(url, signal)
    if (workerResult && (workerResult.title || workerResult.coverImage)) {
      return finalizeMetadata(url, workerResult, platformKey)
    }
  }

  // 7. 平台品牌色降级
  if (platformKey !== 'other') {
    const fallback = await getPlatformFallbackMetadata(platformKey, url)
    return finalizeMetadata(url, fallback, platformKey)
  }

  metadataStats.failed++
  return { title: null, coverImage: null, favicon: null, description: null }
}

// ===== 快速 API 通道（并行） =====

async function tryFastChannels(
  url: string,
  platformKey: string,
  signal?: AbortSignal
): Promise<UrlMetadata | null> {
  const tasks: Promise<UrlMetadata | null>[] = []

  // B站 API
  if (platformKey === 'bilibili') {
    tasks.push(fetchBilibiliMetadata(url, signal))
  }

  // YouTube 缩略图构造
  if (platformKey === 'youtube') {
    const videoId = extractYoutubeVideoId(url)
    if (videoId) {
      tasks.push(Promise.resolve({
        title: null,
        coverImage: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        favicon: 'https://www.youtube.com/favicon.ico',
        description: null,
      }))
    }
  }

  // OEmbed API
  if (OEMBED_PROVIDERS[platformKey]) {
    tasks.push(fetchOEmbedMetadata(url, OEMBED_PROVIDERS[platformKey], signal, platformKey))
  }

  if (tasks.length === 0) return null

  // 并行执行，取第一个有效结果
  const results = await Promise.allSettled(tasks)
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value && (result.value.title || result.value.coverImage)) {
      return result.value
    }
  }
  return null
}

// ===== Puppeteer 渲染（核心通道） =====

async function fetchWithPuppeteer(
  url: string,
  platformKey: string,
  signal?: AbortSignal
): Promise<UrlMetadata | null> {
  if (signal?.aborted) return null

  const pool = getBrowserPool()
  let page: Page | null = null

  try {
    page = await pool.acquireTab()
    metadataStats.puppeteerUsed++

    // 设置平台专用 UA
    const strategy = PLATFORM_WAIT_STRATEGIES[platformKey]
    if (strategy?.mobileUA) {
      await page.setUserAgent(MOBILE_USER_AGENT)
      await page.setViewport({ width: 375, height: 812, isMobile: true })
    }

    // 导航到目标页面
    const navTimeout = strategy?.timeout || 10000
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: navTimeout,
    })

    // 平台专用等待策略
    if (strategy?.waitForSelector) {
      try {
        await page.waitForSelector(strategy.waitForSelector, {
          timeout: strategy.timeout || 8000,
        })
      } catch {
        // 等待选择器超时，继续提取
        logger.debug({ url, platform: platformKey }, '[metadata] waitForSelector 超时，继续提取')
      }
    }

    // 额外等待（确保 SPA 渲染完成）
    if (strategy?.extraWaitMs) {
      await new Promise(resolve => setTimeout(resolve, strategy.extraWaitMs))
    }

    // 通用最小渲染等待
    if (!strategy?.waitForSelector && !strategy?.extraWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    // 从渲染后的页面提取元数据
    const metadata = await extractMetadataFromPage(page, url, platformKey)

    // 验证封面 URL 是否有效（排除空 CDN 地址等无效 URL）
    if (metadata.coverImage && !isValidCoverUrl(metadata.coverImage)) {
      logger.debug({ url, coverImage: metadata.coverImage }, '[metadata] 封面 URL 无效，走截图兜底')
      metadata.coverImage = null
    }

    // 如果没有封面图，尝试截图兜底
    if (!metadata.coverImage) {
      const screenshotUrl = await takeScreenshotAndUpload(page, url)
      if (screenshotUrl) {
        metadata.coverImage = screenshotUrl
        metadataStats.screenshotUsed++
      }
    }

    // 封面持久化到 COS
    if (metadata.coverImage && isExternalImageUrl(metadata.coverImage)) {
      const persistedUrl = await persistCoverToCos(metadata.coverImage, url)
      if (persistedUrl) {
        metadata.coverImage = persistedUrl
        metadataStats.cosPersisted++
      } else {
        // 持久化失败（下载失败），回退到截图兜底
        logger.debug({ url, coverImage: metadata.coverImage }, '[metadata] 封面持久化失败，回退截图兜底')
        const screenshotUrl = await takeScreenshotAndUpload(page, url)
        if (screenshotUrl) {
          metadata.coverImage = screenshotUrl
          metadataStats.screenshotUsed++
        }
      }
    }

    return metadata
  } catch (err) {
    logger.warn(
      { url, platform: platformKey, err: err instanceof Error ? err.message : String(err) },
      '[metadata] Puppeteer 渲染失败'
    )
    return null
  } finally {
    if (page) {
      try {
        await pool.releaseTab(page)
      } catch {
        // 释放失败不影响主流程
      }
    }
  }
}

// ===== 从渲染后的页面提取元数据 =====

async function extractMetadataFromPage(
  page: Page,
  url: string,
  platformKey: string
): Promise<UrlMetadata> {
  // page.evaluate 内部代码在浏览器环境执行，可使用 DOM API
  // 使用字符串函数避免 TypeScript 对浏览器环境 API 的类型检查
  const extractFn = `
    (pk) => {
      const result = { title: null, coverImage: null, favicon: null, description: null }

      // 1. og:title
      const ogTitle = document.querySelector('meta[property="og:title"]')
      if (ogTitle) result.title = ogTitle.getAttribute('content')

      // 2. og:image
      const ogImage = document.querySelector('meta[property="og:image"]')
        || document.querySelector('meta[property="og:image:url"]')
      if (ogImage) {
        const img = ogImage.getAttribute('content')
        if (img && img.startsWith('http')) result.coverImage = img
      }

      // 3. twitter:image
      if (!result.coverImage) {
        const twitterImage = document.querySelector('meta[name="twitter:image"]')
          || document.querySelector('meta[property="twitter:image"]')
        if (twitterImage) {
          const img = twitterImage.getAttribute('content')
          if (img && img.startsWith('http')) result.coverImage = img
        }
      }

      // 4. og:description
      const ogDesc = document.querySelector('meta[property="og:description"]')
      if (ogDesc) result.description = ogDesc.getAttribute('content')

      // 5. twitter:title
      if (!result.title) {
        const twitterTitle = document.querySelector('meta[name="twitter:title"]')
          || document.querySelector('meta[property="twitter:title"]')
        if (twitterTitle) result.title = twitterTitle.getAttribute('content')
      }

      // 6. <title> 标签
      if (!result.title) {
        result.title = document.title || null
      }

      // 7. favicon
      const faviconLink = document.querySelector('link[rel="icon"]')
        || document.querySelector('link[rel="shortcut icon"]')
        || document.querySelector('link[rel="apple-touch-icon"]')
      if (faviconLink) {
        const href = faviconLink.getAttribute('href')
        if (href) {
          result.favicon = href.startsWith('http') ? href : new URL(href, window.location.origin).href
        }
      }

      // 8. JSON-LD 结构化数据（补充封面和描述）
      if (!result.coverImage || !result.description) {
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.textContent || '{}')
            const image = data.image
            if (!result.coverImage && image) {
              if (typeof image === 'string' && image.startsWith('http')) {
                result.coverImage = image
              } else if (Array.isArray(image) && image[0]) {
                const img = typeof image[0] === 'string' ? image[0] : image[0]?.url
                if (img && img.startsWith('http')) result.coverImage = img
              } else if (image?.url && image.url.startsWith('http')) {
                result.coverImage = image.url
              }
            }
            if (!result.description && data.description) {
              result.description = String(data.description).substring(0, 200)
            }
          } catch { /* 忽略 JSON 解析失败 */ }
        }
      }

      // 9. 平台专用提取
      if (pk === 'douyin') {
        if (!result.coverImage) {
          const video = document.querySelector('video')
          if (video?.poster && video.poster.startsWith('http')) {
            result.coverImage = video.poster
          }
        }
        if (!result.title || !result.coverImage) {
          try {
            const ssrData = window._SSR_HYDRATED_DATA
            if (ssrData?.app) {
              const app = ssrData.app
              const videoList = app.videoList || app.itemList || []
              const video = videoList[0]
              if (!result.title && video?.title) result.title = video.title
              if (!result.title && video?.desc) result.title = video.desc
              if (!result.coverImage && video?.cover) result.coverImage = video.cover
              if (!result.coverImage && video?.originCover) result.coverImage = video.originCover
            }
          } catch { /* 忽略 */ }
        }
      }

      if (pk === 'xiaohongshu') {
        if (!result.coverImage) {
          const noteImg = document.querySelector('.note-content img, [class*="note-detail"] img')
          if (noteImg) {
            const src = noteImg.getAttribute('src') || noteImg.getAttribute('data-src')
            if (src) result.coverImage = src.startsWith('http') ? src : 'https:' + src
          }
        }
        if (!result.coverImage) {
          const video = document.querySelector('video')
          if (video?.poster && video.poster.startsWith('http')) {
            result.coverImage = video.poster
          }
        }
      }

      if (pk === 'kuaishou') {
        if (!result.coverImage) {
          const video = document.querySelector('video')
          if (video?.poster && video.poster.startsWith('http')) {
            result.coverImage = video.poster
          }
        }
      }

      // 10. 通用兜底：页面中第一张足够大的图片
      if (!result.coverImage) {
        const images = document.querySelectorAll('img')
        for (const img of images) {
          const src = img.getAttribute('src') || img.getAttribute('data-src')
          const width = img.naturalWidth || img.width
          const height = img.naturalHeight || img.height
          if (src && src.startsWith('http') && width >= 200 && height >= 200) {
            result.coverImage = src
            break
          }
        }
      }

      return result
    }
  `

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (page.evaluate as any)(`(${extractFn})(${JSON.stringify(platformKey)})`) as Promise<UrlMetadata>
}

// ===== 截图兜底 =====

async function takeScreenshotAndUpload(page: Page, url: string): Promise<string | null> {
  try {
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 60,
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 },
    })

    // 压缩截图
    const compressed = await sharp(screenshotBuffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer()

    // 上传到 COS
    const cosKey = `screenshots/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
    await uploadToCos(cosKey, compressed, 'image/webp')
    const signedUrl = await getSignedUrl(cosKey, 86400 * 30) // 30 天有效期

    logger.debug({ url }, '[metadata] 截图兜底成功')
    return signedUrl
  } catch (err) {
    logger.debug({ url, err: err instanceof Error ? err.message : String(err) }, '[metadata] 截图兜底失败')
    return null
  }
}

// ===== 封面 URL 验证 =====

/**
 * 验证封面 URL 是否是有效的图片地址
 * 排除以下无效情况：
 * - 小红书空 CDN: ci.xiaohongshu.com/?imageMogr2/...（无源图路径）
 * - 纯域名/根路径: https://example.com/ 或 https://example.com
 * - 无图片扩展名且无图片处理参数的短路径
 */
function isValidCoverUrl(url: string): boolean {
  if (!url || !url.startsWith('http')) return false

  try {
    const parsed = new URL(url)
    const path = parsed.pathname

    // 小红书空 CDN：ci.xiaohongshu.com/?imageMogr2/... 路径为空或只有 /
    if (parsed.hostname.includes('xiaohongshu.com') && (!path || path === '/' || path === '')) {
      return false
    }

    // 纯域名/根路径（无具体图片路径）
    if (!path || path === '/' || path === '') {
      return false
    }

    // 路径过短（正常图片路径至少包含文件名或 ID）
    if (path.length < 5) {
      return false
    }

    return true
  } catch {
    return false
  }
}

// ===== 封面持久化到 COS =====

function isExternalImageUrl(url: string): boolean {
  if (!url) return false
  // COS 签名 URL 或 COS 域名不算外部
  if (url.includes('myqcloud.com') || url.includes('cos.')) return false
  // 截图已上传到 COS，不算外部
  if (url.includes('screenshots/')) return false
  return url.startsWith('http')
}

async function persistCoverToCos(coverUrl: string, sourceUrl: string): Promise<string | null> {
  try {
    // 下载外部封面图
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const resp = await fetch(coverUrl, {
      headers: { 'User-Agent': DESKTOP_USER_AGENT },
      signal: controller.signal,
      agent: coverUrl.startsWith('https') ? httpsAgent : undefined,
    })
    clearTimeout(timeout)

    if (!resp.ok) return null

    const contentType = resp.headers.get('content-type') || ''
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      return null
    }

    const buffer = await resp.buffer()

    // Sharp 压缩
    const compressed = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()

    // 上传到 COS
    const cosKey = `covers/auto/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
    await uploadToCos(cosKey, compressed, 'image/webp')
    const signedUrl = await getSignedUrl(cosKey, 86400 * 30) // 30 天有效期

    logger.debug({ sourceUrl, coverUrl }, '[metadata] 封面持久化到 COS 成功')
    return signedUrl
  } catch (err) {
    logger.debug(
      { coverUrl, err: err instanceof Error ? err.message : String(err) },
      '[metadata] 封面持久化失败，使用原始 URL'
    )
    return null
  }
}

// ===== 最终化元数据（缓存 + 平台降级） =====

async function finalizeMetadata(
  url: string,
  metadata: UrlMetadata,
  platformKey: string
): Promise<UrlMetadata> {
  // 平台降级补充
  if (platformKey !== 'other') {
    const fallback = await getPlatformFallbackMetadata(platformKey, url)
    const effectiveTitle = metadata.title && !isLowQualityTitle(metadata.title)
      ? metadata.title
      : fallback.title
    metadata = {
      title: effectiveTitle,
      coverImage: metadata.coverImage || fallback.coverImage || null,
      favicon: metadata.favicon || fallback.favicon || null,
      description: metadata.description || fallback.description || null,
    }
  }

  // 清理标题
  if (metadata.title) {
    metadata.title = cleanTitle(metadata.title)
  }

  // 缓存
  if (metadata.title || metadata.coverImage) {
    lruCache.set(url, metadata)
    setCachedMetadata(url, metadata).catch(() => {})
    metadataStats.success++
    return metadata
  }

  metadataStats.failed++
  return { title: null, coverImage: null, favicon: null, description: null }
}

// ===== 缓存操作 =====

function cacheKey(url: string): string { return `md:${url}` }

async function getCachedMetadata(url: string): Promise<UrlMetadata | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    const raw = await redis.get(cacheKey(url))
    if (!raw) return null
    const parsed = JSON.parse(raw) as UrlMetadata
    if (parsed && (parsed.title || parsed.coverImage)) return parsed
  } catch { /* 忽略 */ }
  return null
}

async function setCachedMetadata(url: string, data: UrlMetadata): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  const hasData = data && (data.title || data.coverImage || data.description)
  if (!hasData) return
  try { await redis.setex(cacheKey(url), CACHE_TTL_SECONDS, JSON.stringify(data)) } catch { /* 忽略 */ }
}

// ===== 快速 API 通道实现 =====

async function fetchOEmbedMetadata(
  url: string, config: OEmbedConfig, signal?: AbortSignal, platformKey?: string
): Promise<UrlMetadata | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const response = await fetch(config.endpoint(url), {
      headers: { 'User-Agent': DESKTOP_USER_AGENT, 'Accept': 'application/json' },
      signal: controller.signal, follow: 2,
    })
    if (!response.ok) return null
    const data = await response.json() as Record<string, unknown>
    // B站 API 特殊处理
    if (data.code === 0 && data.data && typeof data.data === 'object') {
      const bd = data.data as Record<string, unknown>
      return {
        title: typeof bd.title === 'string' ? bd.title : null,
        coverImage: typeof bd.pic === 'string' ? bd.pic.replace(/^http:/, 'https:') : null,
        favicon: 'https://www.bilibili.com/favicon.ico',
        description: typeof bd.desc === 'string' ? bd.desc.substring(0, 200) : null,
      }
    }
    return {
      title: typeof data.title === 'string' ? data.title : null,
      coverImage: ensureHttps(typeof data.thumbnail_url === 'string' ? data.thumbnail_url : typeof data.image === 'string' ? data.image : null),
      favicon: null,
      description: typeof data.description === 'string' ? data.description : (typeof data.author_name === 'string' ? `By ${data.author_name}` : null),
    }
  } catch {
    if (platformKey && platformKey !== 'other') return getPlatformFallbackMetadata(platformKey, url)
    return null
  } finally { clearTimeout(timeout) }
}

async function fetchBilibiliMetadata(url: string, signal?: AbortSignal): Promise<UrlMetadata | null> {
  const bv = extractBV(url)
  if (!bv) return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bv}`, {
      headers: { 'User-Agent': DESKTOP_USER_AGENT, 'Accept': 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) return null
    const data = await response.json() as { code?: number; data?: { title?: string; pic?: string; desc?: string } }
    if (data.code !== 0 || !data.data) return null
    return {
      title: data.data.title || null,
      coverImage: data.data.pic ? data.data.pic.replace(/^http:/, 'https:') : null,
      favicon: 'https://www.bilibili.com/favicon.ico',
      description: data.data.desc ? data.data.desc.substring(0, 200) : null,
    }
  } catch { return null } finally { clearTimeout(timeout) }
}

// ===== Cloudflare Worker 兜底 =====

async function fetchCloudflareWorkerFallback(url: string, signal?: AbortSignal): Promise<UrlMetadata | null> {
  if (!CLOUDFLARE_WORKER_URL) return null
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'LinkChest/1.0', 'Accept': 'application/json' },
      signal: controller.signal, agent: url.startsWith('https') ? httpsAgent : undefined,
    })
    if (!response.ok) return null
    const data = await response.json() as Record<string, unknown>
    if (data.error) return null
    return {
      title: typeof data.title === 'string' ? data.title : null,
      coverImage: ensureHttps(typeof data.coverImage === 'string' ? data.coverImage : null),
      favicon: ensureHttps(typeof data.favicon === 'string' ? data.favicon : null),
      description: typeof data.description === 'string' ? data.description : null,
    }
  } catch { return null } finally { clearTimeout(timeout) }
}

// ===== 平台降级 =====

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

// ===== 工具函数 =====

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

function ensureHttps(url: string | null): string | null {
  if (!url) return null
  return url.replace(/^http:/, 'https:')
}
