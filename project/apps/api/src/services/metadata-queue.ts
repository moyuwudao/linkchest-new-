import pLimit from 'p-limit'
import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { fetchUrlMetadata } from './metadata'
import { getRedisClient, isRedisAvailable, recordRedisFailure } from '../lib/redis'
import { METADATA_MAX_CONCURRENT } from '../lib/constants'
import logger from '../lib/logger'

// 最大并发：国内 5，海外默认 3（可通过 env METADATA_MAX_CONCURRENT 调整）
const limit = pLimit(METADATA_MAX_CONCURRENT)

// Redis key 前缀
const QUEUE_KEY = 'lc:metadata:queue'
const RETRY_KEY = 'lc:metadata:retry'
const PROCESSING_KEY = 'lc:metadata:processing'
const DLQ_KEY = 'lc:metadata:dlq'
const DEDUP_KEY = 'lc:metadata:dedup'
const DEDUP_TTL_SECONDS = 300 // 5 分钟内相同 URL 去重
const RETRY_DELAY_MS = 5 * 60 * 1000 // 失败后 5 分钟重试（反爬平台常先返回空再放行）
const MAX_RETRIES = 3

export interface MetadataQueueItem {
  collectionId: string
  url: string
  userId: string
  retryCount?: number
}

// 内存降级：Redis 不可用时使用
const memoryQueue: MetadataQueueItem[] = []
const memoryProcessing = new Set<string>()
const memoryDedup = new Set<string>()

/**
 * 生成去重 key
 */
function dedupKey(item: MetadataQueueItem): string {
  return `${item.userId}:${item.url}`
}

/**
 * 判断标题是否是占位符（前端用 URL 兜底的情况）
 * 规则：长度 >= 20 且以 http:// 或 https:// 开头
 */
function isTitlePlaceholder(title: string): boolean {
  if (!title) return true
  const trimmed = title.trim()
  if (trimmed.length < 20) return false
  return /^https?:\/\//i.test(trimmed)
}

/**
 * 将元数据抓取任务入队，异步执行，不阻塞 HTTP 响应
 * - Redis 可用时：持久化到 Redis List
 * - Redis 不可用时：降级到内存队列
 */
export async function enqueueMetadataFetch(item: MetadataQueueItem): Promise<void> {
  const key = dedupKey(item)

  if (isRedisAvailable()) {
    const redis = getRedisClient()
    if (redis) {
      try {
        // 去重检查（5分钟窗口）
        const exists = await redis.get(`${DEDUP_KEY}:${key}`)
        if (exists) {
          logger.debug({ url: item.url }, '[MetadataQueue] 跳过重复任务')
          return
        }

        // 设置去重标记
        await redis.setex(`${DEDUP_KEY}:${key}`, DEDUP_TTL_SECONDS, '1')

        // LPUSH 入队（高性能，O(1)）
        await redis.lpush(QUEUE_KEY, JSON.stringify({ ...item, retryCount: 0 }))
        logger.debug({ url: item.url }, '[MetadataQueue] 任务已入队（Redis）')
        return
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err), url: item.url }, '[MetadataQueue] Redis 入队失败，降级到内存队列')
      }
    }
  }

  // 内存降级
  if (memoryDedup.has(key)) {
    logger.debug({ url: item.url }, '[MetadataQueue] 跳过重复任务（内存）')
    return
  }
  memoryDedup.add(key)
  memoryQueue.push({ ...item, retryCount: 0 })
  logger.debug({ url: item.url }, '[MetadataQueue] 任务已入队（内存）')
}

/**
 * 消费单条任务
 */
async function processItem(item: MetadataQueueItem): Promise<void> {
  const key = dedupKey(item)

  try {
    logger.debug({ url: item.url, retry: item.retryCount || 0 }, '[MetadataQueue] 开始抓取')
    const metadata = await fetchUrlMetadata(item.url)

    // 无有效数据，加入"5 分钟重试队列"（反爬平台常先返回空再放行）
    if (!metadata.title && !metadata.coverImage) {
      if (isRedisAvailable()) {
        const redis = getRedisClient()
        if (redis) {
          try {
            const score = Date.now() + RETRY_DELAY_MS
            await redis.zadd(RETRY_KEY, score, JSON.stringify(item))
            logger.debug({ url: item.url, retryAt: new Date(score).toISOString() }, '[MetadataQueue] 5分钟后重试')
          } catch (err) {
            logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[MetadataQueue] 重试队列写入失败')
          }
        }
      }
      return
    }

    // 智能补全：只更新"缺失"或"占位符"字段，避免覆盖用户已填的内容
    const current = await prisma.collection.findUnique({
      where: { id: item.collectionId },
      select: { title: true, coverImage: true },
    })
    if (!current) {
      logger.warn({ collectionId: item.collectionId }, '[MetadataQueue] 收藏已被删除，跳过补全')
      return
    }

    const updateData: Prisma.CollectionUpdateInput = {}
    // 标题：仅当当前是占位符（以 http:// 或 https:// 开头的长串）时才更新
    if (metadata.title && (!current.title || isTitlePlaceholder(current.title))) {
      updateData.title = metadata.title
    }
    // 封面：仅当当前为空时才更新
    if (metadata.coverImage && !current.coverImage) {
      updateData.coverImage = metadata.coverImage
    }

    if (Object.keys(updateData).length === 0) {
      logger.debug({ url: item.url }, '[MetadataQueue] 无需更新（用户已填写完整）')
      return
    }

    await prisma.collection.update({
      where: { id: item.collectionId },
      data: updateData,
    })

    logger.info(
      { url: item.url, updatedTitle: !!updateData.title, updatedCover: !!updateData.coverImage },
      '[MetadataQueue] 异步补全成功'
    )
  } catch (err) {
    const retryCount = (item.retryCount || 0) + 1
    if (retryCount <= MAX_RETRIES) {
      logger.warn(
        { url: item.url, retry: retryCount, err: err instanceof Error ? err.message : String(err) },
        '[MetadataQueue] 处理失败，准备重试'
      )
      // 重新入队，延迟后重试
      await enqueueWithDelay({ ...item, retryCount }, 1000 * retryCount)
    } else {
      logger.error(
        { url: item.url, err: err instanceof Error ? err.message : String(err) },
        '[MetadataQueue] 处理失败，进入死信队列'
      )
      await pushToDLQ({ ...item, retryCount })
    }
  }
}

/**
 * 延迟入队（用于重试）
 */
async function enqueueWithDelay(item: MetadataQueueItem, delayMs: number): Promise<void> {
  setTimeout(() => {
    enqueueMetadataFetch(item).catch(() => {})
  }, delayMs)
}

/**
 * 推入死信队列
 */
async function pushToDLQ(item: MetadataQueueItem): Promise<void> {
  if (isRedisAvailable()) {
    const redis = getRedisClient()
    if (redis) {
      try {
        await redis.lpush(DLQ_KEY, JSON.stringify(item))
        return
      } catch {
        // 降级到日志
      }
    }
  }
  logger.error({ item }, '[MetadataQueue] 死信队列（内存降级）')
}

/**
 * 从 Redis 队列消费任务（阻塞模式）
 * 应在应用启动时调用，持续运行
 */
export async function startMetadataQueueConsumer(): Promise<void> {
  const redis = getRedisClient()
  if (!redis) {
    logger.info('[MetadataQueue] Redis 客户端为空，启动内存队列消费者')
    startMemoryConsumer()
    return
  }

  // 等待 Redis 连接 ready（避免 BRPOP 在 ready 前被 reject）
  if (redis.status !== 'ready') {
    logger.info({ status: redis.status }, '[MetadataQueue] 等待 Redis 连接 ready...')
    await new Promise<void>((resolve) => {
      if (redis.status === 'ready') return resolve()
      const onReady = () => {
        redis.off('error', onError)
        resolve()
      }
      const onError = () => {
        // 连接错误时也要继续走（可能会重试）
      }
      redis.once('ready', onReady)
      redis.once('error', onError)
      // 最多等 10 秒
      setTimeout(() => {
        redis.off('ready', onReady)
        resolve()
      }, 10000)
    })
  }

  // 再次检查 Redis 是否可用
  if (isRedisAvailable()) {
    logger.info('[MetadataQueue] 启动 Redis 队列消费者')
    startRedisConsumer(redis)
  } else {
    // Redis 10 秒内未就绪，启动内存消费者，但后台持续尝试重连 Redis
    logger.warn('[MetadataQueue] Redis 未就绪，启动内存队列消费者（后台尝试重连）')
    startMemoryConsumer()
    waitForRedisAndSwitch(redis)
  }
}

/**
 * 后台等待 Redis 就绪后切换到 Redis 消费者
 */
function waitForRedisAndSwitch(redis: Redis): void {
  const checkInterval = setInterval(() => {
    if (isRedisAvailable()) {
      logger.info('[MetadataQueue] Redis 已就绪，切换到 Redis 队列消费者')
      clearInterval(checkInterval)
      startRedisConsumer(redis)
    }
  }, 5000) // 每 5 秒检查一次
}

/**
 * Redis 队列消费者主循环
 */
function startRedisConsumer(redis: Redis): void {
  let consecutiveErrors = 0

  // eslint-disable-next-line no-constant-condition
  ;(async () => {
    while (true) {
      try {
        // BRPOP 阻塞消费，超时 1 秒（避免 commandTimeout 误杀）
        const result = await redis.brpop(QUEUE_KEY, 1)
        if (!result) {
          consecutiveErrors = 0
          continue
        }

        const [, rawItem] = result
        const item: MetadataQueueItem = JSON.parse(rawItem)

        // 标记为处理中
        await redis.sadd(PROCESSING_KEY, dedupKey(item))

        // 使用 p-limit 限制并发
        limit(async () => {
          try {
            await processItem(item)
          } finally {
            // 移除处理中标记
            await redis.srem(PROCESSING_KEY, dedupKey(item)).catch(() => {})
          }
        }).catch(() => {})

        consecutiveErrors = 0
      } catch (err) {
        consecutiveErrors++
        recordRedisFailure(err instanceof Error ? err : undefined)
        logger.error({ err: err instanceof Error ? err.message : String(err), consecutiveErrors }, '[MetadataQueue] 消费者错误')
        // 连续失败5次后切换到内存队列（避免 Redis 超时风暴）
        if (consecutiveErrors >= 5) {
          logger.warn('[MetadataQueue] Redis 连续失败5次，切换到内存队列')
          startMemoryConsumer()
          return
        }
        // 短暂休眠后重试
        await sleep(1000)
      }
    }
  })()
}

/**
 * 内存队列消费者（Redis 不可用时的降级）
 */
function startMemoryConsumer(): void {
  logger.info('[MetadataQueue] 内存队列消费者已启动（每 1s 扫描）')
  setInterval(() => {
    while (memoryQueue.length > 0) {
      const item = memoryQueue.shift()
      if (!item) continue

      const key = dedupKey(item)
      memoryProcessing.add(key)

      limit(async () => {
        try {
          await processItem(item)
        } catch (err) {
          // 内存模式下也要记录错误，避免静默失败
          logger.error(
            { url: item.url, err: err instanceof Error ? err.message : String(err) },
            '[MetadataQueue] 内存消费者处理异常'
          )
        } finally {
          memoryProcessing.delete(key)
        }
      }).catch((err) => {
        logger.error(
          { url: item.url, err: err instanceof Error ? err.message : String(err) },
          '[MetadataQueue] 内存消费者 limit 调度异常'
        )
      })
    }
  }, 1000)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 处理"5 分钟重试队列"
 * 定时从 Redis ZSET 中取出到期的任务重新入队
 */
async function processRetryQueue(): Promise<void> {
  if (!isRedisAvailable()) return
  const redis = getRedisClient()
  if (!redis) return

  try {
    const now = Date.now()
    const items = await redis.zrangebyscore(RETRY_KEY, 0, now, 'LIMIT', 0, 50)
    if (items.length === 0) return

    for (const rawItem of items) {
      try {
        const item: MetadataQueueItem = JSON.parse(rawItem)
        // 重新入队（不走 enqueueMetadataFetch，避免触发 5min 去重）
        await redis.lpush(QUEUE_KEY, JSON.stringify(item))
        await redis.zrem(RETRY_KEY, rawItem)
        logger.debug({ url: item.url }, '[MetadataQueue] 5分钟重试入队成功')
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[MetadataQueue] 重试任务处理失败')
        await redis.zrem(RETRY_KEY, rawItem)
      }
    }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '[MetadataQueue] 重试队列扫描失败')
  }
}

// 启动 5 分钟重试队列扫描器
let retryInterval: NodeJS.Timeout | null = null
export function startRetryQueueProcessor(): void {
  if (retryInterval) return
  retryInterval = setInterval(processRetryQueue, 60 * 1000) // 每 60s 扫一次
  logger.info('[MetadataQueue] 5分钟重试队列处理器已启动（每 60s 扫描）')
}

/**
 * 获取队列状态（用于监控/debug）
 */
export async function getMetadataQueueStatus(): Promise<{
  pending: number
  running: number
  failed: number
  mode: 'redis' | 'memory'
}> {
  if (isRedisAvailable()) {
    const redis = getRedisClient()
    if (redis) {
      try {
        const [pending, processing, failed] = await Promise.all([
          redis.llen(QUEUE_KEY),
          redis.scard(PROCESSING_KEY),
          redis.llen(DLQ_KEY),
        ])
        return {
          pending: pending + processing, // 处理中的也算待完成
          running: limit.activeCount,
          failed,
          mode: 'redis',
        }
      } catch {
        // 降级到内存状态
      }
    }
  }

  return {
    pending: memoryQueue.length + memoryProcessing.size,
    running: limit.activeCount,
    failed: 0,
    mode: 'memory',
  }
}
