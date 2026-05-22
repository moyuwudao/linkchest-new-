import { Router } from 'express'
import logger from '../lib/logger'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { getSubscriptionPlans, getSubscriptionStatus } from '../services/subscription'
import { SubscriptionErrorCodes, errorResponse } from '../lib/errorCodes'

const router = Router()

// 获取套餐列表和定价（公开，无需认证）
router.get('/plans', async (_req, res) => {
  try {
    const plans = await getSubscriptionPlans()
    res.json({ data: { plans } })
  } catch (error: unknown) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取套餐列表错误')
    errorResponse(res, 500, SubscriptionErrorCodes.SUBSCRIPTION_FETCH_FAILED)
  }
})

// 获取当前用户订阅状态
router.get('/status', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const result = await getSubscriptionStatus(userId)
    res.json({ data: result })
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message
    logger.error({ err: message || String(error) }, '获取订阅状态错误')
    if (message === SubscriptionErrorCodes.SUBSCRIPTION_NOT_FOUND) {
      return errorResponse(res, 404, SubscriptionErrorCodes.SUBSCRIPTION_NOT_FOUND)
    }
    errorResponse(res, 500, SubscriptionErrorCodes.SUBSCRIPTION_FETCH_FAILED)
  }
})

export default router
