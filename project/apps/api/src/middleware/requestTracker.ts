/**
 * 请求追踪中间件
 * - 结构化日志记录（pino JSON）
 * - Redis 指标计数（请求量/错误数/响应时间/状态码分布）
 * - 错误自动捕获并写入 ErrorEvent 表
 */
import type { Request, Response, NextFunction } from 'express'
import logger, { generateReqId } from '../lib/logger'
import { recordRequestMetrics, recordErrorMetrics } from '../services/metrics'
import prisma from '../lib/prisma'

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      reqId?: string
      startTime?: number
    }
  }
}

/**
 * 请求追踪中间件
 * 放在所有路由之前，用于记录请求指标
 */
export function requestTracker(req: Request, res: Response, next: NextFunction) {
  const reqId = generateReqId()
  req.reqId = reqId
  req.startTime = Date.now()

  const childLogger = logger.child({ reqId })
  childLogger.info({
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
  }, 'request started')

  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now())
    const statusCode = res.statusCode
    const isError = statusCode >= 500

    childLogger.info({
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      userId: req.userId,
    }, 'request completed')

    // 异步记录 Redis 指标（不阻塞响应）
    recordRequestMetrics({
      method: req.method,
      path: req.path,
      statusCode,
      duration,
      isError,
    }).catch((err: Error) => {
      logger.warn({ err: err.message }, 'metrics record failed')
    })

    // 5xx 错误自动写入数据库
    if (isError) {
      persistErrorEvent({
        // 优先使用路由层设置的实际错误消息，否则使用通用消息
        message: (res.locals.errorMessage as string) || `Server error ${statusCode}`,
        path: req.path,
        method: req.method,
        statusCode,
        userId: req.userId,
        ip: req.ip || req.socket.remoteAddress,
        reqId,
      }).catch((err: Error) => {
        logger.warn({ err: err.message }, 'error persistence failed')
      })
    }
  })

  next()
}

/**
 * 路由级错误捕获中间件
 * 放在所有路由之后，捕获业务路由抛出的错误
 */
interface RouteError extends Error {
  status?: number
  errorCode?: string
}

export function routeErrorHandler(err: RouteError, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.status || 500
  const errorCode = err.errorCode

  logger.error({
    reqId: req.reqId,
    method: req.method,
    path: req.path,
    statusCode,
    errorCode,
    err: err.message,
    stack: isProduction ? undefined : err.stack,
  }, 'route error')

  // 异步写入错误事件
  persistErrorEvent({
    errorCode: errorCode || undefined,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
    userId: req.userId,
    ip: req.ip || req.socket.remoteAddress,
    reqId: req.reqId,
  }).catch(() => { /* ignore */ })

  // 记录错误指标
  recordErrorMetrics({
    method: req.method,
    path: req.path,
    statusCode,
  }).catch(() => { /* ignore */ })

  next(err)
}

const isProduction = process.env.NODE_ENV === 'production'

interface PersistErrorParams {
  errorCode?: string
  message: string
  stack?: string
  path?: string
  method?: string
  statusCode?: number
  userId?: string
  ip?: string
  reqId?: string
}

/**
 * 将错误写入 ErrorEvent 表（聚合计数模式）
 * 相同 errorCode + path + statusCode 的错误会更新计数，而非创建新记录
 */
async function persistErrorEvent(params: PersistErrorParams) {
  const { errorCode, message, stack, path, method, statusCode, userId, ip, reqId } = params

  const key = `${errorCode || 'UNKNOWN'}:${path || 'unknown'}:${statusCode || 0}`

  try {
    // 尝试查找已有记录（最近 24 小时内）
    const existing = await prisma.errorEvent.findFirst({
      where: {
        errorCode: errorCode || null,
        path: path || null,
        statusCode: statusCode || null,
        firstAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { lastAt: 'desc' },
    })

    if (existing) {
      // 更新计数和最后出现时间
      await prisma.errorEvent.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastAt: new Date(),
          // 保留最新的堆栈信息
          stack: stack || existing.stack,
        },
      })
    } else {
      // 创建新记录
      await prisma.errorEvent.create({
        data: {
          errorCode: errorCode || null,
          message: message.slice(0, 2000), // 限制长度
          stack: stack?.slice(0, 5000) || null,
          path: path || null,
          method: method || null,
          statusCode: statusCode || null,
          userId: userId || null,
          ip: ip || null,
          metadata: reqId ? { reqId } : undefined,
        },
      })
    }
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'persistErrorEvent failed')
  }
}
