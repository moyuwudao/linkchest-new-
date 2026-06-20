import prisma from '../lib/prisma'
import { getRedisClient } from '../lib/redis'
import logger from '../lib/logger'
import { type UserTier, type QuotaLimits } from '../lib/config'
import { getQuotaConfig, getTierDisplayName } from './tierConfig'
import { QuotaErrorCodes, errorResponse, AuthErrorCodes } from '../lib/errorCodes'
import type { QuotaErrorCode } from '../lib/errorCodes'
import type { Prisma } from '@prisma/client'

// 数值型配额字段（用于 checkQuota 检查）
export type ResourceType = 'collections' | 'tags' | 'lists' | 'shares' | 'shareItems' | 'coverImages' | 'coverImagesDaily' | 'maxItemsPerShare' | 'dailyImportLimit' | 'metadataDailyLimit' | 'trashRetentionDays'

const QUOTA_CACHE_TTL_SECONDS = 300 // 5 分钟（原 60s 太短，频繁失效导致 6 个 count 查询）

const QUOTA_CODE_MAP: Record<ResourceType, QuotaErrorCode> = {
  collections: QuotaErrorCodes.QUOTA_COLLECTIONS_EXCEEDED,
  tags: QuotaErrorCodes.QUOTA_TAGS_EXCEEDED,
  lists: QuotaErrorCodes.QUOTA_LISTS_EXCEEDED,
  shares: QuotaErrorCodes.QUOTA_SHARES_EXCEEDED,
  shareItems: QuotaErrorCodes.QUOTA_SHARE_ITEMS_EXCEEDED,
  coverImages: QuotaErrorCodes.QUOTA_COVER_IMAGES_EXCEEDED,
  coverImagesDaily: QuotaErrorCodes.QUOTA_COVER_IMAGES_EXCEEDED,
  maxItemsPerShare: QuotaErrorCodes.SHARE_ITEMS_PER_SHARE_EXCEEDED,
  dailyImportLimit: QuotaErrorCodes.QUOTA_DAILY_IMPORT_EXCEEDED,
  metadataDailyLimit: QuotaErrorCodes.QUOTA_METADATA_DAILY_EXCEEDED,
  trashRetentionDays: QuotaErrorCodes.QUOTA_LISTS_EXCEEDED, // 纯配置项，不用于检查
}

function quotaCacheKey(userId: string): string {
  return `lc:quota:${userId}:usage`
}

/**
 * 主动更新用户配额缓存（写操作后调用）
 * 优化：不再删除缓存（删除导致下次请求重新跑 6 个 count 查询），
 * 而是异步重新计算并写入缓存，下次请求直接命中。
 *
 * ⚠️ 关键：必须强制 skipCache=true 重新查 DB，否则 getQuotaUsage
 *    会从脏缓存读旧值再写回，导致缓存永远不更新（配额失效）
 */
export async function invalidateQuotaCache(userId: string): Promise<void> {
  // 异步重新计算配额并更新缓存（不阻塞调用方）
  // ⭐ 强制跳过缓存，确保从数据库重新查询最新计数
  getQuotaUsage(userId, prisma, true)
    .then((data) => {
      setCachedQuotaUsage(userId, data).catch(() => {})
    })
    .catch(() => {
      // 重新计算失败时降级：删除缓存，下次请求重新计算
      const redis = getRedisClient()
      if (redis) {
        redis.del(quotaCacheKey(userId)).catch(() => {})
      }
    })
}

interface QuotaUsageData {
  tier: UserTier
  planNameZh: string
  planNameEn: string
  subscriptionStatus: string | null
  heavyExpiresAt: Date | null
  superExpiresAt: Date | null
  limits: QuotaLimits
  usage: Record<ResourceType, number>
}

async function getCachedQuotaUsage(userId: string): Promise<QuotaUsageData | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    const raw = await redis.get(quotaCacheKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as QuotaUsageData
  } catch {
    return null
  }
}

async function setCachedQuotaUsage(userId: string, data: QuotaUsageData): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.setex(quotaCacheKey(userId), QUOTA_CACHE_TTL_SECONDS, JSON.stringify(data))
  } catch {
    // 缓存写入失败不影响主流程
  }
}

/**
 * 获取用户当前配额使用情况
 */
export async function getQuotaUsage(
  userId: string,
  txClient: Prisma.TransactionClient = prisma,
  skipCache: boolean = false
): Promise<QuotaUsageData> {
  const gu0 = Date.now()
  // 优先从 Redis 缓存读取（无事务场景下 + 未显式要求跳过缓存）
  if (txClient === prisma && !skipCache) {
    const cached = await getCachedQuotaUsage(userId)
    logger.info({ step: 'getQuotaUsage.getCachedQuotaUsage', ms: Date.now() - gu0, hit: !!cached }, '[quota] timing')
    if (cached) {
      // limits 可能在管理后台已更新，实时重新获取最新配置
      const t1 = Date.now()
      const freshLimits = await getQuotaConfig(cached.tier)
      logger.info({ step: 'getQuotaUsage.getQuotaConfig', ms: Date.now() - t1 }, '[quota] timing')
      return { ...cached, limits: freshLimits }
    }
  }

  let user: { userTier: string | null; heavyExpiresAt: Date | null; superExpiresAt: Date | null } | null = null
  try {
    user = await txClient.user.findUnique({
      where: { id: userId },
      select: { userTier: true, heavyExpiresAt: true, superExpiresAt: true },
    })
  } catch (err) {
    logger.warn({ userId, err: (err as Error).message }, 'getQuotaUsage: 查询用户失败，降级到 medium')
  }

  const tier = (user?.userTier as UserTier) || 'medium'
  const displayName = await getTierDisplayName(tier)
  const limits = await getQuotaConfig(tier)

  const [
    collections,
    tags,
    lists,
    shares,
    shareItems,
    coverImages,
  ] = await Promise.all([
    txClient.collection.count({ where: { userId, deletedAt: null } }).catch(() => 0),
    txClient.tag.count({ where: { userId } }).catch(() => 0),
    txClient.list.count({ where: { userId } }).catch(() => 0),
    txClient.share.count({ where: { userId } }).catch(() => 0),
    txClient.shareItem.count({
      where: { share: { userId } },
    }).catch(() => 0),
    txClient.coverImage.count({ where: { userId } }).catch(() => 0),
  ])

  // 读取每日导入配额使用量（Redis 计数器）
  let dailyImportLimit = 0
  const redis = getRedisClient()
  if (redis) {
    const dailyCount = await redis.get(DAILY_QUOTA_KEY(userId))
    dailyImportLimit = parseInt(dailyCount || '0', 10)
  } else {
    // Redis 不可用时降级：读数据库计数（List 的 sourceType='import'）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dailyImportLimit = await txClient.list.count({
      where: { userId, sourceType: 'import', createdAt: { gte: today } }
    }).catch(() => 0)
  }

  // 读取日上传封面配额使用量（Redis 计数器）
  let coverImagesDaily = 0
  if (redis) {
    const coverDailyCount = await redis.get(`lc:cover:daily:${userId}:${new Date().toISOString().slice(0, 10)}`)
    coverImagesDaily = parseInt(coverDailyCount || '0', 10)
  }

  // 读取元数据日抓取配额使用量（Redis 计数器）
  let metadataDailyLimit = 0
  if (redis) {
    const metaDailyCount = await redis.get(`lc:meta:daily:${userId}:${new Date().toISOString().slice(0, 10)}`)
    metadataDailyLimit = parseInt(metaDailyCount || '0', 10)
  }

  const now = new Date()
  const superValid = user?.superExpiresAt ? user.superExpiresAt > now : false
  const heavyValid = !superValid && user?.heavyExpiresAt ? user.heavyExpiresAt > now : false
  const activeTierExpiry = superValid ? user?.superExpiresAt : heavyValid ? user?.heavyExpiresAt : null

  const result: QuotaUsageData = {
    tier,
    planNameZh: displayName.nameZh,
    planNameEn: displayName.nameEn,
    subscriptionStatus: activeTierExpiry ? 'active' : null,
    heavyExpiresAt: user?.heavyExpiresAt ?? null,
    superExpiresAt: user?.superExpiresAt ?? null,
    limits,
    usage: {
      collections,
      tags,
      lists,
      shares,
      shareItems,
      coverImages,
      coverImagesDaily,
      maxItemsPerShare: 0,
      dailyImportLimit,
      metadataDailyLimit,
      trashRetentionDays: 0,
    },
  }

  // 非事务场景下写入缓存
  if (txClient === prisma) {
    setCachedQuotaUsage(userId, result).catch(() => {})
  }

  return result
}

/**
 * 检查配额是否超限
 * @returns null 表示未超限，否则返回标准错误码
 */
export async function checkQuota(
  userId: string,
  resourceType: ResourceType,
  increment = 1,
  txClient: Prisma.TransactionClient = prisma
): Promise<QuotaErrorCode | null> {
  const qt0 = Date.now()
  const { limits, usage } = await getQuotaUsage(userId, txClient)
  logger.info({ step: 'checkQuota.getQuotaUsage', ms: Date.now() - qt0, userId, resourceType }, '[quota] timing')
  const limit = limits[resourceType]
  const current = usage[resourceType]

  if (current + increment > limit) {
    return QUOTA_CODE_MAP[resourceType]
  }
  return null
}

/**
 * 批量检查配额（用于导入场景）
 */
export async function checkQuotaBatch(
  userId: string,
  requirements: Partial<Record<ResourceType, number>>,
  txClient: Prisma.TransactionClient = prisma
): Promise<QuotaErrorCode | null> {
  const { limits, usage } = await getQuotaUsage(userId, txClient)

  for (const [resourceType, required] of Object.entries(requirements) as [ResourceType, number][]) {
    if (!required) continue
    const limit = limits[resourceType]
    const current = usage[resourceType]
    if (current + required > limit) {
      return QUOTA_CODE_MAP[resourceType]
    }
  }
  return null
}

// ===== 每日配额检查（基于 Redis 计数器） =====

const DAILY_QUOTA_KEY = (userId: string, date?: string) => {
  const d = date || new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `lc:daily_quota:${userId}:dailyImportLimit:${d}`
}

/** 元数据日抓取计数 key（与 metadata-queue.ts 中保持一致） */
const META_DAILY_KEY = (userId: string, date?: string) => {
  const d = date || new Date().toISOString().slice(0, 10)
  return `lc:meta:daily:${userId}:${d}`
}

/**
 * 检查每日导入配额是否超限
 * @returns null 表示未超限，否则返回错误码
 */
export async function checkDailyQuota(
  userId: string,
  increment = 1
): Promise<QuotaErrorCode | null> {
  const { limits } = await getQuotaUsage(userId)
  const limit = limits.dailyImportLimit

  const redis = getRedisClient()
  if (!redis) {
    // Redis 不可用时降级：读数据库计数（List 的 sourceType='import'）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const count = await prisma.list.count({
      where: { userId, sourceType: 'import', createdAt: { gte: today } }
    })
    if (count + increment > limit) return QuotaErrorCodes.QUOTA_DAILY_IMPORT_EXCEEDED
    return null
  }

  const current = parseInt(await redis.get(DAILY_QUOTA_KEY(userId)) || '0', 10)
  if (current + increment > limit) {
    return QuotaErrorCodes.QUOTA_DAILY_IMPORT_EXCEEDED
  }
  return null
}

/**
 * 增加每日导入配额计数
 */
export async function incrementDailyQuota(
  userId: string,
  increment = 1
): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  const key = DAILY_QUOTA_KEY(userId)
  const pipeline = redis.pipeline()
  pipeline.incrby(key, increment)
  // 设置当天过期（到第二天 00:00 后自动失效）
  const tomorrow = new Date()
  tomorrow.setHours(24, 0, 0, 0)
  const ttlSeconds = Math.ceil((tomorrow.getTime() - Date.now()) / 1000)
  pipeline.expire(key, ttlSeconds)
  await pipeline.exec().catch(() => {})
}

/**
 * 检查用户元数据日抓取配额
 * 用于入队前预先判断是否需要降级
 * @returns true 表示已达上限（应降级为非 PP 抓取）
 */
export async function isMetadataDailyLimitReached(userId: string): Promise<boolean> {
  try {
    const { limits } = await getQuotaUsage(userId)
    const limit = limits.metadataDailyLimit
    const redis = getRedisClient()
    if (!redis) return false
    const current = parseInt(await redis.get(META_DAILY_KEY(userId)) || '0', 10)
    return current >= limit
  } catch {
    return false
  }
}

/**
 * 增加用户元数据日抓取计数（PP 实际启动时调用）
 * 与 metadata-queue.ts 的 incrementMetadataDailyUsage 保持一致
 */
export async function incrementMetadataDailyLimit(userId: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  const key = META_DAILY_KEY(userId)
  try {
    await redis.incr(key)
    const tomorrow = new Date()
    tomorrow.setHours(24, 0, 0, 0)
    const ttlSeconds = Math.max(60, Math.ceil((tomorrow.getTime() - Date.now()) / 1000))
    await redis.expire(key, ttlSeconds)
  } catch {
    // 失败不影响主流程
  }
}

import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth'

/**
 * Express 中间件：配额检查
 */
export function requireQuota(resourceType: ResourceType, increment = 1) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id
    if (!userId) {
      return errorResponse(res, 401, AuthErrorCodes.UNAUTHORIZED)
    }

    const error = await checkQuota(userId, resourceType, increment)
    if (error) {
      return errorResponse(res, 403, error)
    }

    next()
  }
}
