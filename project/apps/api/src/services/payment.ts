import prisma from '../lib/prisma'
import { type UserTier, type BillingCycle } from '../lib/config'
import { getTierPricing } from './tierConfig'
import { emitEvent } from '../lib/eventBus'
import { triggerReferralReward } from '../routes/referrals'
import logger from '../lib/logger'

/**
 * 支付成功后的统一处理逻辑
 * 1. 创建新 Subscription 记录（additive：不覆盖其他 tier 的订阅）
 * 2. 延长用户对应 tier 的到期时间
 * 3. 触发邀请奖励（如果被邀请人首次升级）
 * 4. 清除用户缓存
 */
export async function processPaymentSuccess(params: {
  userId: string
  tier: Exclude<UserTier, 'medium'>
  billingCycle: BillingCycle
  source: 'paypal' | 'wechat_pay' | 'alipay' | 'apple_iap' | 'google_pay' | 'google_play_billing'
  sourceTransactionId: string
  priceCny: number
  priceUsd: number
  expiresAt: Date
  autoRenew?: boolean
}) {
  const { userId, tier, billingCycle, source, sourceTransactionId, priceCny, priceUsd, expiresAt, autoRenew } = params
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // 1. 创建新订阅记录（additive，每个 tier 独立）
    await tx.subscription.create({
      data: {
        userId,
        tier,
        billingCycle,
        status: 'active',
        autoRenew: autoRenew ?? false,
        priceCny,
        priceUsd,
        source,
        sourceTransactionId,
        startedAt: now,
        expiresAt,
      },
    })

    // 2. 根据 tier 延长对应的到期时间（additive：未过期则叠加，已过期则重新计算）
    //    核心规则：旗舰版优先消耗，专业版在旗舰版之后顺延
    //    - 购买 super 时：heavy 剩余时间顺延至 super 到期之后
    //    - 购买 heavy 时：若 super 仍有效，heavy 从 super 到期后开始计算
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { heavyExpiresAt: true, superExpiresAt: true },
    })

    const field = tier === 'heavy' ? 'heavyExpiresAt' : 'superExpiresAt'
    const currentExpiry = tier === 'heavy' ? user?.heavyExpiresAt : user?.superExpiresAt
    const purchaseDurationMs = expiresAt.getTime() - now.getTime()

    // 购买 heavy 时：若 super 仍有效，heavy 应从 super 到期后开始
    let newExpiry: Date
    if (tier === 'heavy' && user?.superExpiresAt && user.superExpiresAt > now) {
      // super 仍有效，heavy 从 super 到期后开始计算
      const heavyCurrentValid = currentExpiry && currentExpiry > user.superExpiresAt ? currentExpiry : user.superExpiresAt
      newExpiry = new Date(heavyCurrentValid.getTime() + purchaseDurationMs)
    } else {
      // 普通叠加逻辑：未过期则叠加，已过期则重新计算
      newExpiry = currentExpiry && currentExpiry > now
        ? new Date(currentExpiry.getTime() + purchaseDurationMs)
        : expiresAt
    }

    // 计算各 tier 的新到期时间
    let updatedHeavy = tier === 'heavy' ? newExpiry : user?.heavyExpiresAt
    const updatedSuper = tier === 'super' ? newExpiry : user?.superExpiresAt

    // super 购买/续费时，顺延 heavy 的剩余时间
    if (tier === 'super' && user?.heavyExpiresAt && user.heavyExpiresAt > now) {
      const heavyRemainingMs = user.heavyExpiresAt.getTime() - now.getTime()
      updatedHeavy = new Date(newExpiry.getTime() + heavyRemainingMs)
    }

    const superValid = updatedSuper ? updatedSuper > now : false
    const heavyValid = !superValid && updatedHeavy ? updatedHeavy > now : false
    const newTier = superValid ? 'super' : heavyValid ? 'heavy' : 'medium'

    await tx.user.update({
      where: { id: userId },
      data: {
        [field]: newExpiry,
        ...(updatedHeavy !== user?.heavyExpiresAt ? { heavyExpiresAt: updatedHeavy } : {}),
        userTier: newTier,
      },
    })
  })

  // 3. 触发邀请奖励（异步，失败不影响主流程）
  try {
    await triggerReferralReward(userId, tier)
  } catch (err) {
    logger.warn({ userId, tier, err: (err as Error).message }, '触发邀请奖励失败')
  }

  // 4. 清除用户缓存（让下次请求拉取最新 tier）
  try {
    const { getRedisClient } = await import('../lib/redis')
    const redis = getRedisClient()
    if (redis) {
      await redis.del(`lc:user:${userId}:safe`)
    }
  } catch {
    // 缓存清除失败不影响主流程
  }

  logger.info({
    userId,
    tier,
    billingCycle,
    source,
    sourceTransactionId,
    expiresAt: expiresAt.toISOString(),
  }, '支付成功，用户已升级')

  // 发布支付成功事件（异步通知、缓存清理等）
  emitEvent('payment:success', {
    userId,
    tier,
    billingCycle,
    source,
    transactionId: sourceTransactionId,
    priceCny,
    priceUsd,
    expiresAt,
  })

  return { success: true }
}

/**
 * 根据 tier 和计费周期计算价格和到期时间
 * [MODIFIED] 优先读取 admin 后台配置的 tier 定价
 */
export async function getPaymentDetails(tier: Exclude<UserTier, 'medium'>, billingCycle: BillingCycle) {
  const pricing = await getTierPricing(tier)
  const price = pricing[billingCycle]

  const now = new Date()
  const expiresAt = new Date(now)
  if (billingCycle === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }

  return {
    priceCny: price.cny ?? 0,
    priceUsd: price.usd,
    expiresAt,
  }
}

/**
 * 验证用户是否可以购买指定套餐
 * [MODIFIED] 支持 additive 购买：用户可以同时拥有 heavy 和 super，super 优先生效
 */
export async function validatePurchaseEligibility(userId: string, tier: UserTier) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userTier: true, heavyExpiresAt: true, superExpiresAt: true },
  })

  if (!user) {
    return { valid: false, reason: 'USER_NOT_FOUND' as const }
  }

  // additive 模式下允许购买任意 tier，前端负责提醒"仅可以新增"
  return { valid: true, user }
}
