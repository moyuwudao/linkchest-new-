import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import dotenv from 'dotenv'
import prisma, { connectWithRetry } from './lib/prisma'
import { getRedisClient, isRedisAvailable } from './lib/redis'
import { CORS_ORIGINS, PORT, SHARE_BASE_URL } from './lib/config'
import {
  GLOBAL_RATE_LIMIT_WINDOW_MS,
  GLOBAL_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX,
  IP_RATE_LIMIT_WINDOW_MS,
  IP_RATE_LIMIT_MAX,
  JSON_BODY_LIMIT,
} from './lib/constants'
import { errorResponse, CommonErrorCodes, AuthErrorCodes } from './lib/errorCodes'
import logger from './lib/logger'
import { requestTracker, routeErrorHandler } from './middleware/requestTracker'
import { requestTimeout } from './middleware/requestTimeout'
import { adminAuth } from './middleware/adminAuth'
import { initScheduler } from './services/scheduler'
import { initEventHandlers } from './services/eventHandlers'
import { startAlertEngine, recordHealthCheckFailure, recordHealthCheckSuccess } from './services/alerting'
import { syncTierConfigs } from './services/tierConfig'
import authRoutes from './routes/auth'
import collectionRoutes from './routes/collections'
import tagRoutes from './routes/tags'
import listRoutes from './routes/lists'
import shareRoutes from './routes/shares'
import publicRoutes from './routes/public'
import statsRoutes from './routes/stats'
import uploadRoutes from './routes/upload'
import quotaRoutes from './routes/quota'
import subscriptionRoutes from './routes/share-imports'
import planRoutes from './routes/subscription-plans'
import tierRoutes from './routes/tiers'
import userRoutes from './routes/users'
import backupRoutes from './routes/backup'
import referralRoutes from './routes/referrals'
import paypalPaymentRoutes from './routes/payments/paypal'
import wechatPaymentRoutes from './routes/payments/wechat'
import alipayPaymentRoutes from './routes/payments/alipay'
import appleIAPRoutes from './routes/payments/appleIAP'
import googlePayRoutes from './routes/payments/googlePay'
import googlePlayBillingRoutes from './routes/payments/googlePlayBilling'
import marketRoutes from './routes/market'
import adminRoutes from './routes/admin'

dotenv.config()

const app = express()
const isProduction = process.env.NODE_ENV === 'production'

// 信任反向代理（Nginx）传递的 X-Forwarded-For 等头
if (isProduction) {
  app.set('trust proxy', 1)
}

// 请求超时中间件（防止请求挂死，默认30秒）
app.use(requestTimeout())

// 结构化请求追踪中间件（替代原有的 console.log 日志）
app.use(requestTracker)

// 响应压缩中间件（减少传输体积）
app.use(compression())

// CORS 中间件 - 放在所有中间件之前
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Helmet 安全头中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

// 解析 JSON 请求体 - 增大限制到 10MB 以支持大量数据导入
app.use(express.json({ limit: JSON_BODY_LIMIT }))

// 全局限流中间件（排除健康检查）
const globalLimiter = rateLimit({
  windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
  max: GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: (req, res) => {
    return errorResponse(res, 429, CommonErrorCodes.TOO_MANY_REQUESTS)
  },
})
app.use(globalLimiter)

// 认证路由更严格限流（防暴力破解）
// 注意：/auth/me 是获取当前用户信息（已认证），不是认证动作本身，
// 高频调用是正常的（每次进首页/我的页面都会调用），不应被限流。
const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/me' || req.path.endsWith('/me'),
  handler: (req, res) => {
    return errorResponse(res, 429, CommonErrorCodes.AUTH_TOO_MANY_REQUESTS)
  },
})

// 导入接口严格限流（防大量数据写入）
const importLimiter = rateLimit({
  windowMs: IP_RATE_LIMIT_WINDOW_MS,
  max: IP_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 429, CommonErrorCodes.TOO_MANY_REQUESTS)
  },
})

// 公开分享页面独立限流：更宽松，允许链接被广泛传播
// 注意：配合 Redis 长期缓存，实际数据库压力极小
const shareLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 200, // 每 IP 200 次/分钟（一个页面刷新+几张封面图）
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/check' || req.path.endsWith('/verify') || req.path.endsWith('/save'),
  handler: (req, res) => {
    return errorResponse(res, 429, CommonErrorCodes.SHARE_TOO_MANY_REQUESTS)
  },
})

// 路由
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/collections/import', importLimiter)
app.use('/api/collections', collectionRoutes)
app.use('/api/tags', tagRoutes)
app.use('/api/lists', listRoutes)
app.use('/api/shares', shareRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/quota', quotaRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/subscription', planRoutes)
app.use('/api/tiers', tierRoutes)
app.use('/api/users', userRoutes)
app.use('/api/backups', backupRoutes)
app.use('/api/referrals', referralRoutes)
app.use('/api/payments/paypal', paypalPaymentRoutes)
app.use('/api/payments/wechat', wechatPaymentRoutes)
app.use('/api/payments/alipay', alipayPaymentRoutes)
app.use('/api/payments/apple', appleIAPRoutes)
app.use('/api/payments/google', googlePayRoutes)
app.use('/api/payments/google-play', googlePlayBillingRoutes)
app.use('/api/market', marketRoutes)
app.use('/api/admin', adminAuth, adminRoutes) // 管理后台路由（受 adminAuth 保护）
app.use('/s', shareLimiter, publicRoutes) // 公开分享链接（短链）
app.use('/api/s', shareLimiter, publicRoutes) // 公开分享链接（兼容前端api实例）

// 根路径重定向到健康检查
app.get('/', (req, res) => {
  res.redirect('/health')
})

// 健康检查（深度检测：DB + Redis）
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {}
  let allHealthy = true

  // 数据库连通性检测（失败时尝试一次主动重连）
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'unknown'
    logger.warn({ err: errMessage }, '健康检查数据库查询失败，尝试主动重连...')
    try {
      await connectWithRetry(3)
      await prisma.$queryRaw`SELECT 1`
      checks.database = 'ok (recovered)'
    } catch (retryErr) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : 'unknown'
      logger.error({ err: retryMessage }, '健康检查数据库重连失败')
      checks.database = 'error'
      allHealthy = false
    }
  }

  // Redis 连通性检测
  try {
    const redisClient = getRedisClient()
    if (redisClient && isRedisAvailable()) {
      await redisClient.ping()
      checks.redis = 'ok'
    } else {
      checks.redis = 'unavailable'
    }
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'unknown'
    logger.warn({ err: errMessage }, '健康检查 Redis 连接失败')
    checks.redis = 'error'
    allHealthy = false
  }

  const statusCode = allHealthy ? 200 : 503
  res.status(statusCode).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  })
})

// API 健康检查（兼容移动端 /api/health 请求）
app.get('/api/health', async (req, res) => {
  const checks: Record<string, string> = {}
  let allHealthy = true

  // 数据库连通性检测
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch (err) {
    checks.database = 'error'
    allHealthy = false
  }

  // Redis 连通性检测
  try {
    const redisClient = getRedisClient()
    if (redisClient && isRedisAvailable()) {
      await redisClient.ping()
      checks.redis = 'ok'
    } else {
      checks.redis = 'unavailable'
    }
  } catch (err) {
    checks.redis = 'error'
    allHealthy = false
  }

  const statusCode = allHealthy ? 200 : 503
  res.status(statusCode).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  })
})

interface ExpressError extends Error {
  type?: string
  status?: number
  message: string
}

// 路由级错误捕获（自动记录 ErrorEvent 和指标）
app.use(routeErrorHandler)

// 最终错误处理（确保 CORS 头在错误响应中也存在）
app.use((err: ExpressError, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({
    method: req.method,
    path: req.url,
    err: err.message || err.type || 'unknown',
    stack: isProduction ? undefined : err.stack,
  }, 'express error handler')

  // 手动设置 CORS 头，确保错误响应也能通过浏览器 CORS 检查
  const origin = req.headers.origin
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  // payload 超限错误
  if (err.type === 'entity.too.large') {
    return errorResponse(res, 413, CommonErrorCodes.PAYLOAD_TOO_LARGE)
  }
  // JSON 解析错误
  if (err.type === 'entity.parse.failed' || (err.status === 400 && err.message?.includes('JSON'))) {
    return errorResponse(res, 400, CommonErrorCodes.JSON_PARSE_FAILED)
  }
  return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
})

// 启动定时任务（封面清理等）
initScheduler()

// 注册事件处理器
initEventHandlers()

// 启动告警引擎（15分钟定时扫描）
startAlertEngine()

// 启动时同步 tier 配置（将 v3.0 硬编码配置自动写入/更新到数据库）
syncTierConfigs().catch((err) => {
  logger.warn({ err: err instanceof Error ? err.message : String(err) }, '启动时 tier 配置同步失败')
})

// 启动元数据队列消费者（Redis 持久化队列，测试环境跳过避免阻塞进程）
if (process.env.NODE_ENV !== 'test') {
  import('./services/metadata-queue').then(({ startMetadataQueueConsumer, startRetryQueueProcessor }) => {
    startMetadataQueueConsumer().catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, '元数据队列消费者启动失败')
    })
    // 启动 5 分钟重试队列扫描器（反爬平台先放空再放行场景）
    startRetryQueueProcessor()
  })

  // 预热 BrowserPool（避免首次解析时 puppeteer.launch 冷启动 ~1s 延迟）
  // 异步执行，不阻塞 server 启动
  setTimeout(() => {
    import('./services/browser-pool').then(({ warmupBrowserPool }) => {
      warmupBrowserPool()
    }).catch((err) => {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[Startup] 加载 BrowserPool 失败')
    })
  }, 1000) // 延迟 1s 启动，不阻塞 server ready
}

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 API服务运行在 http://0.0.0.0:${PORT}`)
  logger.info(`📋 CORS允许来源: ${CORS_ORIGINS.join(', ')}`)
  logger.info(`🔗 分享基础URL: ${SHARE_BASE_URL}`)
  if (process.env.CLOUDFLARE_WORKER_URL) {
    logger.info(`☁️  Cloudflare Worker: ${process.env.CLOUDFLARE_WORKER_URL}`)
  } else {
    logger.info(`☁️  Cloudflare Worker: 未配置（跳过降级）`)
  }
})

// 设置服务器超时（防止大请求挂起）
server.timeout = 120000 // 2分钟
server.headersTimeout = 60000 // header超时1分钟
server.keepAliveTimeout = 65000

// 防止未处理的异常导致进程崩溃
server.on('error', (error: Error) => {
  logger.error({ err: error.message, stack: error.stack }, 'server error')
})

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error.message, stack: error.stack }, 'uncaught exception')
  // 不退出进程，让 PM2 处理重启
})

process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason instanceof Error ? reason.message : String(reason) }, 'unhandled rejection')
})

// 优雅关闭：先关闭 HTTP server，再关闭浏览器池，最后断开数据库连接
function gracefulShutdown(signal: string) {
  logger.info(`收到 ${signal}，正在优雅关闭...`)
  const timeout = setTimeout(() => {
    logger.error('优雅关闭超时，强制退出')
    process.exit(1)
  }, 15000) // 增加到 15 秒，给浏览器池更多关闭时间

  server.close(async () => {
    clearTimeout(timeout)
    logger.info('HTTP server 已关闭')

    // 关闭浏览器池
    try {
      const { shutdownBrowserPool } = await import('./services/browser-pool')
      await shutdownBrowserPool()
      logger.info('浏览器池已关闭')
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, '浏览器池关闭失败')
    }

    // 断开数据库连接
    try {
      await prisma.$disconnect()
      logger.info('数据库连接已断开')
      process.exit(0)
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : err }, '断开数据库连接失败')
      process.exit(1)
    }
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export { prisma }
export { app }
