/**
 * 内容审核中间件（国内市场专用）
 * 基于腾讯云内容安全 (TMS) API
 * 对用户生成的内容（收藏标题、笔记、标签、分享描述等）进行审核
 *
 * ⚠️ 此中间件已废弃 (2026-06-07)
 * 实际调用统一在 services/contentModeration.ts 中完成
 * 此处仅保留中间件 API 用于向后兼容,内部已重定向到 services
 * 路由层应直接 import { moderateCollectionTitle, ... } from '../services/contentModeration'
 *
 * 仅在 MARKET=china 时启用
 */

import type { Request, Response, NextFunction } from 'express'
import { isChinaMarket } from '../lib/market'
import { moderateText, type ModerationResult } from '../services/contentModeration'

/**
 * 调用腾讯云内容安全 API 进行文本审核
 * @deprecated 请直接使用 services/contentModeration 中的 moderateText
 */
export async function moderateTextMiddleware(text: string): Promise<ModerationResult> {
  return moderateText(text)
}

/**
 * 内容审核中间件
 * 对请求中的指定字段进行审核
 *
 * 用法:
 * router.post('/collections', contentModeration(['title', 'note']), async (req, res) => { ... })
 */
export function contentModeration(fields: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 仅在国内市场启用
    if (!isChinaMarket()) {
      return next()
    }

    try {
      for (const field of fields) {
        const value = req.body[field]
        if (typeof value === 'string' && value.trim()) {
          const result = await moderateText(value, `middleware_${field}_${req.userId || 'anon'}`)
          if (!result.safe) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'ERR_CONTENT_VIOLATION',
                message: `内容审核未通过: ${result.suggestion || '包含违规内容'}`,
                field,
                label: result.label,
              },
            })
          }
        }
      }
      next()
    } catch (error) {
      // 中间件异常时放行,避免阻塞正常业务
      next()
    }
  }
}

/**
 * 批量内容审核（用于分享广场等场景）
 * @deprecated 请直接使用 services/contentModeration 中的 moderateTextBatch
 */
export async function moderateBatch(texts: string[]): Promise<ModerationResult[]> {
  const results = await Promise.all(
    texts.map((text, i) => moderateText(text, `batch_${i}`))
  )
  return results
}
