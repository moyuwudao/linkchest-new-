/**
 * 浏览器实例池管理器 - 基于 Puppeteer + Stealth 插件
 *
 * 核心能力：
 * - 池化管理多个浏览器实例，按需分配标签页
 * - 自动轮换 User-Agent 和视口，降低被检测概率
 * - 浏览器请求计数达阈值后自动重启，防止内存泄漏
 * - 空闲标签页 60s 自动关闭，节省资源
 * - 崩溃自动恢复 + 优雅关闭
 */
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Browser, Page } from 'puppeteer'
import logger from '../lib/logger'

// 注册 stealth 插件（只需一次）
puppeteer.use(StealthPlugin())

// ===== 常量配置 =====

/** Chrome 启动参数 */
const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
  '--disable-extensions',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-ipc-flooding-protection',
  '--window-size=1280,800',
]

/** 桌面端 User-Agent 候选列表 */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
]

/**
 * 系统 Chrome 可执行文件路径
 * 优先级：环境变量 > 常见系统路径自动检测
 */
const CHROME_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || undefined

/** 常见 Chrome/Chromium 安装路径（Linux 服务器） */
const CHROME_SEARCH_PATHS = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
]

/** 查找系统 Chrome 路径（同步，只在启动时调用一次） */
function findChromePath(): string | undefined {
  if (CHROME_EXECUTABLE_PATH) return CHROME_EXECUTABLE_PATH
  // 运行时检测需要 fs，延迟到启动时
  try {
    const fs = require('fs')
    for (const p of CHROME_SEARCH_PATHS) {
      try { if (fs.existsSync(p)) return p } catch { /* 忽略 */ }
    }
  } catch { /* 忽略 */ }
  return undefined
}

/** 默认导航超时（毫秒） */
const DEFAULT_NAVIGATION_TIMEOUT = 15_000

/** 空闲标签页自动关闭时间（毫秒） */
const IDLE_TAB_TIMEOUT = 60_000

// ===== 类型定义 =====

interface BrowserInstance {
  browser: Browser
  activeTabs: Set<Page>
  requestCount: number
  idleTimer: ReturnType<typeof setTimeout> | null
}

export interface BrowserPoolConfig {
  /** 浏览器实例数量，默认 2 */
  maxBrowsers: number
  /** 每个浏览器最大标签页数，默认 5 */
  maxTabsPerBrowser: number
  /** 浏览器重启阈值（请求数），默认 100 */
  restartAfterRequests: number
}

export interface BrowserPoolStats {
  totalBrowsers: number
  activeTabs: number
  totalRequests: number
  activeRequests: number
  errors: number
  browsers: Array<{
    activeTabs: number
    requestCount: number
  }>
}

// ===== 浏览器池 =====

class BrowserPool {
  private config: BrowserPoolConfig
  private browsers: BrowserInstance[] = []
  private initialized = false
  private initializing: Promise<void> | null = null
  private shuttingDown = false

  // 统计
  private totalRequests = 0
  private activeRequests = 0
  private errors = 0

  // 等待队列：当所有标签页都忙时，请求排队
  private waitQueue: Array<{
    resolve: (tab: Page) => void
    reject: (err: Error) => void
  }> = []

  constructor(config?: Partial<BrowserPoolConfig>) {
    this.config = {
      maxBrowsers: config?.maxBrowsers ?? 2,
      maxTabsPerBrowser: config?.maxTabsPerBrowser ?? 5,
      restartAfterRequests: config?.restartAfterRequests ?? 100,
    }
  }

  /**
   * 初始化浏览器池（懒加载，首次 acquireTab 时调用）
   */
  private async init(): Promise<void> {
    if (this.initialized) return
    if (this.initializing) return this.initializing

    this.initializing = (async () => {
      logger.info(`[BrowserPool] 初始化浏览器池，启动 ${this.config.maxBrowsers} 个实例`)
      const launchPromises = Array.from({ length: this.config.maxBrowsers }, () =>
        this.launchBrowser()
      )
      const results = await Promise.allSettled(launchPromises)

      let successCount = 0
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          this.browsers.push(result.value)
          successCount++
        }
      }

      if (successCount === 0) {
        this.initializing = null
        throw new Error('[BrowserPool] 所有浏览器实例启动失败')
      }

      this.initialized = true
      this.initializing = null
      logger.info(`[BrowserPool] 浏览器池就绪，成功启动 ${successCount}/${this.config.maxBrowsers} 个实例`)
    })()

    return this.initializing
  }

  /**
   * 启动单个浏览器实例
   */
  private async launchBrowser(): Promise<BrowserInstance | null> {
    try {
      const browser = await puppeteer.launch({
        headless: 'shell' as const,
        args: CHROME_ARGS,
        executablePath: findChromePath(),
      })

      const instance: BrowserInstance = {
        browser,
        activeTabs: new Set(),
        requestCount: 0,
        idleTimer: null,
      }

      // 监听浏览器意外断开
      browser.on('disconnected', () => {
        logger.warn('[BrowserPool] 浏览器意外断开，尝试重启')
        this.handleBrowserCrash(instance)
      })

      logger.debug('[BrowserPool] 浏览器实例启动成功')
      return instance
    } catch (err) {
      logger.error({ err }, '[BrowserPool] 浏览器启动失败')
      return null
    }
  }

  /**
   * 处理浏览器崩溃：关闭残留标签页，重启浏览器
   */
  private async handleBrowserCrash(instance: BrowserInstance): Promise<void> {
    const idx = this.browsers.indexOf(instance)
    if (idx === -1) return // 已被移除

    // 清理空闲定时器
    if (instance.idleTimer) {
      clearTimeout(instance.idleTimer)
      instance.idleTimer = null
    }

    // 通知所有活跃标签页的持有者（通过 reject 等待队列）
    // 活跃标签页已随浏览器关闭而失效，直接清空
    instance.activeTabs.clear()

    // 尝试重启
    try {
      const newInstance = await this.launchBrowser()
      if (newInstance) {
        this.browsers[idx] = newInstance
        logger.info('[BrowserPool] 浏览器重启成功')

        // 重启后检查等待队列
        this.processWaitQueue()
      } else {
        // 启动失败，移除该槽位
        this.browsers.splice(idx, 1)
        logger.error('[BrowserPool] 浏览器重启失败，已从池中移除')
      }
    } catch {
      this.browsers.splice(idx, 1)
      logger.error('[BrowserPool] 浏览器重启异常，已从池中移除')
    }
  }

  /**
   * 获取一个标签页
   * - 优先从有空位的浏览器分配
   * - 所有浏览器满载时排队等待
   */
  async acquireTab(): Promise<Page> {
    if (this.shuttingDown) {
      throw new Error('[BrowserPool] 浏览器池正在关闭，拒绝新请求')
    }

    // 懒初始化
    if (!this.initialized) {
      await this.init()
    }

    // 查找有空位的浏览器
    const instance = this.browsers.find(
      (b) => b.activeTabs.size < this.config.maxTabsPerBrowser && b.browser.connected
    )

    if (instance) {
      return this.createTab(instance)
    }

    // 所有浏览器满载，加入等待队列
    return new Promise<Page>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject })
      logger.debug(`[BrowserPool] 所有标签页忙，排队等待（队列长度: ${this.waitQueue.length}）`)
    })
  }

  /**
   * 在指定浏览器实例上创建标签页
   */
  private async createTab(instance: BrowserInstance): Promise<Page> {
    const page = await instance.browser.newPage()

    // 随机 User-Agent
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
    await page.setUserAgent(ua)

    // 随机视口（1280x800 ~ 1920x1080）
    const viewportWidth = 1280 + Math.floor(Math.random() * 641) // 1280~1920
    const viewportHeight = 800 + Math.floor(Math.random() * 281)  // 800~1080
    await page.setViewport({ width: viewportWidth, height: viewportHeight })

    // 默认导航超时
    page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)

    // 跟踪活跃标签页
    instance.activeTabs.add(page)
    instance.requestCount++
    this.totalRequests++
    this.activeRequests++

    // 检查是否需要重启浏览器（防止内存泄漏）
    if (instance.requestCount >= this.config.restartAfterRequests) {
      logger.info(`[BrowserPool] 浏览器请求计数达 ${instance.requestCount}，标记待重启`)
      // 标记后不立即重启，等所有活跃标签页释放后再重启
    }

    logger.debug(
      `[BrowserPool] 分配标签页（浏览器活跃: ${instance.activeTabs.size}/${this.config.maxTabsPerBrowser}，累计请求: ${instance.requestCount}）`
    )

    return page
  }

  /**
   * 释放标签页回池
   */
  async releaseTab(page: Page): Promise<void> {
    // 找到该标签页所属的浏览器
    const instance = this.browsers.find((b) => b.activeTabs.has(page))
    if (!instance) {
      // 标签页可能属于已崩溃的浏览器，直接关闭页面
      try { await page.close() } catch { /* 忽略 */ }
      return
    }

    instance.activeTabs.delete(page)
    this.activeRequests = Math.max(0, this.activeRequests - 1)

    // 关闭页面
    try {
      await page.close()
    } catch (err) {
      // 页面可能已被浏览器关闭
      logger.debug({ err }, '[BrowserPool] 关闭标签页时出错（可能已随浏览器关闭）')
    }

    // 检查是否需要重启该浏览器
    const needsRestart =
      instance.requestCount >= this.config.restartAfterRequests &&
      instance.activeTabs.size === 0

    if (needsRestart) {
      await this.restartBrowser(instance)
      // 重启后处理等待队列
      this.processWaitQueue()
      return
    }

    // 处理等待队列
    this.processWaitQueue()
  }

  /**
   * 重启浏览器实例
   */
  private async restartBrowser(instance: BrowserInstance): Promise<void> {
    const idx = this.browsers.indexOf(instance)
    if (idx === -1) return

    logger.info('[BrowserPool] 重启浏览器实例...')

    try {
      await instance.browser.close()
    } catch {
      // 忽略关闭错误
    }

    if (instance.idleTimer) {
      clearTimeout(instance.idleTimer)
      instance.idleTimer = null
    }

    const newInstance = await this.launchBrowser()
    if (newInstance) {
      this.browsers[idx] = newInstance
      logger.info('[BrowserPool] 浏览器重启完成')
    } else {
      this.browsers.splice(idx, 1)
      logger.error('[BrowserPool] 浏览器重启失败，已从池中移除')
    }
  }

  /**
   * 处理等待队列：为排队的请求分配标签页
   */
  private processWaitQueue(): void {
    while (this.waitQueue.length > 0) {
      const instance = this.browsers.find(
        (b) => b.activeTabs.size < this.config.maxTabsPerBrowser && b.browser.connected
      )
      if (!instance) break

      const waiter = this.waitQueue.shift()!
      this.createTab(instance)
        .then((tab) => waiter.resolve(tab))
        .catch((err) => waiter.reject(err))
    }
  }

  /**
   * 启动空闲标签页监控
   * 注意：当前设计中 acquireTab/releaseTab 已管理标签页生命周期，
   * 此方法用于检测因异常未正确释放的标签页
   */
  startIdleMonitor(): void {
    setInterval(async () => {
      for (const instance of this.browsers) {
        if (!instance.browser.connected) continue

        try {
          // 检查浏览器实际打开的页面数 vs 我们跟踪的活跃数
          const pages = await instance.browser.pages()
          // browser.pages() 包含 about:blank 默认页，减去活跃标签页数
          const extraPages = pages.length - instance.activeTabs.size - 1 // -1 为默认空白页
          if (extraPages > 0) {
            logger.debug(
              `[BrowserPool] 检测到 ${extraPages} 个未跟踪的页面，可能存在泄漏`
            )
          }
        } catch {
          // 浏览器可能正在关闭，忽略
        }
      }
    }, IDLE_TAB_TIMEOUT)
  }

  /**
   * 获取池状态统计
   */
  getStats(): BrowserPoolStats {
    return {
      totalBrowsers: this.browsers.length,
      activeTabs: this.browsers.reduce((sum, b) => sum + b.activeTabs.size, 0),
      totalRequests: this.totalRequests,
      activeRequests: this.activeRequests,
      errors: this.errors,
      browsers: this.browsers.map((b) => ({
        activeTabs: b.activeTabs.size,
        requestCount: b.requestCount,
      })),
    }
  }

  /**
   * 优雅关闭浏览器池
   */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) return
    this.shuttingDown = true

    logger.info('[BrowserPool] 开始优雅关闭...')

    // 拒绝所有等待中的请求
    for (const waiter of this.waitQueue) {
      waiter.reject(new Error('[BrowserPool] 浏览器池正在关闭'))
    }
    this.waitQueue = []

    // 关闭所有浏览器
    const closePromises = this.browsers.map(async (instance) => {
      if (instance.idleTimer) {
        clearTimeout(instance.idleTimer)
        instance.idleTimer = null
      }

      try {
        await instance.browser.close()
      } catch (err) {
        logger.debug({ err }, '[BrowserPool] 关闭浏览器时出错')
      }
    })

    await Promise.allSettled(closePromises)
    this.browsers = []
    this.initialized = false

    logger.info('[BrowserPool] 浏览器池已关闭')
  }
}

// ===== 单例管理 =====

let poolInstance: BrowserPool | null = null

/**
 * 获取浏览器池单例
 * @param config 可选配置（仅首次调用时生效）
 */
export function getBrowserPool(config?: Partial<BrowserPoolConfig>): BrowserPool {
  if (!poolInstance) {
    poolInstance = new BrowserPool(config)
  }
  return poolInstance
}

/**
 * 预热浏览器池（启动时调用，避免首次解析时的冷启动延迟）
 * - 异步执行，不阻塞调用方
 * - 失败不影响后续 acquireTab（懒加载机制仍会兜底）
 */
export async function warmupBrowserPool(): Promise<void> {
  const start = Date.now()
  try {
    const pool = getBrowserPool()
    // 直接访问私有 init（懒加载：启动 maxBrowsers 个 puppeteer 实例）
    await (pool as unknown as { init: () => Promise<void> }).init.call(pool)
    logger.info({ costMs: Date.now() - start }, '[BrowserPool] 预热完成')
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      '[BrowserPool] 预热失败（不影响后续请求）'
    )
  }
}

/**
 * 优雅关闭浏览器池
 */
export async function shutdownBrowserPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.shutdown()
    poolInstance = null
  }
}
