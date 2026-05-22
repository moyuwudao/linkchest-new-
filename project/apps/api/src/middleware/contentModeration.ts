/**
 * 内容审核中间件（国内市场专用）
 * 基于腾讯云内容安全 API
 * 对用户生成的内容（收藏标题、笔记、标签、分享描述等）进行审核
 *
 * 仅在 MARKET=china 时启用
 */

import type { Request, Response, NextFunction } from 'express'
import { isChinaMarket } from '../lib/market'
import logger from '../lib/logger'

// 腾讯云内容安全配置
const TENCENTCLOUD_SECRET_ID = process.env.TENCENTCLOUD_SECRET_ID || ''
const TENCENTCLOUD_SECRET_KEY = process.env.TENCENTCLOUD_SECRET_KEY || ''
const TMS_REGION = process.env.TMS_REGION || 'ap-beijing'

interface ModerationResult {
  safe: boolean
  label?: string
  suggestion?: string
  confidence?: number
}

/**
 * 调用腾讯云内容安全 API 进行文本审核
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  if (!TENCENTCLOUD_SECRET_ID || !TENCENTCLOUD_SECRET_KEY) {
    logger.warn('Tencent Cloud TMS not configured, skipping moderation')
    return { safe: true }
  }

  try {
    // TODO: 接入腾讯云内容安全（TMS）API
    // 参考文档: https://cloud.tencent.com/document/product/1124
    // 使用 tencentcloud-sdk-nodejs 调用 TextModeration 接口

    // 占位实现：直接通过
    return { safe: true }
  } catch (error) {
    logger.error({ error, text: text.slice(0, 100) }, 'Content moderation failed')
    // 审核失败时默认放行（避免阻塞正常业务），但记录日志告警
    return { safe: true }
  }
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
    // 仅在海外市场启用
    if (!isChinaMarket()) {
      return next()
    }

    try {
      for (const field of fields) {
        const value = req.body[field]
        if (typeof value === 'string' && value.trim()) {
          const result = await moderateText(value)
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
      logger.error({ error, fields }, 'Content moderation middleware error')
      // 中间件异常时放行，避免阻塞正常业务
      next()
    }
  }
}

/**
 * 批量内容审核（用于分享广场等场景）
 */
export async function moderateBatch(texts: string[]): Promise<ModerationResult[]> {
  return Promise.all(texts.map((text) => moderateText(text)))
}
