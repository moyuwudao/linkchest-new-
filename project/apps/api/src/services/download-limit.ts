/**
 * 下载限制服务 - 每天下载次数限制
 *
 * 业务规则：
 * - 每天每个用户最多下载 5 次（各方案统一合并计算：JSON/CSV/HTML）
 * - 超过 4 次时提示用户（告知"今日还剩 1 次"）
 * - 达到 5 次后拒绝（HTTP 429）
 * - 计数放在 export-download 端点（实际下载时增加），避免用户点按钮但取消下载的"伪消耗"
 *
 * 存储：
 * - 优先使用 Redis（key = `download:counter:${userId}:${YYYY-MM-DD}`，TTL 36h）
 * - 降级为内存 Map（仅进程内，重启后丢失，但单进程 API 足够稳定）
 */
import { getRedisClient, isRedisAvailable, recordRedisSuccess, recordRedisFailure } from '../lib/redis'
import logger from '../lib/logger'

export const DAILY_DOWNLOAD_LIMIT = 5

// 36 小时 TTL：覆盖所有时区（最迟 UTC+14 到 UTC-12，差 26h）
const COUNTER_TTL_SECONDS = 36 * 60 * 60

interface DownloadCounter {
  count: number
  expiresAt: number
}

// 内存降级存储
const memoryDownloadCounter = new Map<string, DownloadCounter>()

/**
 * 获取今天日期字符串（YYYY-MM-DD）
 * 使用 UTC+8 中国时区为基准，与产品用户群体一致
 */
function getTodayDateString(): string {
  const now = new Date()
  // 转换到 UTC+8 时区
  const chinaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return chinaTime.toISOString().slice(0, 10)
}

function buildCounterKey(userId: string, date: string): string {
  return `download:counter:${userId}:${date}`
}

/**
 * 清理过期的内存计数器（防止长期运行内存泄漏）
 */
function cleanupMemoryCounters() {
  const now = Date.now()
  for (const [key, entry] of memoryDownloadCounter.entries()) {
    if (entry.expiresAt < now) memoryDownloadCounter.delete(key)
  }
}

// 每小时清理一次
setInterval(cleanupMemoryCounters, 60 * 60 * 1000).unref()

/**
 * 获取用户今日已下载次数
 */
export async function getTodayDownloadCount(userId: string): Promise<number> {
  const date = getTodayDateString()
  const key = buildCounterKey(userId, date)

  if (isRedisAvailable()) {
    const redis = getRedisClient()
    if (redis) {
      try {
        const count = await redis.get(key)
        recordRedisSuccess()
        return count ? parseInt(count, 10) : 0
      } catch (err) {
        recordRedisFailure(err instanceof Error ? err : new Error(String(err)))
        logger.warn({ err, userId }, '[DownloadLimit] Redis 读取计数失败，降级到内存')
      }
    }
  }

  // 内存降级
  const entry = memoryDownloadCounter.get(key)
  if (!entry || entry.expiresAt < Date.now()) return 0
  return entry.count
}

/**
 * 增加用户今日已下载次数（仅在 export-download 实际成功返回文件后调用）
 */
export async function incrementTodayDownloadCount(userId: string): Promise<number> {
  const date = getTodayDateString()
  const key = buildCounterKey(userId, date)

  if (isRedisAvailable()) {
    const redis = getRedisClient()
    if (redis) {
      try {
        const count = await redis.incr(key)
        // 首次创建时设置 TTL
        if (count === 1) {
          await redis.expire(key, COUNTER_TTL_SECONDS)
        }
        recordRedisSuccess()
        return count
      } catch (err) {
        recordRedisFailure(err instanceof Error ? err : new Error(String(err)))
        logger.warn({ err, userId }, '[DownloadLimit] Redis 递增计数失败，降级到内存')
      }
    }
  }

  // 内存降级
  const existing = memoryDownloadCounter.get(key)
  if (!existing || existing.expiresAt < Date.now()) {
    const newEntry: DownloadCounter = {
      count: 1,
      expiresAt: Date.now() + COUNTER_TTL_SECONDS * 1000,
    }
    memoryDownloadCounter.set(key, newEntry)
    return 1
  }
  existing.count++
  return existing.count
}

export interface DownloadLimitStatus {
  currentCount: number
  limit: number
  remaining: number
  reached: boolean
  isLastChance: boolean
}

/**
 * 获取当前下载限制状态（供前端展示）
 */
export async function getDownloadLimitStatus(userId: string): Promise<DownloadLimitStatus> {
  const currentCount = await getTodayDownloadCount(userId)
  const remaining = Math.max(0, DAILY_DOWNLOAD_LIMIT - currentCount)
  return {
    currentCount,
    limit: DAILY_DOWNLOAD_LIMIT,
    remaining,
    reached: currentCount >= DAILY_DOWNLOAD_LIMIT,
    isLastChance: currentCount === DAILY_DOWNLOAD_LIMIT - 1,
  }
}
