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

/**
 * 小红书 URL 预处理
 * 关键：必须保留 xsec_token 参数！没有 xsec_token 会被识别为无效访问（300031 错误）
 */
function normalizeXiaohongshuUrl(url: string): string {
  // 不做任何处理，保留完整 URL（包括 xsec_token 和 xsec_source）
  return url
}

/**
 * 将 Cookie 字符串解析为 Puppeteer setCookie 格式
 * 格式: "key1=value1; key2=value2" 或 JSON 数组
 */
function parseCookieString(cookieStr: string, domain: string): Array<{ name: string; value: string; domain: string; path: string }> {
  try {
    // 尝试 JSON 格式
    const parsed = JSON.parse(cookieStr)
    if (Array.isArray(parsed)) {
      return parsed.map(c => ({ name: c.name, value: c.value, domain: c.domain || domain, path: c.path || '/' }))
    }
  } catch { /* 不是 JSON，按字符串解析 */ }

  return cookieStr.split(';').map(pair => {
    const [name, ...rest] = pair.trim().split('=')
    return {
      name: name.trim(),
      value: rest.join('=').trim(),
      domain,
      path: '/',
    }
  }).filter(c => c.name && c.value)
}

// ===== 小红书 Cookie 池 =====

interface XhsCookieEntry {
  /** 原始 Cookie 字符串 */
  raw: string
  /** 解析后的 Puppeteer Cookie 数组 */
  cookies: Array<{ name: string; value: string; domain: string; path: string }>
  /** 最后一次成功使用的时间戳 */
  lastUsed: number
  /** 连续失败次数（超过 3 次标记为过期） */
  failCount: number
  /** 是否已过期 */
  expired: boolean
}

class XhsCookiePool {
  private entries: XhsCookieEntry[] = []
  private currentIndex = 0

  constructor() {
    this.loadFromEnv()
  }

  /** 从环境变量加载 Cookie 池 */
  private loadFromEnv() {
    const envValue = process.env.XHS_COOKIE || ''
    if (!envValue) return

    // 支持多种分隔符：
    // 1. 逗号分隔多个 Cookie: "web_session=aaa,web_session=bbb"
    // 2. 管道分隔: "web_session=aaa|web_session=bbb"
    // 3. 换行分隔
    // 4. 单个 Cookie
    const rawCookies = envValue
      .split(/[|\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const raw of rawCookies) {
      const cookies = parseCookieString(raw, '.xiaohongshu.com')
      if (cookies.length > 0) {
        this.entries.push({ raw, cookies, lastUsed: 0, failCount: 0, expired: false })
      }
    }

    logger.info({ count: this.entries.length }, '[XhsCookiePool] Cookie 池已加载')
  }

  /** 获取下一个可用 Cookie（轮换 + 跳过过期） */
  getNext(): XhsCookieEntry | null {
    if (this.entries.length === 0) return null

    // 找到下一个未过期的 Cookie
    for (let i = 0; i < this.entries.length; i++) {
      const idx = (this.currentIndex + i) % this.entries.length
      const entry = this.entries[idx]
      if (!entry.expired) {
        this.currentIndex = (idx + 1) % this.entries.length
        entry.lastUsed = Date.now()
        return entry
      }
    }

    // 所有 Cookie 都过期了，重置并尝试第一个（可能已恢复）
    logger.warn('[XhsCookiePool] 所有 Cookie 已过期，重置尝试')
    for (const e of this.entries) {
      e.expired = false
      e.failCount = 0
    }
    this.currentIndex = 0
    return this.entries[0] || null
  }

  /** 标记当前 Cookie 使用成功 */
  markSuccess(entry: XhsCookieEntry) {
    entry.failCount = 0
    entry.expired = false
  }

  /** 标记当前 Cookie 使用失败（连续 3 次失败标记为过期） */
  markFailed(entry: XhsCookieEntry) {
    entry.failCount++
    if (entry.failCount >= 3) {
      entry.expired = true
      logger.warn({ failCount: entry.failCount, raw: entry.raw.substring(0, 30) }, '[XhsCookiePool] Cookie 已标记过期')
    }
  }

  /** 获取池状态摘要 */
  getStatus() {
    return {
      total: this.entries.length,
      active: this.entries.filter(e => !e.expired).length,
      expired: this.entries.filter(e => e.expired).length,
    }
  }
}

/** 小红书 Cookie 池单例 */
let xhsCookiePool: XhsCookiePool | null = null
function getXhsCookiePool(): XhsCookiePool {
  if (!xhsCookiePool) {
    xhsCookiePool = new XhsCookiePool()
  }
  return xhsCookiePool
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
    // 小红书 SPA 渲染很慢，桌面 UA + 长等待 + 选择真实笔记元素
    waitForSelector: '#detail-title, .note-content, [class*="noteContent"]',
    extraWaitMs: 8000,
    mobileUA: false,
    timeout: 60000,  // 加大到 60s，应对 goto 慢的情况
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

  // 小红书 URL 预处理：去掉过期的 xsec_token/xsec_source（会导致重定向到登录页）
  let normalizedUrl = url
  if (platformKey === 'youtube') normalizedUrl = normalizeYoutubeUrl(url)
  else if (platformKey === 'xiaohongshu') normalizedUrl = normalizeXiaohongshuUrl(url)

  // 4. 快速 API 通道（并行尝试）
  const fastResult = await tryFastChannels(normalizedUrl, platformKey, signal)

  // 4.1 如果快速通道已返回 title 但 coverImage 缺失，启动 Puppeteer 短超时补全
  // 这样能解决"添加页有标题无封面"的问题
  if (fastResult && fastResult.title && !fastResult.coverImage) {
    logger.debug({ url, platform: platformKey }, '[metadata] fast 通道缺封面，并行启动 Puppeteer 补全')

    // 并行：Puppeteer 补全（短超时 5s）+ 先返回快速通道结果
    const puppeteerPromise = fetchWithPuppeteer(normalizedUrl, platformKey, signal)
      .catch(() => null)
      .then((p) => {
        if (p?.coverImage) {
          // 写入 LRU 缓存供下次使用
          try { lruCache.set(url, { ...fastResult!, coverImage: p.coverImage }) } catch { /* ignore */ }
          logger.info({ url, platform: platformKey }, '[metadata] Puppeteer 补全封面成功（异步）')
        }
        return p
      })

    // 给 Puppeteer 3.5s 时间补全（不阻塞主流程）
    const enhanced = await Promise.race([
      puppeteerPromise,
      new Promise<null>((r) => setTimeout(() => r(null), 3500)),
    ])

    if (enhanced?.coverImage) {
      return finalizeMetadata(url, { ...fastResult, coverImage: enhanced.coverImage, description: fastResult.description || enhanced.description }, platformKey)
    }

    // 异步：即使超时也等 Puppeteer 完成（写入缓存）
    puppeteerPromise.catch(() => null).then((p) => {
      if (p?.coverImage) {
        logger.debug({ url }, '[metadata] 异步 Puppeteer 补全完成（已写入缓存）')
      }
    })

    return finalizeMetadata(url, fastResult, platformKey)
  }

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

  // 小红书 HTTP 直拉通道（绕过 Puppeteer 渲染和反爬）
  if (platformKey === 'xiaohongshu') {
    tasks.push(fetchXiaohongshuHttp(url, signal))
  }

  // 抖音 HTTP 直拉通道（公网内容，RENDER_DATA 解析）
  if (platformKey === 'douyin') {
    tasks.push(fetchDouyinHttp(url, signal))
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

  // 并行执行，合并所有通道的最佳字段（解决单一通道只返回 title 而无 coverImage 的问题）
  // - 任何单一通道命中立即返回快速结果（保留速度优势）
  // - 但后台继续运行其他 task，最多等 3 秒
  // - 合并阶段：取每个字段的最优值（title 取最完整，coverImage 取第一个有效值）

  // 阶段1：等第一个有效结果（保留速度），最多等 FAST_FIRST_HIT_MS
  const FAST_FIRST_HIT_MS = 2000
  const racePromise = Promise.allSettled(tasks).then((results) => {
    // 合并所有完成 task 的最优字段
    const merged = mergeFastChannelResults(results)
    return merged
  })
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), FAST_FIRST_HIT_MS))

  // 阶段1：fast path（立即返回）
  const quickResult = await Promise.race([
    racePromise,
    timeoutPromise.then(() => null),
  ])

  if (quickResult && (quickResult.title || quickResult.coverImage)) {
    return quickResult
  }

  // 阶段2：超时未命中，再等一会（最多再等 1.5s 补全）
  const extended = await Promise.race([
    racePromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
  ])

  if (extended && (extended.title || extended.coverImage)) {
    return extended
  }

  return null
}

/**
 * 合并所有快速通道结果的最优字段
 * - title: 取最长的（信息量最大）
 * - coverImage: 取第一个有效的
 * - description: 取第一个有效的
 * - favicon: 取第一个有效的
 */
function mergeFastChannelResults(
  results: PromiseSettledResult<UrlMetadata | null>[]
): UrlMetadata | null {
  let title: string | null = null
  let coverImage: string | null = null
  let favicon: string | null = null
  let description: string | null = null
  let hasAny = false

  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue
    const v = r.value
    if (v.title) {
      hasAny = true
      if (!title || v.title.length > title.length) {
        title = v.title
      }
    }
    if (v.coverImage) {
      hasAny = true
      if (!coverImage) coverImage = v.coverImage
    }
    if (v.description) {
      hasAny = true
      if (!description) description = v.description
    }
    if (v.favicon) {
      if (!favicon) favicon = v.favicon
    }
  }

  if (!hasAny) return null
  return { title, coverImage, favicon, description }
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
    if (platformKey === 'xiaohongshu') {
      // 小红书需要稳定的桌面 Chrome UA + 视口
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    } else if (strategy?.mobileUA) {
      await page.setUserAgent(MOBILE_USER_AGENT)
      await page.setViewport({ width: 375, height: 812, isMobile: true })
    }

    // 小红书 Cookie 注入（Cookie 池轮换，绕过服务器 IP 封锁）
    let xhsCookieEntry: XhsCookieEntry | null = null
    if (platformKey === 'xiaohongshu') {
      const cookiePool = getXhsCookiePool()
      xhsCookieEntry = cookiePool.getNext()
      if (xhsCookieEntry) {
        try {
          // 重要：Puppeteer 必须在有 URL context 时才能 setCookie 和读取 cookies
          // 先访问 xiaohongshu.com 根域建立 context
          await page.goto('https://www.xiaohongshu.com', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
          await new Promise(r => setTimeout(r, 800))

          // 使用 url 字段（更可靠，Puppeteer 内部转换 domain）
          const cookieObjs = xhsCookieEntry.cookies.map(c => {
            const cookieDomain = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain
            return {
              name: c.name,
              value: c.value,
              url: `https://${cookieDomain}`,
              path: c.path || '/',
              sameSite: 'Lax' as const,
            }
          })
          await page.setCookie(...cookieObjs)
          // 验证 cookie 已生效
          const allCookies = await page.cookies()
          const xhsCookies = allCookies.filter(c => c.domain.includes('xiaohongshu'))
          logger.info({ url, requested: cookieObjs.map(c => c.name), injected: xhsCookies.map(c => c.name) }, '[metadata] 小红书 Cookie 注入')
        } catch (e) {
          logger.warn({ url, err: (e as Error).message }, '[metadata] 小红书 Cookie 注入失败')
        }
      } else {
        logger.warn({ url }, '[metadata] 小红书 Cookie 池为空，将无登录态抓取')
      }
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
    let metadata = await extractMetadataFromPage(page, url, platformKey)

    // 小红书反爬检测：标题为"打开小红书"说明被重定向到登录页
    // 尝试用桌面端 UA 重新访问
    if (platformKey === 'xiaohongshu' && (!metadata.title || metadata.title === '打开小红书' || metadata.title === '小红书' || metadata.title === 'rednote' || metadata.title === '小红书 - 你的生活兴趣社区' || metadata.title === '小红书_沪ICP备')) {
      // 标记当前 Cookie 失败
      if (xhsCookieEntry) {
        const cookiePool = getXhsCookiePool()
        cookiePool.markFailed(xhsCookieEntry)
      }
      logger.info({ url, currentTitle: metadata.title, currentUrl: page.url() }, '[metadata] 小红书标题未就绪，重试')
      // 重新设置 Cookie（重试时有时 Cookie 会被新页面清掉）
      if (xhsCookieEntry) {
        try { await page.setCookie(...xhsCookieEntry.cookies) } catch { /* ignore */ }
      }
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      await page.setViewport({ width: 1440, height: 900 })
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
        // 等笔记标题或笔记内容出现
        try {
          await page.waitForSelector('#detail-title, .note-content, [class*="noteContent"]', { timeout: 12000 })
        } catch { /* ignore */ }
        await new Promise(resolve => setTimeout(resolve, 5000))
        metadata = await extractMetadataFromPage(page, url, platformKey)
      } catch (e) {
        logger.warn({ url, err: (e as Error).message }, '[metadata] 小红书重试失败')
      }
    }

    // 小红书抓取成功，标记 Cookie 成功
    if (platformKey === 'xiaohongshu' && xhsCookieEntry && metadata.title && metadata.title !== '打开小红书' && metadata.title !== '小红书' && metadata.title !== 'rednote') {
      const cookiePool = getXhsCookiePool()
      cookiePool.markSuccess(xhsCookieEntry)
    }

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

      // 6.5 小红书专用 title 提取（小红书不输出 og:title，靠真实 DOM）
      if (pk === 'xiaohongshu') {
        // 清理 document.title 的尾巴 " - 小红书" / " - REDnote"
        if (result.title) {
          result.title = result.title.replace(/\s*[-–—|]\s*(小红书|REDnote|rednote|你的生活兴趣社区)\s*$/i, '').trim()
        }
        // 从笔记详情区找标题
        if (!result.title || result.title === '小红书' || result.title === 'rednote') {
          const titleEl = document.querySelector(
            '#detail-title, .note-content .title, [class*="noteDetail"] [class*="title"], ' +
            '[class*="noteContent"] [class*="title"], [class*="note-detail"] [class*="title"]'
          )
          if (titleEl && titleEl.textContent) {
            result.title = titleEl.textContent.trim()
          }
        }
        // 从笔记详情区找描述
        if (!result.description) {
          const descEl = document.querySelector(
            '#detail-desc, .note-content .desc, .desc, [class*="noteContent"] [class*="desc"], ' +
            '[class*="note-detail"] [class*="desc"]'
          )
          if (descEl && descEl.textContent) {
            result.description = descEl.textContent.trim().substring(0, 300)
          }
        }
        // 备选：从 meta description 提取
        if (!result.description) {
          const md = document.querySelector('meta[name="description"]')
          if (md) result.description = md.getAttribute('content')?.substring(0, 300) || null
        }
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
        // 抖音专用提取策略（按优先级）
        // 1. video poster（最直接）
        if (!result.coverImage) {
          const video = document.querySelector('video')
          if (video?.poster && video.poster.startsWith('http')) {
            result.coverImage = video.poster
          }
        }
        // 2. 从 SSR 数据提取（RENDER_DATA / _SSR_HYDRATED_DATA / __INITIAL_STATE__）
        if (!result.title || !result.coverImage) {
          try {
            // 尝试 window._SSR_HYDRATED_DATA
            const ssrData = window._SSR_HYDRATED_DATA
            if (ssrData?.app) {
              const app = ssrData.app
              const videoList = app.videoList || app.itemList || []
              const item = videoList[0]
              if (!result.title && item?.title) result.title = item.title
              if (!result.title && item?.desc) result.title = item.desc
              if (!result.coverImage && item?.cover) result.coverImage = item.cover
              if (!result.coverImage && item?.originCover) result.coverImage = item.originCover
            }
          } catch { /* 忽略 */ }
        }
        // 3. 从 script 标签提取 RENDER_DATA（抖音新版 SSR）
        if (!result.title || !result.coverImage) {
          try {
            const scripts = document.querySelectorAll('script')
            for (const s of scripts) {
              const text = s.textContent || ''
              const rdIdx = text.indexOf('RENDER_DATA')
              if (rdIdx === -1) continue
              const eqIdx = text.indexOf('=', rdIdx)
              if (eqIdx === -1) continue
              // RENDER_DATA 通常是 URL 编码的 JSON
              const valStart = text.indexOf('"', eqIdx) + 1
              const valEnd = text.indexOf('"', valStart)
              if (valStart === 0 || valEnd === -1) continue
              const encoded = text.substring(valStart, valEnd)
              const decoded = decodeURIComponent(encoded)
              const data = JSON.parse(decoded)
              // 数据结构: data.app.videoDetail 或 data.app.awemeDetail
              const detail = data?.app?.videoDetail || data?.app?.awemeDetail || data?.awemeDetail
              if (detail) {
                if (!result.title && detail.desc) result.title = detail.desc.substring(0, 100)
                if (!result.coverImage && detail.cover?.urlList?.[0]) result.coverImage = detail.cover.urlList[0]
                if (!result.coverImage && detail.video?.cover?.urlList?.[0]) result.coverImage = detail.video.cover.urlList[0]
                if (!result.coverImage && detail.video?.poster) result.coverImage = detail.video.poster
              }
              break
            }
          } catch { /* 忽略 */ }
        }
      }

      if (pk === 'xiaohongshu') {
        // 小红书专用提取策略（按优先级）
        // 1. 从 __INITIAL_STATE__ 提取（最可靠，SPA 注入的完整数据）
        if (!result.coverImage || !result.title || result.title === '小红书' || result.title === 'rednote') {
          try {
            const scripts = document.querySelectorAll('script')
            for (const s of scripts) {
              const text = s.textContent || ''
              const stateIdx = text.indexOf('__INITIAL_STATE__')
              if (stateIdx === -1) continue
              // 找到 = 后面的 JSON 起始位置
              const eqIdx = text.indexOf('=', stateIdx)
              if (eqIdx === -1) continue
              const jsonStart = text.indexOf('{', eqIdx)
              if (jsonStart === -1) continue
              // 从 { 开始匹配到对应的 } （简单括号计数）
              let depth = 0
              let jsonEnd = -1
              for (let i = jsonStart; i < text.length; i++) {
                if (text[i] === '{') depth++
                else if (text[i] === '}') {
                  depth--
                  if (depth === 0) { jsonEnd = i + 1; break }
                }
              }
              if (jsonEnd === -1) continue
              const jsonStr = text.substring(jsonStart, jsonEnd)
              const state = JSON.parse(jsonStr)
              // 笔记详情数据在 note.noteDetailMap 或 noteDetail
              const noteMap = state?.note?.noteDetailMap || state?.noteDetail || {}
              const noteKey = Object.keys(noteMap)[0]
              const noteData = noteMap[noteKey]?.note || noteMap[noteKey]
              if (noteData) {
                // 标题
                if (!result.title || result.title === '小红书' || result.title === 'rednote') {
                  result.title = noteData.title || noteData.desc?.substring(0, 50) || null
                }
                // 封面图
                if (!result.coverImage) {
                  const cover = noteData.imageList?.[0]?.urlDefault
                    || noteData.imageList?.[0]?.url
                    || noteData.video?.cover?.urlList?.[0]
                    || noteData.video?.cover?.url
                    || noteData.emoji?.icon
                  if (cover) {
                    result.coverImage = cover.startsWith('http') ? cover : 'https:' + cover
                  }
                }
                // 描述
                if (!result.description && noteData.desc) {
                  result.description = noteData.desc.substring(0, 200)
                }
              }
              break
            }
          } catch { /* 忽略 JSON 解析失败 */ }
        }

        // 2. 从 DOM 查找笔记图片（og:image 无效时的补充）
        if (!result.coverImage) {
          // 笔记详情页的图片轮播
          const slideImg = document.querySelector('.swiper-slide img, [class*="slide-item"] img, [class*="carousel"] img')
          if (slideImg) {
            const src = slideImg.getAttribute('src') || slideImg.getAttribute('data-src')
            if (src && src.startsWith('http') && src.includes('xhscdn')) {
              result.coverImage = src
            }
          }
        }

        // 3. 从笔记内容区查找（小红书真实笔记的 DOM 结构）
        if (!result.coverImage) {
          const noteImg = document.querySelector(
            '#noteContainer img, .note-content img, [class*="note-detail"] img, [class*="note-card"] img, ' +
            '[class*="noteDetail"] img, [class*="noteContent"] img, [class*="NoteContent"] img'
          )
          if (noteImg) {
            const src = noteImg.getAttribute('src') || noteImg.getAttribute('data-src')
            if (src && src.startsWith('http') && src.includes('xhscdn')) {
              result.coverImage = src
            }
          }
        }

        // 3.5 从笔记详情区找最大尺寸的 xhscdn 图片（兜底）
        if (!result.coverImage) {
          const imgs = Array.from(document.querySelectorAll('img'))
            .filter(i => {
              const s = i.getAttribute('src') || ''
              return s.startsWith('http') && s.includes('xhscdn') &&
                     !s.includes('avatar') && !s.includes('comment/')
            })
            .sort((a, b) => {
              const wa = a.naturalWidth || a.width || 0
              const wb = b.naturalWidth || b.width || 0
              return wb - wa
            })
          if (imgs.length > 0) {
            const top = imgs[0]
            const src = top.getAttribute('src')
            if (src) result.coverImage = src
          }
        }

        // 4. video poster
        if (!result.coverImage) {
          const video = document.querySelector('video')
          if (video?.poster && video.poster.startsWith('http')) {
            result.coverImage = video.poster
          }
        }

        // 5. 验证 og:image 是否有效（过滤空 CDN 地址）
        if (result.coverImage) {
          try {
            const url = new URL(result.coverImage)
            if (url.hostname.includes('xiaohongshu.com') && (!url.pathname || url.pathname === '/' || url.pathname === '')) {
              result.coverImage = null
            }
          } catch { /* 忽略 */ }
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

/**
 * 小红书 HTTP 直拉通道
 * 关键：国内服务器 IP 已被风控，Puppeteer 访问直接被重定向到 captcha/404
 * 改用普通 HTTP 请求 + 解析 __INITIAL_STATE__ 提取笔记元数据
 * 注意：必须带 Cookie 模拟登录态（否则拿不到真实笔记数据）
 */
async function fetchXiaohongshuHttp(url: string, signal?: AbortSignal): Promise<UrlMetadata | null> {
  const cookiePool = getXhsCookiePool()
  const cookieEntry = cookiePool.getNext()
  if (!cookieEntry) {
    logger.debug({ url }, '[metadata] 小红书 HTTP 直拉：无 Cookie 池配置')
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    // 构造 Cookie 字符串
    const cookieHeader = cookieEntry.cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const response = await fetch(url, {
      headers: {
        'User-Agent': DESKTOP_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cookie': cookieHeader,
        'Referer': 'https://www.xiaohongshu.com/',
        'sec-ch-ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    if (!response.ok) {
      logger.warn({ url, status: response.status }, '[metadata] 小红书 HTTP 直拉失败')
      cookiePool.markFailed(cookieEntry)
      return null
    }

    const html = await response.text()

    // 验证是否被重定向到验证页
    if (html.includes('website-login/captcha') || html.includes('Security Verification')) {
      logger.warn({ url }, '[metadata] 小红书 HTTP 直拉被风控（验证页）')
      cookiePool.markFailed(cookieEntry)
      return null
    }

    // 解析 <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    let title = titleMatch ? titleMatch[1].trim() : null
    if (title) {
      // 清理尾巴 " - 小红书" / " - REDnote"
      title = title.replace(/\s*[-–—|]\s*(小红书|REDnote|rednote|你的生活兴趣社区)\s*$/i, '').trim()
    }

    // 笔记不可访问（删除/风控/Token失效）—返回空让平台降级
    if (title === '你访问的页面不见了' || title === '小红书 - 你访问的页面不见了' || html.includes('error_code=300031')) {
      logger.info({ url }, '[metadata] 小红书笔记不可访问（404/已删除）')
      cookiePool.markFailed(cookieEntry)
      return null
    }

    // 解析 __INITIAL_STATE__
    const stateIdx = html.indexOf('__INITIAL_STATE__')
    let coverImage: string | null = null
    let description: string | null = null

    if (stateIdx !== -1) {
      const eqIdx = html.indexOf('=', stateIdx)
      if (eqIdx !== -1) {
        const jsonStart = html.indexOf('{', eqIdx)
        if (jsonStart !== -1) {
          // 简单括号匹配找到 JSON 结束位置
          let depth = 0
          let jsonEnd = -1
          for (let i = jsonStart; i < html.length && i < jsonStart + 2_000_000; i++) {
            if (html[i] === '{') depth++
            else if (html[i] === '}') {
              depth--
              if (depth === 0) { jsonEnd = i + 1; break }
            }
          }
          if (jsonEnd !== -1) {
            try {
              // 小红书 INITIAL_STATE 含有 undefined 字段，JSON 解析会失败
              // 先把 :undefined 替换为 :null，再做 JSON.parse
              let jsonStr = html.substring(jsonStart, jsonEnd)
              jsonStr = jsonStr.replace(/:undefined/g, ':null')
              const state = JSON.parse(jsonStr) as Record<string, unknown>
              // 笔记数据通常在 state.note.noteDetailMap[noteId].note
              const note = (state as any)?.note
              const noteMap = note?.noteDetailMap || note?.noteDetail
              if (noteMap && typeof noteMap === 'object') {
                const noteKey = Object.keys(noteMap)[0]
                const noteData = noteMap[noteKey]?.note || noteMap[noteKey]
                if (noteData) {
                  if (!title || title === '小红书' || title === 'rednote') {
                    title = noteData.title || noteData.desc?.substring(0, 50) || null
                  }
                  const cover = noteData.imageList?.[0]?.urlDefault
                    || noteData.imageList?.[0]?.urlPre
                    || noteData.imageList?.[0]?.url
                    || noteData.video?.cover?.urlList?.[0]
                    || noteData.video?.cover?.url
                  if (cover) {
                    coverImage = cover.startsWith('http') ? cover : 'https:' + cover
                  }
                  if (!description && noteData.desc) {
                    description = String(noteData.desc).substring(0, 200)
                  }
                }
              }
            } catch { /* JSON 解析失败忽略 */ }
          }
        }
      }
    }

    // 兜底：从 og:image 提取
    if (!coverImage) {
      const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)
      if (ogMatch) {
        const img = ogMatch[1]
        if (img && img.startsWith('http') && isValidCoverUrl(img)) {
          coverImage = img
        }
      }
    }

    // 兜底：从 HTML 找 xhscdn 图片（必须是 sns-webpic/sns-avatar/fe-platform 域名，且不是 .js）
    if (!coverImage) {
      const imgMatch = html.match(/https?:\/\/sns-(webpic|avatar)-[a-z]+\.xhscdn\.com\/[^\s"']+\.(jpg|jpeg|png|webp)[^\s"']*/i)
        || html.match(/https?:\/\/fe-platform\.xhscdn\.com\/[^\s"']+\.(jpg|jpeg|png|webp)[^\s"']*/i)
      if (imgMatch) {
        coverImage = imgMatch[0]
      }
    }

    if (title || coverImage) {
      cookiePool.markSuccess(cookieEntry)
      logger.info({ url, title, hasCover: !!coverImage }, '[metadata] 小红书 HTTP 直拉成功')
      return {
        title,
        coverImage,
        favicon: 'https://www.xiaohongshu.com/favicon.ico',
        description,
      }
    }

    return null
  } catch (err) {
    logger.debug({ url, err: (err as Error).message }, '[metadata] 小红书 HTTP 直拉异常')
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 抖音 HTTP 直拉通道（备份）
 * - 公网内容，无需 Cookie
 * - 解析 HTML 中的 RENDER_DATA（URL 编码的 JSON）
 * - 数据结构: data.app.videoDetail / data.app.awemeDetail
 * - 兜底: og:image / og:title
 */
async function fetchDouyinHttp(url: string, signal?: AbortSignal): Promise<UrlMetadata | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    // 抖音桌面端走移动端 UA 成功率更高（PC 端经常有挑战）
    const response = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.douyin.com/',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    if (!response.ok) {
      logger.debug({ url, status: response.status }, '[metadata] 抖音 HTTP 直拉失败')
      return null
    }

    const finalUrl = response.url || url
    const html = await response.text()

    // 验证页 / 短链跳转失败兜底
    if (html.includes('Security Verification') || html.includes('人机验证')) {
      logger.debug({ url }, '[metadata] 抖音 HTTP 直拉被风控（验证页）')
      return null
    }

    // 1. 解析 <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    let title: string | null = titleMatch ? titleMatch[1].trim() : null
    if (title) {
      // 清理尾巴 " - 抖音" / " - Douyin"
      title = title.replace(/\s*[-–—|]\s*(抖音|Douyin|douyin)\s*$/i, '').trim()
    }

    let coverImage: string | null = null
    let description: string | null = null

    // 2. 解析 RENDER_DATA script（抖音桌面端主要数据源）
    try {
      const scripts = html.match(/<script[^>]*>[^<]*RENDER_DATA[^<]*<\/script>/gi) || []
      for (const tag of scripts) {
        const eqIdx = tag.indexOf('RENDER_DATA')
        if (eqIdx === -1) continue
        const afterEq = tag.indexOf('=', eqIdx)
        if (afterEq === -1) continue
        // 取两个引号之间的内容
        const q1 = tag.indexOf('"', afterEq)
        if (q1 === -1) continue
        const q2 = tag.indexOf('"', q1 + 1)
        if (q2 === -1) continue
        const encoded = tag.substring(q1 + 1, q2)
        const decoded = decodeURIComponent(encoded)
        const data = JSON.parse(decoded)
        const detail = data?.app?.videoDetail || data?.app?.awemeDetail || data?.awemeDetail || data?.app?.itemList?.[0]
        if (detail) {
          if (!title && detail.desc) title = String(detail.desc).substring(0, 100)
          if (!description && detail.desc) description = String(detail.desc).substring(0, 200)
          if (!coverImage) {
            coverImage = detail.cover?.urlList?.[0]
              || detail.video?.cover?.urlList?.[0]
              || detail.video?.poster
              || detail.originCover?.urlList?.[0]
              || detail.dynamicCover?.urlList?.[0]
          }
        }
        if (coverImage) break
      }
    } catch { /* 解析失败忽略 */ }

    // 3. 兜底：og:image
    if (!coverImage) {
      const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)
      if (ogMatch) {
        const img = ogMatch[1]
        if (img && img.startsWith('http') && isValidCoverUrl(img)) {
          coverImage = img
        }
      }
    }

    // 4. 兜底：og:title / og:description
    if (!title) {
      const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i)
      if (ogTitle) title = ogTitle[1].trim()
    }
    if (!description) {
      const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i)
      if (ogDesc) description = ogDesc[1].trim().substring(0, 200)
    }

    if (title || coverImage) {
      logger.info(
        { url, finalUrl, title, hasCover: !!coverImage },
        '[metadata] 抖音 HTTP 直拉成功'
      )
      return {
        title,
        coverImage,
        favicon: 'https://www.douyin.com/favicon.ico',
        description,
      }
    }

    return null
  } catch (err) {
    logger.debug({ url, err: (err as Error).message }, '[metadata] 抖音 HTTP 直拉异常')
    return null
  } finally {
    clearTimeout(timeout)
  }
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
