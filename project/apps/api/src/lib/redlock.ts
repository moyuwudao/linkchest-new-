/**
 * Redis Redlock 分布式锁封装
 * 解决多实例部署时定时任务重复执行问题
 * - Redis 不可用时自动降级：允许本实例执行任务（单实例或开发环境）
 * - redlock 未安装时降级：直接执行任务（不报错）
 * - 锁超时后自动释放，避免死锁
 */
import { getRedisClient, isRedisAvailable } from './redis'
import logger from './logger'

let _redlock: any | null = null
let _redlockAvailable = true // 标记是否已尝试过加载

/** 获取 Redlock 实例（懒加载） */
function getRedlock(): any | null {
  if (_redlock) return _redlock
  if (!_redlockAvailable) return null

  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) {
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redlock = require('redlock')
    _redlock = new Redlock([redis], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 200,
    })

    _redlock.on('error', (err: Error) => {
      logger.warn({ err: err.message }, 'Redlock 错误')
    })

    return _redlock
  } catch {
    _redlockAvailable = false
    logger.warn('redlock 未安装，分布式锁功能不可用')
    return null
  }
}

/**
 * 在分布式锁保护下执行任务
 * @param lockKey 锁标识（如 'cleanup-covers'）
 * @param ttlMs 锁持有时间（毫秒），任务应在此时长内完成
 * @param task 要执行的任务
 * @returns 是否成功获取锁并执行任务
 */
export async function withDistributedLock(
  lockKey: string,
  ttlMs: number,
  task: () => Promise<void>
): Promise<boolean> {
  const redlock = getRedlock()

  // Redis 不可用时降级：允许执行（单实例或开发环境）
  if (!redlock) {
    logger.warn({ lockKey }, 'Redis 不可用，分布式锁降级，直接执行任务')
    try {
      await task()
      return true
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err), lockKey }, '定时任务执行失败（无锁保护）')
      return false
    }
  }

  const fullKey = `locks:${lockKey}`
  let lock: any | null = null

  try {
    lock = await redlock.acquire([fullKey], ttlMs)
    logger.info({ lockKey }, '🔒 分布式锁获取成功，开始执行任务')

    await task()

    logger.info({ lockKey }, '✅ 定时任务执行完成')
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Redlock 获取锁失败通常是因为其他实例已持有锁
    if (msg.includes('unable to achieve a quorum') || msg.includes('LockError')) {
      logger.info({ lockKey }, '⏭️ 分布式锁被其他实例持有，跳过本次执行')
    } else {
      logger.error({ err: msg, lockKey }, '❌ 定时任务执行失败')
    }
    return false
  } finally {
    if (lock) {
      try {
        await lock.release()
      } catch {
        // 锁可能已自动过期，忽略释放错误
      }
    }
  }
}
