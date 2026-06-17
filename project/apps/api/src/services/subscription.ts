import prisma from '../lib/prisma'
import { type UserTier, type BillingCycle } from '../lib/config'
import { getQuotaConfig, getTierDisplayName, getTierPricing } from './tierConfig'
import { SubscriptionErrorCodes } from '../lib/errorCodes'
import { emitEvent } from '../lib/eventBus'
import logger from '../lib/logger'

/**
 * 获取所有套餐列表（含定价和配额）
 */
export async function getSubscriptionPlans() {
  const tiers: UserTier[] = ['medium', 'heavy', 'super']

  const plans = await Promise.all(
    tiers.map(async tier => {
      const displayName = await getTierDisplayName(tier)
      const limits = await getQuotaConfig(tier)

      const plan: Record<string, unknown> = {
        tier,
        nameZh: displayName.nameZh,
        nameEn: displayName.nameEn,
        limits,
      }

      if (tier === 'medium') {
        // v4.2: 恢复月付+年付。medium 永远是 0
        plan.price = { monthly: 0, yearly: 0 }
      } else {
        const pricing = await getTierPricing(tier)
        // v4.2: 恢复 monthly 字段
        plan.price = {
          monthly: { cny: pricing.monthly.cny, usd: pricing.monthly.usd },
          yearly: { cny: pricing.yearly.cny, usd: pricing.yearly.usd },
        }
      }

      return plan
    })
  )

  return plans
}

/**
 * 获取用户当前订阅状态
 * [MODIFIED] 支持双 tier 到期时间（heavyExpiresAt / superExpiresAt）
 */
export async function getSubscriptionStatus(userId: string) {
  let user: { userTier: string | null; heavyExpiresAt: Date | null; superExpiresAt: Date | null } | null = null
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        userTier: true,
        heavyExpiresAt: true,
        superExpiresAt: true,
      },
    })
  } catch (err) {
    logger.warn({ userId, err: (err as Error).message }, 'getSubscriptionStatus: 查询用户失败，降级到默认值')
  }

  if (!user) {
    // 用户不存在时降级返回 medium（避免页面崩溃）
    const displayName = await getTierDisplayName('medium')
    return {
      tier: 'medium' as UserTier,
      planNameZh: displayName.nameZh,
      planNameEn: displayName.nameEn,
      heavyExpiresAt: null,
      superExpiresAt: null,
      subscription: null,
    }
  }

  const tier = (user.userTier as UserTier) || 'medium'
  const displayName = await getTierDisplayName(tier)

  // 查找活跃订阅（取最新的 active 订阅，additive 模式下可能有多个）
  let activeSubscription: {
    billingCycle: string
    status: string
    startedAt: Date
    expiresAt: Date
    source: string
    cancelledAt: Date | null
  } | null = null
  try {
    activeSubscription = await prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      orderBy: { expiresAt: 'desc' },
      select: {
        billingCycle: true,
        status: true,
        startedAt: true,
        expiresAt: true,
        source: true,
        cancelledAt: true,
      },
    })
  } catch {
    activeSubscription = null
  }

  return {
    tier,
    planNameZh: displayName.nameZh,
    planNameEn: displayName.nameEn,
    heavyExpiresAt: user.heavyExpiresAt,
    superExpiresAt: user.superExpiresAt,
    subscription: activeSubscription
      ? {
          billingCycle: activeSubscription.billingCycle as BillingCycle,
          status: activeSubscription.status,
          startedAt: activeSubscription.startedAt,
          expiresAt: activeSubscription.expiresAt,
          source: activeSubscription.source,
          cancelledAt: activeSubscription.cancelledAt,
        }
      : null,
  }
}

/**
 * 扫描并回退过期订阅
 * [MODIFIED] 基于 User.heavyExpiresAt / superExpiresAt 进行双 tier 过期检查
 * 由定时任务调用，返回处理的用户数
 */
export async function expireSubscriptions(): Promise<number> {
  const now = new Date()

  // 1. 将 Subscription 表中已过期的 active 记录标记为 expired
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'active',
      expiresAt: { lt: now },
    },
    select: { id: true, userId: true, tier: true },
  })

  for (const sub of expiredSubscriptions) {
    try {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' },
      })
    } catch (err) {
      logger.error({ subscriptionId: sub.id, err: (err as Error).message }, '标记订阅过期失败')
    }
  }

  // 2. 扫描 User 表，检查 heavyExpiresAt / superExpiresAt 是否过期并回退 userTier
  const usersToCheck = await prisma.user.findMany({
    where: {
      OR: [
        { heavyExpiresAt: { lt: now } },
        { superExpiresAt: { lt: now } },
      ],
    },
    select: { id: true, userTier: true, heavyExpiresAt: true, superExpiresAt: true },
  })

  let processed = 0

  for (const user of usersToCheck) {
    try {
      const superValid = user.superExpiresAt ? user.superExpiresAt > now : false
      const heavyValid = !superValid && user.heavyExpiresAt ? user.heavyExpiresAt > now : false
      const newTier = superValid ? 'super' : heavyValid ? 'heavy' : 'medium'

      // 只有当 userTier 需要变化时才更新
      if (user.userTier !== newTier) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            userTier: newTier,
            heavyExpiresAt: user.heavyExpiresAt && user.heavyExpiresAt <= now ? null : user.heavyExpiresAt,
            superExpiresAt: user.superExpiresAt && user.superExpiresAt <= now ? null : user.superExpiresAt,
          },
        })
        processed++

        emitEvent('subscription:expired', {
          userId: user.id,
          oldTier: user.userTier || 'medium',
          subscriptionId: user.id,
        })
      } else {
        // 即使 tier 没变，也清理已过期的字段
        const updateData: { heavyExpiresAt?: null; superExpiresAt?: null } = {}
        if (user.heavyExpiresAt && user.heavyExpiresAt <= now) updateData.heavyExpiresAt = null
        if (user.superExpiresAt && user.superExpiresAt <= now) updateData.superExpiresAt = null
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({ where: { id: user.id }, data: updateData })
        }
      }
    } catch (err) {
      logger.error({
        userId: user.id,
        err: err instanceof Error ? err.message : String(err),
      }, '回退过期订阅失败')
    }
  }

  logger.info({ processed }, '过期订阅回退完成')

  return processed
}
