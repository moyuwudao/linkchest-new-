import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { errorResponse, CommonErrorCodes, AuthErrorCodes, ReferralErrorCodes } from '../lib/errorCodes'
import { getRedisClient } from '../lib/redis'
import { referralCodeGeneratedTotal, referralRegistrationTotal, referralRewardGivenTotal } from '../services/prom-metrics'
import logger from '../lib/logger'

const router = Router()

// 6位邀请码字符集（去除易混淆字符）
const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// 邀请码防刷：单IP 24小时最大被邀请注册次数
const REFERRAL_IP_MAX_PER_DAY = 5
const REFERRAL_IP_WINDOW_SECONDS = 24 * 60 * 60

// 邀请奖励天数（从环境变量读取，默认7天）
const REFERRAL_REWARD_DAYS = parseInt(process.env.REFERRAL_REWARD_DAYS || '7', 10)

// 生成6位字母数字邀请码
function generateReferralCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += REFERRAL_CHARS.charAt(Math.floor(Math.random() * REFERRAL_CHARS.length))
  }
  return code
}

// 检查邀请码是否可用
async function isCodeAvailable(code: string): Promise<boolean> {
  const existing = await prisma.referralCode.findUnique({ where: { code } })
  return !existing
}

// 验证邀请码（内部通用逻辑）
export async function validateReferralCode(code: string): Promise<{
  valid: boolean
  referralCode?: { id: string; userId: string; code: string; maxUses: number; useCount: number; expiresAt: Date | null; isActive: boolean }
  errorCode?: typeof ReferralErrorCodes[keyof typeof ReferralErrorCodes]
}> {
  if (!code || typeof code !== 'string') {
    return { valid: false, errorCode: ReferralErrorCodes.REFERRAL_CODE_NOT_FOUND }
  }

  const upperCode = code.toUpperCase()
  const referralCode = await prisma.referralCode.findUnique({
    where: { code: upperCode },
  })

  if (!referralCode) {
    return { valid: false, errorCode: ReferralErrorCodes.REFERRAL_CODE_NOT_FOUND }
  }

  if (!referralCode.isActive) {
    return { valid: false, errorCode: ReferralErrorCodes.REFERRAL_CODE_INACTIVE }
  }

  if (referralCode.expiresAt && new Date() > referralCode.expiresAt) {
    return { valid: false, errorCode: ReferralErrorCodes.REFERRAL_CODE_EXPIRED }
  }

  if (referralCode.maxUses > 0 && referralCode.useCount >= referralCode.maxUses) {
    return { valid: false, errorCode: ReferralErrorCodes.REFERRAL_CODE_MAX_USES_REACHED }
  }

  return { valid: true, referralCode }
}

// 检查IP邀请防刷
export async function checkReferralIpLimit(ip: string): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis) return true // Redis 不可用时跳过（降级）

  const key = `lc:referral:ip:${ip}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, REFERRAL_IP_WINDOW_SECONDS)
  }
  return count <= REFERRAL_IP_MAX_PER_DAY
}

// 计算用户当前有效等级（super > heavy > medium）
export async function computeUserTier(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { heavyExpiresAt: true, superExpiresAt: true },
  })
  if (!user) return 'medium'

  const now = new Date()
  const superValid = user.superExpiresAt ? user.superExpiresAt > now : false
  const heavyValid = user.heavyExpiresAt ? user.heavyExpiresAt > now : false

  if (superValid) return 'super'
  if (heavyValid) return 'heavy'
  return 'medium'
}

// 发放邀请奖励（仅给邀请人，根据被邀请人购买的 tier 给对应天数）
export async function giveReferralReward(
  referrerId: string,
  tier: 'heavy' | 'super'
): Promise<void> {
  const now = new Date()
  const rewardMs = REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000

  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { heavyExpiresAt: true, superExpiresAt: true },
  })

  if (!referrer) return

  const field = tier === 'heavy' ? 'heavyExpiresAt' : 'superExpiresAt'
  const currentExpiry = tier === 'heavy' ? referrer.heavyExpiresAt : referrer.superExpiresAt

  const newExpiry = currentExpiry && currentExpiry > now
    ? new Date(currentExpiry.getTime() + rewardMs)
    : new Date(now.getTime() + rewardMs)

  // 构造更新数据：super 奖励需同时顺延 heavy 剩余时间
  const data: Record<string, unknown> = {
    [field]: newExpiry,
    userTier: await computeUserTier(referrerId),
  }

  if (tier === 'super' && referrer.heavyExpiresAt && referrer.heavyExpiresAt > now) {
    const heavyRemainingMs = referrer.heavyExpiresAt.getTime() - now.getTime()
    data.heavyExpiresAt = new Date(newExpiry.getTime() + heavyRemainingMs)
  }

  await prisma.user.update({
    where: { id: referrerId },
    data,
  })

  referralRewardGivenTotal.inc({ type: tier })
  logger.info({ referrerId, tier, days: REFERRAL_REWARD_DAYS, newExpiry }, '邀请奖励已发放')
}

// 注册时使用邀请码（仅创建使用记录，不发放奖励）
export async function useReferralCode(
  code: string,
  refereeId: string,
  ip: string,
  userAgent?: string
): Promise<{ success: boolean; errorCode?: typeof ReferralErrorCodes[keyof typeof ReferralErrorCodes] }> {
  const validation = await validateReferralCode(code)
  if (!validation.valid || !validation.referralCode) {
    return { success: false, errorCode: validation.errorCode }
  }

  const referralCode = validation.referralCode

  // 不能邀请自己
  if (referralCode.userId === refereeId) {
    return { success: false, errorCode: ReferralErrorCodes.REFERRAL_ALREADY_INVITED }
  }

  // 检查该用户是否已被邀请过
  const existingUse = await prisma.referralUse.findUnique({ where: { refereeId } })
  if (existingUse) {
    return { success: false, errorCode: ReferralErrorCodes.REFERRAL_ALREADY_INVITED }
  }

  // 检查IP防刷
  const ipAllowed = await checkReferralIpLimit(ip)
  if (!ipAllowed) {
    return { success: false, errorCode: ReferralErrorCodes.REFERRAL_IP_LIMIT_REACHED }
  }

  // 事务：创建使用记录 + 更新邀请码计数
  try {
    await prisma.$transaction(async (tx) => {
      await tx.referralUse.create({
        data: {
          referralCodeId: referralCode.id,
          refereeId,
          useIp: ip,
          userAgent: userAgent || null,
        },
      })

      await tx.referralCode.update({
        where: { id: referralCode.id },
        data: { useCount: { increment: 1 } },
      })
    })

    referralRegistrationTotal.inc()
    return { success: true }
  } catch (err) {
    logger.warn({ code, refereeId, err: (err as Error).message }, '邀请码使用事务失败')
    return { success: false, errorCode: ReferralErrorCodes.REFERRAL_REWARD_FAILED }
  }
}

// 触发邀请奖励（在支付成功时调用）
export async function triggerReferralReward(refereeId: string, tier: 'heavy' | 'super'): Promise<void> {
  const referralUse = await prisma.referralUse.findUnique({
    where: { refereeId },
    include: { referralCode: { select: { userId: true } } },
  })

  if (!referralUse || !referralUse.referralCode) return
  if (referralUse.rewardTriggered) return

  await prisma.$transaction(async (tx) => {
    await tx.referralUse.update({
      where: { id: referralUse.id },
      data: {
        rewardTriggered: true,
        rewardType: 'subscription_extension',
        rewardValue: REFERRAL_REWARD_DAYS,
        rewardGivenAt: new Date(),
        status: 'rewarded',
      },
    })

    await giveReferralReward(referralUse.referralCode.userId, tier)
  })
}

// ========== 路由 ==========

// 生成/获取当前用户的邀请码
router.post('/code', authenticate, async (req: AuthenticatedRequest, res) => {
  const reqId = req.reqId
  try {
    const userId = req.user?.id
    if (!userId) {
      return errorResponse(res, 401, AuthErrorCodes.UNAUTHORIZED)
    }

    // 检查是否已有邀请码
    const existing = await prisma.referralCode.findUnique({
      where: { userId },
    })

    if (existing) {
      return res.json({
        data: {
          code: existing.code,
          maxUses: existing.maxUses,
          useCount: existing.useCount,
          expiresAt: existing.expiresAt,
          isActive: existing.isActive,
        },
      })
    }

    // 生成唯一邀请码（最多重试20次）
    let code = generateReferralCode()
    let attempts = 0
    while (attempts < 20) {
      const available = await isCodeAvailable(code)
      if (available) break
      code = generateReferralCode()
      attempts++
    }

    const referralCode = await prisma.referralCode.create({
      data: { userId, code },
    })

    referralCodeGeneratedTotal.inc()
    logger.info({ reqId, userId, code }, '生成邀请码')

    res.json({
      data: {
        code: referralCode.code,
        maxUses: referralCode.maxUses,
        useCount: referralCode.useCount,
        expiresAt: referralCode.expiresAt,
        isActive: referralCode.isActive,
      },
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ reqId, err: err.message }, '生成邀请码失败')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

// 获取我的邀请统计
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res) => {
  const reqId = req.reqId
  try {
    const userId = req.user?.id
    if (!userId) {
      return errorResponse(res, 401, AuthErrorCodes.UNAUTHORIZED)
    }

    const referralCode = await prisma.referralCode.findUnique({
      where: { userId },
      include: {
        uses: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            status: true,
            rewardTriggered: true,
            rewardType: true,
            rewardValue: true,
            rewardGivenAt: true,
            useIp: true,
            createdAt: true,
            referee: { select: { nickname: true, email: true, createdAt: true, userTier: true } },
          },
        },
      },
    })

    if (!referralCode) {
      return res.json({
        data: {
          code: null,
          totalInvited: 0,
          upgradedCount: 0,
          totalRewardDays: 0,
          uses: [],
        },
      })
    }

    const totalInvited = referralCode.uses.length
    const upgradedCount = referralCode.uses.filter(u => u.rewardTriggered).length
    const totalRewardDays = referralCode.uses.reduce((sum, u) => sum + (u.rewardValue || 0), 0)

    res.json({
      data: {
        code: referralCode.code,
        maxUses: referralCode.maxUses,
        useCount: referralCode.useCount,
        isActive: referralCode.isActive,
        totalInvited,
        upgradedCount,
        totalRewardDays,
        uses: referralCode.uses.map(u => ({
          id: u.id,
          status: u.status,
          rewardTriggered: u.rewardTriggered,
          rewardType: u.rewardType,
          rewardValue: u.rewardValue,
          rewardGivenAt: u.rewardGivenAt,
          useIp: u.useIp,
          createdAt: u.createdAt,
          refereeNickname: u.referee?.nickname || null,
          refereeEmail: u.referee?.email || null,
          refereeTier: u.referee?.userTier || null,
          registeredAt: u.referee?.createdAt || null,
        })),
      },
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ reqId, err: err.message }, '获取邀请统计失败')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

// 验证邀请码（注册时使用）
router.post('/verify', async (req, res) => {
  const reqId = req.reqId
  try {
    const { code } = req.body
    const validation = await validateReferralCode(code)

    if (!validation.valid) {
      return errorResponse(res, 400, validation.errorCode!)
    }

    const referrer = await prisma.user.findUnique({
      where: { id: validation.referralCode!.userId },
      select: { nickname: true },
    })

    res.json({
      data: {
        valid: true,
        referrerNickname: referrer?.nickname || null,
      },
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ reqId, err: err.message }, '验证邀请码失败')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

export default router
