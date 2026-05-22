/**
 * Apple IAP 支付路由
 * 处理 iOS 应用内购买的收据验证
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { processPaymentSuccess } from '../../services/payment'
import logger from '../../lib/logger'
import type { Request, Response } from 'express'

const router = Router()

// 验证 Apple IAP 收据
router.post('/verify', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const { receipt, tier, billingCycle } = req.body

  if (!receipt) {
    return res.status(400).json({ success: false, error: 'Receipt is required' })
  }
  if (!tier || !billingCycle) {
    return res.status(400).json({ success: false, error: 'Tier and billingCycle are required' })
  }

  try {
    const { getPaymentProvider } = await import('../../providers/payment')
    const provider = await getPaymentProvider('apple_iap')

    if (!provider.isConfigured()) {
      logger.error({}, '[Apple IAP] Apple IAP not configured')
      return res.status(500).json({ success: false, error: 'Apple IAP not configured' })
    }

    const result = await provider.capturePayment({
      userId,
      orderId: receipt,
      tier,
      billingCycle,
    })

    if (result.success) {
      // 处理支付成功
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
        source: 'apple_iap',
        sourceTransactionId: result.transactionId,
        priceCny: 0, // Apple IAP 使用 Apple 定价
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
        error: 'Receipt verification failed',
        details: result.rawResponse,
      })
    }
  } catch (err) {
    logger.error({ err: (err as Error).message, userId }, 'Apple IAP verification error')
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
