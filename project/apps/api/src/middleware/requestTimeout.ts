/**
 * 请求超时中间件
 * 为所有 HTTP 请求设置最大处理时间，防止请求挂死
 * 超时时返回 504 Gateway Timeout
 */
import type { Request, Response, NextFunction } from 'express'
import logger from '../lib/logger'
import { errorResponse, CommonErrorCodes } from '../lib/errorCodes'
import { recordTimeoutMetrics } from '../services/metrics'

// 默认请求超时时间（毫秒）
const DEFAULT_REQUEST_TIMEOUT_MS = 30000 // 30 秒

/**
 * 请求超时中间件
 * 在请求开始时设置定时器，超时后自动结束响应
 */
export function requestTimeout(timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now()

    // 设置响应超时定时器
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const duration = Date.now() - startTime
        logger.warn({
          method: req.method,
          path: req.path,
          query: req.query,
          duration,
          reqId: req.reqId,
        }, 'request timeout')

        // 记录超时指标到 Redis
        recordTimeoutMetrics({
          method: req.method,
          path: req.path,
          duration,
        }).catch(() => { /* ignore */ })

        res.locals.errorMessage = 'Request timeout'
        errorResponse(res, 504, CommonErrorCodes.REQUEST_TIMEOUT)
      }
    }, timeoutMs)

    // 响应完成时清除定时器
    res.on('finish', () => {
      clearTimeout(timeoutId)
    })

    // 响应关闭时清除定时器
    res.on('close', () => {
      clearTimeout(timeoutId)
    })

    next()
  }
}
