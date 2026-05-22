import { Router } from 'express'
import logger from '../lib/logger'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { getAllTierConfigs, getTierConfig } from '../services/tierConfig'
import { getSubscriptionStatus } from '../services/subscription'
import { getQuotaUsage } from '../services/quota'
import { TierErrorCodes, errorResponse } from '../lib/errorCodes'
import { QUOTA_CONFIG, type UserTier } from '../lib/config'
import type { ResourceType } from '../services/quota'

const router = Router()

// 获取所有等级列表（公开，无需认证）
router.get('/', async (_req, res) => {
  try {
    const tiers = await getAllTierConfigs()
    res.json({
      data: tiers.map(t => ({
        key: t.key,
        nameZh: t.nameZh,
        nameEn: t.nameEn,
        description: t.description,
        sortOrder: t.sortOrder,
        isActive: t.isActive,
        limits: t.quotaConfig,
        pricing: t.pricingConfig,
        benefits: t.benefits,
      })),
      _debug: { count: tiers.length, source: tiers[0]?.id?.startsWith('fallback') ? 'fallback' : 'db' },
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '获取等级列表错误')
    errorResponse(res, 500, TierErrorCodes.TIER_FETCH_FAILED)
  }
})

// 获取当前用户等级详情（需认证）
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const [subResult, quotaResult, configsResult] = await Promise.allSettled([
      getSubscriptionStatus(userId),
      getQuotaUsage(userId),
      getAllTierConfigs(),
    ])

    if (subResult.status === 'rejected') {
      logger.warn({ userId, err: subResult.reason instanceof Error ? subResult.reason.message : String(subResult.reason) }, '/tiers/me: getSubscriptionStatus 失败，使用降级数据')
    }
    if (quotaResult.status === 'rejected') {
      logger.warn({ userId, err: quotaResult.reason instanceof Error ? quotaResult.reason.message : String(quotaResult.reason) }, '/tiers/me: getQuotaUsage 失败，使用降级数据')
    }
    if (configsResult.status === 'rejected') {
      logger.warn({ userId, err: configsResult.reason instanceof Error ? configsResult.reason.message : String(configsResult.reason) }, '/tiers/me: getAllTierConfigs 失败，使用降级数据')
    }

    const subscriptionStatus = subResult.status === 'fulfilled' ? subResult.value : {
      tier: 'medium' as UserTier,
      planNameZh: '基础版',
      planNameEn: 'Free',
      heavyExpiresAt: null,
      superExpiresAt: null,
      subscription: null,
    }

    const quotaData = quotaResult.status === 'fulfilled' ? quotaResult.value : {
      tier: subscriptionStatus.tier,
      planNameZh: subscriptionStatus.planNameZh,
      planNameEn: subscriptionStatus.planNameEn,
      subscriptionStatus: null,
      heavyExpiresAt: null,
      superExpiresAt: null,
      limits: QUOTA_CONFIG[subscriptionStatus.tier],
      usage: {
        collections: 0, tags: 0, lists: 0, shares: 0,
        shareItems: 0, coverImages: 0, coverImagesDaily: 0,
        maxItemsPerShare: 0, dailyImportLimit: 0,
        metadataDailyLimit: 0, trashRetentionDays: 0,
      } as Record<ResourceType, number>,
    }

    const tierConfigs = configsResult.status === 'fulfilled' ? configsResult.value : []

    const currentTier = await getTierConfig(subscriptionStatus.tier)

    res.json({
      data: {
        tier: subscriptionStatus.tier,
        planNameZh: subscriptionStatus.planNameZh,
        planNameEn: subscriptionStatus.planNameEn,
        heavyExpiresAt: subscriptionStatus.heavyExpiresAt,
        superExpiresAt: subscriptionStatus.superExpiresAt,
        subscription: subscriptionStatus.subscription,
        limits: quotaData.limits,
        usage: quotaData.usage,
        benefits: currentTier?.benefits || [],
        allTiers: tierConfigs.map(t => ({
          key: t.key,
          nameZh: t.nameZh,
          nameEn: t.nameEn,
          description: t.description,
          isActive: t.isActive,
          sortOrder: t.sortOrder,
          limits: t.quotaConfig,
          pricing: t.pricingConfig,
          benefits: t.benefits,
        })),
      },
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message, userId }, '获取用户等级详情错误')
    errorResponse(res, 500, TierErrorCodes.TIER_FETCH_FAILED)
  }
})

export default router
