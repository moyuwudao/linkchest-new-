/**
 * Google Play Billing 支付路由
 * 处理 Android 应用内购买验证
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { processPaymentSuccess } from '../../services/payment'
import logger from '../../lib/logger'
import type { Request, Response } from 'express'

const router = Router()

// 验证 Google Play 购买
router.post('/verify', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const { purchaseToken, tier, billingCycle } = req.body

  if (!purchaseToken) {
    return res.status(400).json({ success: false, error: 'purchaseToken is required' })
  }
  if (!tier || !billingCycle) {
    return res.status(400).json({ success: false, error: 'Tier and billingCycle are required' })
  }

  try {
    const { getPaymentProvider } = await import('../../providers/payment')
    const provider = await getPaymentProvider('google_play_billing')

    if (!provider.isConfigured()) {
      logger.error({}, '[Google Play Billing] Google Play Billing not configured')
      return res.status(500).json({ success: false, error: 'Google Play Billing not configured' })
    }

    const result = await provider.capturePayment({
      userId,
      orderId: purchaseToken,
      tier,
      billingCycle,
    })

    if (result.success) {
      const expiresAt = new Date()
      if (billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      await processPaymentSuccess({
        userId,
        tier,
        billingCycle,
        source: 'google_play_billing',
        sourceTransactionId: result.transactionId,
        priceCny: 0,
        priceUsd: 0,
        expiresAt,
      })

      res.json({
        success: true,
        data: {
          transactionId: result.transactionId,
        },
      })
    } else {
      res.status(400).json({
        success: false,
        error: 'Purchase verification failed',
        details: result.rawResponse,
      })
    }
  } catch (err) {
    logger.error({ err: (err as Error).message, userId }, 'Google Play Billing verification error')
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
