/**
 * 市场守卫中间件
 * 拦截未在当前市场启用的 Provider 请求
 * 防止跨市场功能误调用
 */

import type { Request, Response, NextFunction } from 'express'
import { MarketGuardError, getMarketErrorCode } from '../lib/market'
import { CommonErrorCodes } from '@linkchest/i18n'

/**
 * 市场守卫中间件
 * 用于支付/认证路由前，检查请求的 Provider 是否在当前市场可用
 *
 * 用法:
 * router.post('/create-order', marketGuard('payment'), async (req, res) => { ... })
 */
export function marketGuard(type: 'payment' | 'auth') {
  return (req: Request, res: Response, next: NextFunction) => {
    // 从请求体或查询参数中获取 provider
    const provider = req.body.provider || req.query.provider || req.params.provider

    if (!provider) {
      // 如果没有指定 provider，让路由自己处理
      return next()
    }

    try {
      const { assertProviderEnabled } = require('../lib/market')
      assertProviderEnabled(type, provider)
      next()
    } catch (error) {
      if (error instanceof MarketGuardError) {
        return res.status(403).json({
          success: false,
          error: {
            code: getMarketErrorCode(),
            message: error.message,
          },
        })
      }
      next(error)
    }
  }
}

/**
 * 市场守卫包装器（用于直接调用场景）
 */
export function withMarketGuard<T extends (...args: any[]) => any>(
  type: 'payment' | 'auth',
  provider: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const { assertProviderEnabled } = await import('../lib/market')
    assertProviderEnabled(type, provider)
    return fn(...args)
  }) as T
}
