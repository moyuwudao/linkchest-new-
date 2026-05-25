/**
 * Redis 指标采集服务
 * 使用 Redis 时间窗口计数器记录请求量、错误数、响应时间、状态码分布
 * 分钟级粒度，TTL 2 小时自动过期
 */
import { getRedisClient, isRedisAvailable, recordRedisSuccess, recordRedisFailure } from '../lib/redis'
import logger from '../lib/logger'

const METRICS_PREFIX = 'lc:metrics'
const TTL_SECONDS = 7200 // 2 小时

interface RequestMetric {
  method: string
  path: string
  statusCode: number
  duration: number
  isError: boolean
}

/**
 * 获取当前分钟时间戳（作为 key 的一部分）
 */
function getMinuteKey(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * 记录请求指标到 Redis
 */
export async function recordRequestMetrics(metric: RequestMetric) {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return

  const minute = getMinuteKey()
  const pipeline = redis.pipeline()

  // 总请求计数
  pipeline.incr(`${METRICS_PREFIX}:req:${minute}`)
  pipeline.expire(`${METRICS_PREFIX}:req:${minute}`, TTL_SECONDS)

  // 响应时间累计（用于计算平均值）
  pipeline.incrby(`${METRICS_PREFIX}:duration:${minute}`, Math.round(metric.duration))
  pipeline.expire(`${METRICS_PREFIX}:duration:${minute}`, TTL_SECONDS)

  // 状态码分布
  pipeline.incr(`${METRICS_PREFIX}:status:${metric.statusCode}:${minute}`)
  pipeline.expire(`${METRICS_PREFIX}:status:${metric.statusCode}:${minute}`, TTL_SECONDS)

  if (metric.isError) {
    // 错误计数
    pipeline.incr(`${METRICS_PREFIX}:err:${minute}`)
    pipeline.expire(`${METRICS_PREFIX}:err:${minute}`, TTL_SECONDS)

    // 按路径的错误计数
    const safePath = metric.path.replace(/:/g, '_').slice(0, 50)
    pipeline.incr(`${METRICS_PREFIX}:err:path:${safePath}:${minute}`)
    pipeline.expire(`${METRICS_PREFIX}:err:path:${safePath}:${minute}`, TTL_SECONDS)
  }

  try {
    await pipeline.exec()
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'recordRequestMetrics failed')
  }
}

/**
 * 记录错误指标（用于路由错误处理等场景）
 */
export async function recordErrorMetrics(metric: {
  method: string
  path: string
  statusCode: number
}) {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return

  const minute = getMinuteKey()
  const pipeline = redis.pipeline()

  pipeline.incr(`${METRICS_PREFIX}:err:${minute}`)
  pipeline.expire(`${METRICS_PREFIX}:err:${minute}`, TTL_SECONDS)

  pipeline.incr(`${METRICS_PREFIX}:status:${metric.statusCode}:${minute}`)
  pipeline.expire(`${METRICS_PREFIX}:status:${metric.statusCode}:${minute}`, TTL_SECONDS)

  try {
    await pipeline.exec()
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'recordErrorMetrics failed')
  }
}

/**
 * 记录超时指标
 * 用于监控请求超时事件
 */
export async function recordTimeoutMetrics(metric: {
  method: string
  path: string
  duration: number
}) {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return

  const minute = getMinuteKey()
  const pipeline = redis.pipeline()

  // 超时计数
  pipeline.incr(`${METRICS_PREFIX}:timeout:${minute}`)
  pipeline.expire(`${METRICS_PREFIX}:timeout:${minute}`, TTL_SECONDS)

  // 按路径的超时计数
  const safePath = metric.path.replace(/:/g, '_').slice(0, 50)
  pipeline.incr(`${METRICS_PREFIX}:timeout:path:${safePath}:${minute}`)
  pipeline.expire(`${METRICS_PREFIX}:timeout:path:${safePath}:${minute}`, TTL_SECONDS)

  // 超时耗时累计
  pipeline.incrby(`${METRICS_PREFIX}:timeout:duration:${minute}`, Math.round(metric.duration))
  pipeline.expire(`${METRICS_PREFIX}:timeout:duration:${minute}`, TTL_SECONDS)

  try {
    await pipeline.exec()
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'recordTimeoutMetrics failed')
  }
}

/**
 * 聚合查询指标数据
 * @param windowMinutes 时间窗口（分钟）
 */
export async function getMetrics(windowMinutes: number): Promise<{
  totalRequests: number
  totalErrors: number
  avgDuration: number
  errorRate: number
  statusDistribution: Record<string, number>
}> {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) {
    return {
      totalRequests: 0,
      totalErrors: 0,
      avgDuration: 0,
      errorRate: 0,
      statusDistribution: {},
    }
  }

  const keys: string[] = []
  const now = new Date()

  for (let i = 0; i < windowMinutes; i++) {
    const t = new Date(now.getTime() - i * 60 * 1000)
    const minute = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`
    keys.push(minute)
  }

  try {
    // 批量获取
    const pipeline = redis.pipeline()
    keys.forEach(m => {
      pipeline.get(`${METRICS_PREFIX}:req:${m}`)
      pipeline.get(`${METRICS_PREFIX}:err:${m}`)
      pipeline.get(`${METRICS_PREFIX}:duration:${m}`)
    })

    const results = await pipeline.exec()
    if (!results) {
      recordRedisSuccess()
      return {
        totalRequests: 0,
        totalErrors: 0,
        avgDuration: 0,
        errorRate: 0,
        statusDistribution: {},
      }
    }

    let totalRequests = 0
    let totalErrors = 0
    let totalDuration = 0

    for (let i = 0; i < keys.length; i++) {
      const base = i * 3
      const reqVal = results[base]?.[1]
      const errVal = results[base + 1]?.[1]
      const durVal = results[base + 2]?.[1]

      if (reqVal) totalRequests += parseInt(String(reqVal), 10) || 0
      if (errVal) totalErrors += parseInt(String(errVal), 10) || 0
      if (durVal) totalDuration += parseInt(String(durVal), 10) || 0
    }

    // 获取状态码分布
    const statusDistribution: Record<string, number> = {}
    try {
      const statusPipeline = redis.pipeline()
      keys.forEach(m => {
        statusPipeline.keys(`${METRICS_PREFIX}:status:*:${m}`)
      })
      const statusKeysResults = await statusPipeline.exec()
      const allStatusKeys = new Set<string>()
      statusKeysResults?.forEach(r => {
        if (r?.[1] && Array.isArray(r[1])) {
          ;(r[1] as string[]).forEach(k => allStatusKeys.add(k))
        }
      })

      if (allStatusKeys.size > 0) {
        const valuesPipeline = redis.pipeline()
        const keyList = Array.from(allStatusKeys)
        keyList.forEach(k => valuesPipeline.get(k))
        const valueResults = await valuesPipeline.exec()
        keyList.forEach((k, i) => {
          const val = valueResults?.[i]?.[1]
          if (val) {
            // 提取状态码: lc:metrics:status:500:202604262345 -> 500
            const match = k.match(/status:(\d+):/)
            if (match) {
              const code = match[1]
              statusDistribution[code] = (statusDistribution[code] || 0) + (parseInt(String(val), 10) || 0)
            }
          }
        })
      }
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'getMetrics statusDistribution 失败')
    }

    recordRedisSuccess()

    const avgDuration = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0

    return {
      totalRequests,
      totalErrors,
      avgDuration,
      errorRate,
      statusDistribution,
    }
  } catch (e) {
    recordRedisFailure(e as Error)
    logger.warn({ err: (e as Error).message }, 'getMetrics Redis 操作失败，降级')
    return {
      totalRequests: 0,
      totalErrors: 0,
      avgDuration: 0,
      errorRate: 0,
      statusDistribution: {},
    }
  }
}

/**
 * 获取最近 N 分钟的时序数据（用于图表）
 */
export async function getMetricsTimeline(points: number): Promise<
  Array<{
    time: string
    requests: number
    errors: number
    avgDuration: number
  }>
> {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return []

  const result: Array<{
    time: string
    requests: number
    errors: number
    avgDuration: number
  }> = []

  const now = new Date()

  try {
    for (let i = points - 1; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60 * 1000)
      const minute = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`
      const timeLabel = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`

      const [reqs, errs, durs] = await Promise.all([
        redis.get(`${METRICS_PREFIX}:req:${minute}`),
        redis.get(`${METRICS_PREFIX}:err:${minute}`),
        redis.get(`${METRICS_PREFIX}:duration:${minute}`),
      ])

      const requests = parseInt(String(reqs), 10) || 0
      const errors = parseInt(String(errs), 10) || 0
      const duration = parseInt(String(durs), 10) || 0

      result.push({
        time: timeLabel,
        requests,
        errors,
        avgDuration: requests > 0 ? Math.round(duration / requests) : 0,
      })
    }
    recordRedisSuccess()
  } catch (e) {
    recordRedisFailure(e as Error)
    logger.warn({ err: (e as Error).message }, 'getMetricsTimeline Redis 操作失败，降级')
  }

  return result
}

// ===== 分享页性能指标 =====

const SHARE_METRICS_PREFIX = 'lc:metrics:share'

/**
 * 记录分享页缓存命中
 */
export async function recordShareCacheHit(_shareId: string) {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return

  const minute = getMinuteKey()
  const pipeline = redis.pipeline()
  pipeline.incr(`${SHARE_METRICS_PREFIX}:cache_hit:${minute}`)
  pipeline.expire(`${SHARE_METRICS_PREFIX}:cache_hit:${minute}`, TTL_SECONDS)
  try {
    await pipeline.exec()
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'recordShareCacheHit failed')
  }
}

/**
 * 记录分享页缓存未命中
 */
export async function recordShareCacheMiss(_shareId: string) {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return

  const minute = getMinuteKey()
  const pipeline = redis.pipeline()
  pipeline.incr(`${SHARE_METRICS_PREFIX}:cache_miss:${minute}`)
  pipeline.expire(`${SHARE_METRICS_PREFIX}:cache_miss:${minute}`, TTL_SECONDS)
  try {
    await pipeline.exec()
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'recordShareCacheMiss failed')
  }
}

/**
 * 记录分享页请求（用于计算分享页专属 QPS 和响应时间）
 */
export async function recordSharePageRequest(duration: number) {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return

  const minute = getMinuteKey()
  const pipeline = redis.pipeline()
  pipeline.incr(`${SHARE_METRICS_PREFIX}:req:${minute}`)
  pipeline.expire(`${SHARE_METRICS_PREFIX}:req:${minute}`, TTL_SECONDS)
  pipeline.incrby(`${SHARE_METRICS_PREFIX}:duration:${minute}`, Math.round(duration))
  pipeline.expire(`${SHARE_METRICS_PREFIX}:duration:${minute}`, TTL_SECONDS)
  try {
    await pipeline.exec()
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'recordSharePageRequest failed')
  }
}

/**
 * 获取分享页性能统计
 */
export async function getShareStats(windowMinutes: number): Promise<{
  cacheHits: number
  cacheMisses: number
  cacheHitRate: number
  totalRequests: number
  avgDuration: number
}> {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) {
    return { cacheHits: 0, cacheMisses: 0, cacheHitRate: 0, totalRequests: 0, avgDuration: 0 }
  }

  const keys: string[] = []
  const now = new Date()

  for (let i = 0; i < windowMinutes; i++) {
    const t = new Date(now.getTime() - i * 60 * 1000)
    const minute = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`
    keys.push(minute)
  }

  try {
    const pipeline = redis.pipeline()
    keys.forEach(m => {
      pipeline.get(`${SHARE_METRICS_PREFIX}:cache_hit:${m}`)
      pipeline.get(`${SHARE_METRICS_PREFIX}:cache_miss:${m}`)
      pipeline.get(`${SHARE_METRICS_PREFIX}:req:${m}`)
      pipeline.get(`${SHARE_METRICS_PREFIX}:duration:${m}`)
    })

    const results = await pipeline.exec()
    if (!results) {
      recordRedisSuccess()
      return { cacheHits: 0, cacheMisses: 0, cacheHitRate: 0, totalRequests: 0, avgDuration: 0 }
    }

    let cacheHits = 0
    let cacheMisses = 0
    let totalRequests = 0
    let totalDuration = 0

    for (let i = 0; i < keys.length; i++) {
      const base = i * 4
      const hitVal = results[base]?.[1]
      const missVal = results[base + 1]?.[1]
      const reqVal = results[base + 2]?.[1]
      const durVal = results[base + 3]?.[1]

      if (hitVal) cacheHits += parseInt(String(hitVal), 10) || 0
      if (missVal) cacheMisses += parseInt(String(missVal), 10) || 0
      if (reqVal) totalRequests += parseInt(String(reqVal), 10) || 0
      if (durVal) totalDuration += parseInt(String(durVal), 10) || 0
    }

    recordRedisSuccess()

    const totalCache = cacheHits + cacheMisses
    const cacheHitRate = totalCache > 0 ? cacheHits / totalCache : 0
    const avgDuration = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0

    return { cacheHits, cacheMisses, cacheHitRate, totalRequests, avgDuration }
  } catch (e) {
    recordRedisFailure(e as Error)
    logger.warn({ err: (e as Error).message }, 'getShareStats Redis 操作失败，降级')
    return { cacheHits: 0, cacheMisses: 0, cacheHitRate: 0, totalRequests: 0, avgDuration: 0 }
  }
}
