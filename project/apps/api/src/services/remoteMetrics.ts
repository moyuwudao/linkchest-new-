/**
 * 远程服务器指标采集服务
 * 通过 HTTP 接口从海外服务器拉取指标数据
 * 国内服务器作为统一监控中心，聚合所有服务器数据
 */
import { getRedisClient, isRedisAvailable } from '../lib/redis'
import logger from '../lib/logger'

// ===== 海外服务器配置 =====
interface RemoteServerConfig {
  id: string
  name: string
  region: string
  apiUrl: string
  token?: string
  enabled: boolean
}

export const REMOTE_SERVERS: RemoteServerConfig[] = [
  {
    id: 'global',
    name: '海外服务器',
    region: '新加坡',
    apiUrl: process.env.GLOBAL_SERVER_METRICS_URL || 'http://43.133.44.232:3001/api/admin/metrics',
    token: process.env.GLOBAL_SERVER_API_TOKEN,
    enabled: process.env.REMOTE_METRICS_ENABLED !== 'false',
  },
]

export interface ServerMetrics {
  server: string
  totalRequests: number
  totalErrors: number
  avgDuration: number
  errorRate: number
  statusDistribution: Record<string, number>
  system?: {
    cpuCores: number
    loadAvg1m: number
    loadAvg5m: number
    loadAvg15m: number
    totalMemoryMB: number
    usedMemoryMB: number
    freeMemoryMB: number
    memoryUsagePercent: number
    nodeHeapUsedMB: number
    nodeHeapTotalMB: number
    nodeRssMB: number
  }
  pm2?: {
    uptime: number
    restarts: number
    memoryMB: number
    cpuPercent: number
    status: string
  }[]
  timestamp: number
}

/**
 * 从远程服务器拉取指标数据
 */
export async function fetchRemoteMetrics(server: RemoteServerConfig): Promise<ServerMetrics | null> {
  if (!server.enabled) return null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s 超时

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }
    if (server.token) {
      headers['Authorization'] = `Bearer ${server.token}`
    }

    const res = await fetch(server.apiUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      logger.warn({ serverId: server.id, status: res.status }, 'fetchRemoteMetrics HTTP 错误')
      return null
    }

    const data = await res.json() as Record<string, unknown>

    return {
      server: server.id,
      totalRequests: (data as any).totalRequests || (data as any).overview?.requests1h || 0,
      totalErrors: (data as any).totalErrors || Math.round(((data as any).overview?.errorRate1h || 0) * ((data as any).overview?.requests1h || 0)) || 0,
      avgDuration: (data as any).avgDuration || (data as any).overview?.avgDuration1h || 0,
      errorRate: (data as any).errorRate || (data as any).overview?.errorRate1h || 0,
      statusDistribution: (data as any).statusDistribution || {},
      system: (data as any).system,
      timestamp: Date.now(),
    }
  } catch (e) {
    logger.warn({ serverId: server.id, err: (e as Error).message }, 'fetchRemoteMetrics 失败')
    return null
  }
}

/**
 * 拉取所有远程服务器指标并缓存到 Redis
 */
export async function syncAllRemoteMetrics(): Promise<Map<string, ServerMetrics | null>> {
  const results = new Map<string, ServerMetrics | null>()

  for (const server of REMOTE_SERVERS) {
    if (!server.enabled) {
      results.set(server.id, null)
      continue
    }

    const metrics = await fetchRemoteMetrics(server)
    results.set(server.id, metrics)

    if (metrics) {
      // 缓存到 Redis，TTL 5 分钟
      const redis = getRedisClient()
      if (redis && isRedisAvailable()) {
        try {
          const key = `lc:remote_metrics:${server.id}`
          await redis.setex(key, 300, JSON.stringify(metrics))
        } catch (e) {
          logger.warn({ serverId: server.id, err: (e as Error).message }, 'cacheRemoteMetrics failed')
        }
      }
    }
  }

  return results
}

/**
 * 从 Redis 获取缓存的远程服务器指标
 */
export async function getCachedRemoteMetrics(serverId: string): Promise<ServerMetrics | null> {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return null

  try {
    const key = `lc:remote_metrics:${serverId}`
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached) as ServerMetrics
    }
  } catch (e) {
    logger.warn({ serverId, err: (e as Error).message }, 'getCachedRemoteMetrics failed')
  }
  return null
}

/**
 * 获取所有服务器的指标（本地 + 远程）
 */
export async function getAllServerMetrics(): Promise<{
  local: ServerMetrics
  remote: Map<string, ServerMetrics | null>
  timestamp: number
}> {
  // 1. 获取本地指标（复用现有 metrics 服务）
  const { getMetrics } = await import('./metrics')
  const localData = await getMetrics(60)

  const os = await import('os')
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const loadAvg = os.loadavg()

  const local: ServerMetrics = {
    server: 'china',
    totalRequests: localData.totalRequests,
    totalErrors: localData.totalErrors,
    avgDuration: localData.avgDuration,
    errorRate: localData.errorRate,
    statusDistribution: localData.statusDistribution,
    system: {
      cpuCores: os.cpus().length,
      loadAvg1m: loadAvg[0],
      loadAvg5m: loadAvg[1],
      loadAvg15m: loadAvg[2],
      totalMemoryMB: Math.round(totalMem / 1024 / 1024),
      usedMemoryMB: Math.round(usedMem / 1024 / 1024),
      freeMemoryMB: Math.round(freeMem / 1024 / 1024),
      memoryUsagePercent: totalMem > 0 ? usedMem / totalMem : 0,
      nodeHeapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeHeapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      nodeRssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    timestamp: Date.now(),
  }

  // 2. 获取远程指标（优先从缓存读取）
  const remote = new Map<string, ServerMetrics | null>()
  for (const server of REMOTE_SERVERS) {
    const cached = await getCachedRemoteMetrics(server.id)
    remote.set(server.id, cached)
  }

  return { local, remote, timestamp: Date.now() }
}

/**
 * 获取海外服务器的 PM2 状态（通过 API 查询海外服务器 PM2 信息）
 */
export async function fetchRemotePm2Status(): Promise<Record<string, unknown>[]> {
  const server = REMOTE_SERVERS[0]
  if (!server?.enabled) return []

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }
    if (server.token) {
      headers['Authorization'] = `Bearer ${server.token}`
    }

    const res = await fetch(`${server.apiUrl.replace('/metrics', '')}/pm2-status`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) return []
    const data = await res.json() as Record<string, unknown>
    return (data as any).processes || []
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'fetchRemotePm2Status failed')
    return []
  }
}
