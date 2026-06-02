/**
 * 远程服务器指标采集服务
 * 根据市场配置监控对应的服务器集群
 * 国内监控国内两台服务器，海外监控海外两台服务器
 */
import { getRedisClient, isRedisAvailable } from '../lib/redis'
import logger from '../lib/logger'
import { isChinaMarket, isGlobalMarket } from '../lib/market'

// ===== 服务器配置（根据市场动态选择）=====
interface RemoteServerConfig {
  id: string
  name: string
  region: string
  apiUrl: string
  token?: string
  enabled: boolean
}

// 国内服务器集群
const CHINA_SERVERS: RemoteServerConfig[] = [
  {
    id: 'china-db',
    name: '国内数据层',
    region: '广州',
    apiUrl: process.env.CHINA_DB_METRICS_URL || 'http://114.132.81.246:3001/api/admin/metrics',
    token: process.env.CHINA_SERVER_API_TOKEN,
    enabled: true,
  },
]

// 海外服务器集群
const GLOBAL_SERVERS: RemoteServerConfig[] = [
  {
    id: 'global-db',
    name: '海外数据层',
    region: '新加坡',
    // 通过 SSH 隧道访问新加坡数据层监控代理（雅加达本地 3002 端口转发到新加坡 3001）
    apiUrl: process.env.GLOBAL_DB_METRICS_URL || 'http://127.0.0.1:3002/api/admin/metrics',
    token: process.env.GLOBAL_SERVER_API_TOKEN,
    enabled: true,
  },
]

export function getRemoteServers(): RemoteServerConfig[] {
  if (isChinaMarket()) {
    return CHINA_SERVERS
  }
  return GLOBAL_SERVERS
}

export function getLocalServer(): RemoteServerConfig {
  if (isChinaMarket()) {
    return {
      id: 'china-app',
      name: '国内应用层',
      region: '广州',
      apiUrl: 'http://localhost:3001/api/admin/metrics',
      enabled: true,
    }
  }
  return {
    id: 'global-app',
    name: '海外应用层',
    region: '雅加达',
    apiUrl: 'http://localhost:3001/api/admin/metrics',
    enabled: true,
  }
}

// 兼容旧代码
export const REMOTE_SERVERS: RemoteServerConfig[] = getRemoteServers()

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

    // 适配数据层轻量级监控代理返回的格式
    const cpu = (data as any).cpu
    const memory = (data as any).memory
    const disk = (data as any).disk
    const loadavg = cpu?.loadavg || [0, 0, 0]

    const system = (data as any).system || {
      cpuCores: cpu?.cores || 0,
      loadAvg1m: loadavg[0] || 0,
      loadAvg5m: loadavg[1] || 0,
      loadAvg15m: loadavg[2] || 0,
      totalMemoryMB: memory?.total || 0,
      usedMemoryMB: memory?.used || 0,
      freeMemoryMB: memory?.free || 0,
      memoryUsagePercent: memory ? memory.used / memory.total : 0,
      nodeHeapUsedMB: 0,
      nodeHeapTotalMB: 0,
      nodeRssMB: 0,
    }

    return {
      server: server.id,
      totalRequests: (data as any).totalRequests || (data as any).overview?.requests1h || 0,
      totalErrors: (data as any).totalErrors || Math.round(((data as any).overview?.errorRate1h || 0) * ((data as any).overview?.requests1h || 0)) || 0,
      avgDuration: (data as any).avgDuration || (data as any).overview?.avgDuration1h || 0,
      errorRate: (data as any).errorRate || (data as any).overview?.errorRate1h || 0,
      statusDistribution: (data as any).statusDistribution || {},
      system,
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
  const servers = getRemoteServers()

  for (const server of servers) {
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
  remote: Record<string, ServerMetrics | null>
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
    server: isChinaMarket() ? 'china-app' : 'global-app',
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
  const remote: Record<string, ServerMetrics | null> = {}
  const servers = getRemoteServers()
  for (const server of servers) {
    const cached = await getCachedRemoteMetrics(server.id)
    remote[server.id] = cached
  }

  return { local, remote, timestamp: Date.now() }
}

/**
 * 获取远程服务器的 PM2 状态（通过 API 查询对应市场服务器 PM2 信息）
 */
export async function fetchRemotePm2Status(): Promise<Record<string, unknown>[]> {
  const servers = getRemoteServers()
  const allProcesses: Record<string, unknown>[] = []

  for (const server of servers) {
    if (!server?.enabled) continue

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

      if (!res.ok) continue
      const data = await res.json() as Record<string, unknown>
      const processes = ((data as any).processes || []) as Array<Record<string, unknown>>
      // 添加服务器标识
      for (const proc of processes) {
        proc._serverId = server.id
        proc._serverName = server.name
      }
      allProcesses.push(...processes)
    } catch (e) {
      logger.warn({ serverId: server.id, err: (e as Error).message }, 'fetchRemotePm2Status failed')
    }
  }

  return allProcesses
}
