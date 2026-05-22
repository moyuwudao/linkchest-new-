import { PrismaClient, Prisma } from '@prisma/client'
import dotenv from 'dotenv'
import logger from './logger'

// 确保环境变量在 PrismaClient 实例化前加载
dotenv.config()

// PrismaClient 共享单例，避免每个路由文件创建独立实例
// PostgreSQL 连接池配置：在连接字符串中通过 ?connection_limit=10&pool_timeout=20 控制
// 示例: DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
// 从 DATABASE_URL 解析连接池参数，未设置时使用合理默认值
function parseConnectionLimit(): number {
  const url = process.env.DATABASE_URL || ''
  const match = url.match(/connection_limit=(\d+)/)
  return match ? parseInt(match[1], 10) : 10
}

function parsePoolTimeout(): number {
  const url = process.env.DATABASE_URL || ''
  const match = url.match(/pool_timeout=(\d+)/)
  return match ? parseInt(match[1], 10) : 20
}

// 连接池调优建议（P3）：
// - 轻负载（<1000并发）：connection_limit=5-10, pool_timeout=10s
// - 中负载（1000-5000并发）：connection_limit=15-20, pool_timeout=15s
// - 高负载（>5000并发）：connection_limit=30-50, pool_timeout=20s
// 在 DATABASE_URL 中添加参数：?connection_limit=15&pool_timeout=15
const connectionLimit = parseConnectionLimit()
const poolTimeout = parsePoolTimeout()

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// 将 Prisma 日志事件转发到 pino logger，保留完整上下文
prisma.$on('query', (e: Prisma.QueryEvent) => {
  if (process.env.NODE_ENV === 'development' && e.duration > 1000) {
    logger.warn({ query: e.query, params: e.params, duration: e.duration }, 'Prisma slow query')
  }
})

prisma.$on('info', (e: Prisma.LogEvent) => {
  logger.info({ target: e.target }, e.message)
})

prisma.$on('warn', (e: Prisma.LogEvent) => {
  logger.warn({ target: e.target }, e.message)
})

prisma.$on('error', (e: Prisma.LogEvent) => {
  logger.error({ target: e.target }, `Prisma error: ${e.message}`)
})

// 显式配置连接池（Prisma 4.10+ 支持）
// 注意：实际 connection_limit 和 pool_timeout 由 DATABASE_URL 查询参数控制
// 这里通过日志输出当前配置，便于运维排查
if (process.env.NODE_ENV !== 'test') {
  console.log(`[Prisma] 连接池配置: connection_limit=${connectionLimit}, pool_timeout=${poolTimeout}s`)
  if (connectionLimit < 5) {
    console.warn(`[Prisma] 连接池过小 (${connectionLimit})，建议至少设置为 5`)
  }
  if (poolTimeout > 30) {
    console.warn(`[Prisma] pool_timeout 过长 (${poolTimeout}s)，建议 <= 20s 避免请求堆积`)
  }
}

// ========== 连接错误重试中间件 ==========
// 自动处理 PostgreSQL 连接被终止（E57P01）等临时性连接故障
const MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 300

prisma.$use(async (params, next) => {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await next(params)
    } catch (err) {
      lastError = err
      const errMessage = err instanceof Error ? err.message : String(err)
      const isConnectionError =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        ['P1001', 'P1002', 'P1008', 'P1017'].includes(err.code)
      const isFatalDbError = errMessage.includes('terminating connection due to administrator command')
      const isConnectionClosed = errMessage.includes('Connection closed')

      if ((isConnectionError || isFatalDbError || isConnectionClosed) && attempt < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * attempt
        logger.warn(
          {
            attempt,
            maxRetries: MAX_RETRIES,
            delayMs: delay,
            model: params.model,
            action: params.action,
            error: errMessage.slice(0, 200),
          },
          '数据库连接错误，准备重试...'
        )
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
  throw lastError
})

// ========== 显式连接 + 启动时重试 ==========
let isConnected = false

export async function connectWithRetry(maxAttempts = 5): Promise<void> {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await prisma.$connect()
      isConnected = true
      logger.info('[Prisma] 数据库连接成功')
      return
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err)
      logger.error({ attempt: i, maxAttempts, error: errMessage }, '[Prisma] 数据库连接失败')
      if (i === maxAttempts) {
        throw err
      }
      await new Promise((r) => setTimeout(r, 2000 * i))
    }
  }
}

export function getIsConnected(): boolean {
  return isConnected
}

// 启动时尝试连接（非测试环境），失败不强制退出，让首次查询自行触发重试
if (process.env.NODE_ENV !== 'test') {
  connectWithRetry().catch((err) => {
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      '[Prisma] 启动时数据库连接失败，将在首次查询时自动重试'
    )
  })
}

// 优雅关闭：应用退出时断开数据库连接
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  isConnected = false
})

export default prisma
