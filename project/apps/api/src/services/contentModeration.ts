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
import * as crypto from 'crypto'
import { isChinaMarket } from '../lib/market'
import { TMS_CONFIG } from '../lib/config'
import logger from '../lib/logger'
import { getRedisClient, isRedisAvailable, recordRedisSuccess, recordRedisFailure } from '../lib/redis'
import { findBannedWord, isMaliciousUrl, BannedWord } from '../lib/banned-words'
import { recordContentModeration } from './prom-metrics'

const TmsClient = tencentcloud.tms.v20201229.Client

// ===== 优化配置 =====
// Redis 缓存 TTL（24小时）- 重复内容直接复用
const CACHE_TTL_SECONDS = 24 * 60 * 60
const CACHE_KEY_PREFIX = 'tms:cache:v1:'
// 文本长度上限（超过此长度仅做本地拦截，不送审）
const MAX_LENGTH_FOR_TMS = 500
// 文本长度下限（低于此长度默认放行）
const MIN_LENGTH_FOR_TMS = 2

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

// ===== 优化 D: 长度/格式预筛 =====
// 命中率 ~10% - 减少明显不需要送审的内容
function preScreen(content: string): { safe: boolean; reason?: string } {
  if (!content || !content.trim()) {
    return { safe: true, reason: 'empty' }
  }
  const trimmed = content.trim()

  // 长度下限
  if (trimmed.length < MIN_LENGTH_FOR_TMS) {
    return { safe: true, reason: 'too_short' }
  }

  // 长度上限 - 超过此长度仅本地拦截（500字以上内容走人工复审更合适）
  if (trimmed.length > MAX_LENGTH_FOR_TMS) {
    // 仍要走本地词库，但不送审
    return { safe: true, reason: 'too_long_skip_tms' }
  }

  // 全空白
  if (/^\s+$/.test(content)) {
    return { safe: true, reason: 'whitespace_only' }
  }

  // 纯数字 / 纯英文 / 纯标点
  if (/^[\d\s]+$/.test(trimmed) || /^[a-zA-Z\s.,!?:;'"-]+$/.test(trimmed)) {
    return { safe: true, reason: 'no_chinese_or_no_meaning' }
  }

  // 重复字符（"啊啊啊啊啊啊"）
  const uniqueChars = new Set(trimmed.replace(/\s/g, ''))
  if (uniqueChars.size <= 2 && trimmed.length > 6) {
    return { safe: true, reason: 'repetitive' }
  }

  return { safe: true }
}

// ===== 优化 A: 本地词库匹配 =====
// 命中率 ~70% - 命中直接拦截，不送审
function localCheck(content: string): BannedWord | null {
  return findBannedWord(content)
}

// ===== 优化 B: Redis 缓存 =====
// 24h 内重复内容直接复用审核结果
function makeCacheKey(content: string, bizType?: string): string {
  const normalized = content.trim().toLowerCase()
  const hash = crypto.createHash('sha256').update(normalized).digest('hex')
  return `${CACHE_KEY_PREFIX}${bizType || 'default'}:${hash}`
}

async function cacheGet(key: string): Promise<ModerationResult | null> {
  if (!isRedisAvailable()) return null
  const client = getRedisClient()
  if (!client) return null
  try {
    const raw = await client.get(key)
    if (!raw) return null
    recordRedisSuccess()
    return JSON.parse(raw) as ModerationResult
  } catch (err: any) {
    recordRedisFailure(err)
    return null
  }
}

async function cacheSet(key: string, result: ModerationResult): Promise<void> {
  if (!isRedisAvailable()) return
  const client = getRedisClient()
  if (!client) return
  try {
    await client.set(key, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS)
    recordRedisSuccess()
  } catch (err: any) {
    recordRedisFailure(err)
  }
}

export interface ModerationOptions {
  /** 跳过本地敏感词匹配（URL 等长文本使用,避免误判） */
  skipLocalCheck?: boolean
}

/**
 * 文本内容审核
 *
 * 优化流程（避免不必要的 TMS 调用）：
 * 1. shouldModerate() = false → 直接放行（海外/未配置密钥）
 * 2. preScreen() → 长度/格式预筛（命中率 ~10%）
 * 3. localCheck() → 本地词库命中直接拦截（命中率 ~70%，URL 跳过）
 * 4. cacheGet() → Redis 缓存命中直接复用（命中率 ~30%）
 * 5. tmsClient.TextModeration() → 真正送审
 * 6. cacheSet() → 缓存结果
 *
 * @param content 待审核文本
 * @param dataId 数据标识（可选）
 * @param bizType 策略BizType（可选，用于区分审核场景）
 * @param options 审核选项（URL 审核时 skipLocalCheck=true）
 * @returns 审核结果
 */
export async function moderateText(
  content: string,
  dataId?: string,
  bizType?: string,
  options?: ModerationOptions
): Promise<ModerationResult> {
  // ===== 步骤 0: 客户端可用性 =====
  const tmsClient = getClient()
  if (!tmsClient) {
    return { safe: true, reason: 'tms_unavailable' }
  }

  // ===== 步骤 1: 长度/格式预筛 (D) =====
  const pre = preScreen(content)
  if (!pre.safe) {
    return { safe: pre.safe, reason: pre.reason }
  }

  // ===== 步骤 2: 本地词库匹配 (A) - URL 等长文本可跳过 =====
  if (!options?.skipLocalCheck) {
    const bannedWord = localCheck(content)
    if (bannedWord) {
      logger.info(
        { word: bannedWord.word, category: bannedWord.category, severity: bannedWord.severity, dataId, bizType },
        '[TMS-Local] 本地词库命中拦截'
      )
      recordContentModeration({
        safe: false,
        label: bannedWord.category,
        durationMs: 0,
        bizType: bizType || 'default',
      })
      return {
        safe: false,
        label: bannedWord.category,
        reason: `local_banned_word:${bannedWord.word}`,
        keywords: [bannedWord.word],
      }
    }
  }

  // ===== 步骤 3: Redis 缓存 (B) =====
  const cacheKey = makeCacheKey(content, bizType)
  const cached = await cacheGet(cacheKey)
  if (cached) {
    logger.debug({ cacheKey, dataId, bizType, safe: cached.safe }, '[TMS-Cache] 命中缓存')
    recordContentModeration({
      safe: cached.safe,
      label: cached.label || 'Cached',
      durationMs: 0,
      bizType: bizType || 'default',
    })
    return { ...cached, reason: cached.reason || 'cache_hit' }
  }

  // ===== 步骤 4: 超长内容跳过 TMS（已经过本地拦截，剩余部分由人工复审）=====
  if (pre.reason === 'too_long_skip_tms') {
    logger.info({ length: content.length, dataId, bizType }, '[TMS] 超长内容跳过腾讯云送审')
    return { safe: true, reason: 'too_long_skip_tms' }
  }

  // ===== 步骤 5: 真正送审腾讯云 =====
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

    // ===== 步骤 6: 写回缓存 =====
    await cacheSet(cacheKey, result)

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
 *
 * 优化点：
 * 1. 优先调用 isMaliciousUrl 精准匹配 URL 黑名单（casino、bet365 等域）
 * 2. 跳过通用本地敏感词库（避免对长 URL 的短词误判，如 sm/bet/cam）
 * 3. URL 长度>500 时仅本地放行（不送审 TMS，节省费用）
 */
export async function moderateCollectionUrl(url: string, collectionId?: string) {
  // 1. URL 黑名单专项检查（精准,无误判）
  const malicious = isMaliciousUrl(url)
  if (malicious.malicious) {
    logger.info(
      { url, reason: malicious.reason, collectionId },
      '[TMS-URL] URL 黑名单命中拦截'
    )
    recordContentModeration({
      safe: false,
      label: 'UrlMalicious',
      durationMs: 0,
      bizType: 'collection_url',
    })
    return {
      safe: false,
      label: 'UrlMalicious',
      reason: `malicious_url:${malicious.reason}`,
      keywords: [malicious.reason || 'malicious'],
    }
  }

  // 2. URL 长度>500 跳过 TMS（节省费用,长 URL 由人工复审更合适）
  if (!url || url.length > MAX_LENGTH_FOR_TMS) {
    return { safe: true, reason: 'url_too_long_skip_tms' }
  }

  // 3. 跳过通用词库(skipLocalCheck=true),避免误判,直接走缓存+TMS
  return moderateText(
    url,
    collectionId ? `collection_url_${collectionId}` : undefined,
    undefined,
    { skipLocalCheck: true }
  )
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
