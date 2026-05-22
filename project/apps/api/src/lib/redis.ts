/**
 * Redis 客户端单例（容错降级）
 * - Redis 可用时：使用缓存
 * Redis 不可用：自动降级为无缓存模式，不影响主流程
 */
import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let _client: Redis | null = null
let _available = false
let _consecutiveFailures = 0
let _lastFailureTime = 0
const FAILURE_THRESHOLD = 3
const FAILURE_WINDOW_MS = 30000 // 30秒内连续失败3次则临时降级

export function getRedisClient(): Redis | null {
  if (_client) return _available ? _client : null

  try {
    _client = new Redis(REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 200, 3000),
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableOfflineQueue: false,
    })

    _client.on('error', (err) => {
      if (_available) {
        console.warn('⚠️ Redis 连接错误，已降级为无缓存模式:', err.message)
        _available = false
      }
    })

    _client.on('connect', () => {
      if (!_available) {
        console.log('✅ Redis 连接成功')
        _available = true
      }
    })

    // 尝试连接（不阻塞启动）
    ;(async () => {
      try {
        await _client!.connect()
        _available = true
      } catch {
        _available = false
        console.warn('⚠️ Redis 不可用，metadata 缓存功能将降级')
      }
    })()

    return _client
  } catch {
    return null
  }
}

/** 检查 Redis 当前是否可用（含健康检查，连续超时自动降级） */
export function isRedisAvailable(): boolean {
  if (!_available) return false
  // 如果最近连续失败超过阈值，临时降级为不可用，避免超时风暴
  if (_consecutiveFailures >= FAILURE_THRESHOLD && Date.now() - _lastFailureTime < FAILURE_WINDOW_MS) {
    return false
  }
  return true
}

/** 记录 Redis 操作成功，重置失败计数 */
export function recordRedisSuccess(): void {
  if (_consecutiveFailures > 0) {
    console.log('✅ Redis 操作恢复成功')
  }
  _consecutiveFailures = 0
  _lastFailureTime = 0
}

/** 记录 Redis 操作失败，累计失败计数 */
export function recordRedisFailure(err?: Error): void {
  _consecutiveFailures++
  _lastFailureTime = Date.now()
  if (_consecutiveFailures >= FAILURE_THRESHOLD) {
    console.warn(`⚠️ Redis 连续 ${_consecutiveFailures} 次操作失败，已临时降级为无缓存模式${err ? ': ' + err.message : ''}`)
  }
}

// 启动时预创建客户端
getRedisClient()
