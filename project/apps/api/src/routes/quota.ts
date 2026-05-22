import { Router } from 'express'
import logger from '../lib/logger'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { getQuotaUsage } from '../services/quota'
import { QuotaErrorCodes, errorResponse } from '../lib/errorCodes'

const router = Router()

// 获取当前用户配额使用情况
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const result = await getQuotaUsage(userId)
    res.json({ data: result })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取配额错误')
    errorResponse(res, 500, QuotaErrorCodes.QUOTA_FETCH_FAILED)
  }
})

export default router
