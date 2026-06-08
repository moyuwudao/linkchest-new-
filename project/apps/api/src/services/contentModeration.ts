/**
 * 腾讯云内容安全 (TMS) 服务
 * 文本内容审核封装
 *
 * 修复记录 (2026-06-07):
 * - 修复环境变量名 TENCENT_* → TENCENTCLOUD_* (与项目其他服务保持一致)
 * - 添加 isChinaMarket() 判断，海外市场不调用 API
 * - 统一 region 配置通过 TMS_REGION 环境变量
 * - 补全 nickname / tag / url 审核函数
 * - 添加 metrics 上报 (调用次数 / 拒绝次数 / 耗时)
 */

import * as tencentcloud from 'tencentcloud-sdk-nodejs'
import { isChinaMarket } from '../lib/market'
import { TMS_CONFIG } from '../lib/config'
import logger from '../lib/logger'
import { recordContentModeration } from './prom-metrics'

const TmsClient = tencentcloud.tms.v20201229.Client

// 初始化客户端（仅国内市场 + 已配置密钥时）
let client: any = null

function getClient() {
  // 海外市场不初始化客户端
  if (!isChinaMarket()) return null

  if (!client) {
    if (!TMS_CONFIG.secretId || !TMS_CONFIG.secretKey) {
      logger.warn('[TMS] 未配置腾讯云密钥,内容审核降级为放行')
      return null
    }

    client = new TmsClient({
      credential: {
        secretId: TMS_CONFIG.secretId,
        secretKey: TMS_CONFIG.secretKey,
      },
      region: TMS_CONFIG.region,
      profile: {
        signMethod: 'TC3-HMAC-SHA256',
        httpProfile: {
          reqMethod: 'POST',
          reqTimeout: 30,
        },
      },
    })
  }
  return client
}

export interface ModerationResult {
  safe: boolean
  label?: string
  confidence?: number
  keywords?: string[]
  suggestion?: string
  reason?: string
}

// 国内市场 + 客户端可用时才审核
function shouldModerate(): boolean {
  return isChinaMarket() && getClient() !== null
}

/**
 * 文本内容审核
 * @param content 待审核文本
 * @param dataId 数据标识（可选）
 * @param bizType 策略BizType（可选，用于区分审核场景）
 * @returns 审核结果
 */
export async function moderateText(
  content: string,
  dataId?: string,
  bizType?: string
): Promise<ModerationResult> {
  const tmsClient = getClient()

  // 未配置或海外市场时默认放行
  if (!tmsClient) {
    return { safe: true, reason: 'tms_unavailable' }
  }

  // 空内容直接放行
  if (!content || content.trim().length === 0) {
    return { safe: true, reason: 'empty_content' }
  }

  const start = Date.now()
  let result: ModerationResult = { safe: true }

  try {
    const params: any = {
      Content: Buffer.from(content).toString('base64'),
    }

    if (dataId) {
      params.DataId = dataId
    }

    if (bizType) {
      params.BizType = bizType
    }

    const response = await tmsClient.TextModeration(params)

    // 解析结果
    // Suggestion: Pass / Block / Review
    const suggestion = response.Suggestion
    const label = response.Label
    const confidence = response.Confidence
    const keywords = response.Keywords || []

    result = {
      safe: suggestion === 'Pass',
      label,
      confidence,
      keywords,
      suggestion,
    }

    // 上报指标
    recordContentModeration({
      safe: result.safe,
      label: label || 'Unknown',
      durationMs: Date.now() - start,
      bizType: bizType || 'default',
    })

    return result
  } catch (error: any) {
    logger.error({ error: error.message, dataId, bizType }, '[TMS] 审核失败')
    // 上报失败指标
    recordContentModeration({
      safe: true,
      label: 'Error',
      durationMs: Date.now() - start,
      bizType: bizType || 'default',
      error: true,
    })
    // 审核失败时默认放行,避免阻塞业务
    return { safe: true, reason: 'tms_error' }
  }
}

/**
 * 批量文本审核
 * @param items { id, content } 数组
 * @returns 审核结果数组
 */
export async function moderateTextBatch(
  items: Array<{ id: string; content: string }>
): Promise<Array<{ id: string; result: ModerationResult }>> {
  // 海外或无客户端时,全部放行
  if (!shouldModerate()) {
    return items.map((item) => ({ id: item.id, result: { safe: true, reason: 'tms_unavailable' } }))
  }

  const results = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      result: await moderateText(item.content, item.id),
    }))
  )
  return results
}

/**
 * 审核用户昵称
 */
export async function moderateNickname(nickname: string, userId: string) {
  return moderateText(nickname, `nickname_${userId}`)
}

/**
 * 审核用户简介/备注
 */
export async function moderateBio(bio: string, userId: string) {
  return moderateText(bio, `bio_${userId}`)
}

/**
 * 审核收藏标题
 */
export async function moderateCollectionTitle(title: string, collectionId?: string) {
  return moderateText(title, collectionId ? `collection_title_${collectionId}` : undefined)
}

/**
 * 审核收藏备注
 */
export async function moderateCollectionNote(note: string, collectionId?: string) {
  return moderateText(note, collectionId ? `collection_note_${collectionId}` : undefined)
}

/**
 * 审核收藏 URL（链接本身,检查是否含恶意域或违规内容）
 */
export async function moderateCollectionUrl(url: string, collectionId?: string) {
  return moderateText(url, collectionId ? `collection_url_${collectionId}` : undefined)
}

/**
 * 审核收藏标签
 */
export async function moderateCollectionTag(tag: string, collectionId?: string) {
  // 标签通常较短 (<20字符),长度过滤避免误判
  if (tag.length > 20) {
    return { safe: false, label: 'TagTooLong', reason: 'tag_too_long' }
  }
  return moderateText(tag, collectionId ? `collection_tag_${collectionId}` : undefined)
}

// 分享内容审核策略 BizType
const SHARE_BIZ_TYPE = 'share_content'

/**
 * 审核分享标题
 */
export async function moderateShareTitle(title: string, shareId?: string) {
  return moderateText(title, shareId ? `share_title_${shareId}` : undefined, SHARE_BIZ_TYPE)
}

/**
 * 审核分享描述
 */
export async function moderateShareDescription(description: string, shareId?: string) {
  return moderateText(description, shareId ? `share_desc_${shareId}` : undefined, SHARE_BIZ_TYPE)
}

/**
 * 审核分享中嵌入的链接
 */
export async function moderateShareUrl(url: string, shareId?: string) {
  return moderateText(url, shareId ? `share_url_${shareId}` : undefined, SHARE_BIZ_TYPE)
}

/**
 * 通用审核:对一段文本数组进行审核,只要有一个不安全就返回不安全
 */
export async function moderateAny(contents: string[], dataIdPrefix: string): Promise<ModerationResult> {
  if (!shouldModerate()) {
    return { safe: true, reason: 'tms_unavailable' }
  }

  for (let i = 0; i < contents.length; i++) {
    const content = contents[i]
    if (!content || content.trim().length === 0) continue

    const result = await moderateText(content, `${dataIdPrefix}_${i}`)
    if (!result.safe) {
      return { ...result, label: `${result.label || 'Unknown'}_at_${i}` }
    }
  }
  return { safe: true }
}
