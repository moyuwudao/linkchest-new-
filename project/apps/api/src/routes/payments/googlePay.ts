/**
 * Google Pay Web 支付路由
 * 处理 Google Pay Web 端支付
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { processPaymentSuccess } from '../../services/payment'
import logger from '../../lib/logger'
import type { Request, Response } from 'express'

const router = Router()

// 创建支付订单（返回 Stripe PaymentIntent clientSecret）
router.post('/create-order', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const { tier, billingCycle } = req.body

  if (!tier || !billingCycle) {
    return res.status(400).json({ success: false, error: 'Tier and billingCycle are required' })
  }

  try {
    const { getPaymentProvider } = await import('../../providers/payment')
    const provider = await getPaymentProvider('google_pay')

    if (!provider.isConfigured()) {
      logger.error({}, '[Google Pay] Google Pay not configured')
      return res.status(500).json({ success: false, error: 'Google Pay not configured' })
    }

    const result = await provider.createOrder({
      userId,
      tier,
      billingCycle,
    })

    res.json({
      success: true,
      data: {
        orderId: result.orderId,
        clientSecret: result.extra?.clientSecret,
        priceUsd: result.extra?.priceUsd,
        priceCny: result.extra?.priceCny,
      },
    })
  } catch (err) {
    logger.error({ err: (err as Error).message, userId }, 'Google Pay create order error')
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// 确认支付
router.post('/capture', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const { orderId, tier, billingCycle } = req.body

  if (!orderId || !tier || !billingCycle) {
    return res.status(400).json({ success: false, error: 'orderId, tier and billingCycle are required' })
  }

  try {
    const { getPaymentProvider } = await import('../../providers/payment')
    const provider = await getPaymentProvider('google_pay')

    if (!provider.isConfigured()) {
      logger.error({}, '[Google Pay] Google Pay not configured')
      return res.status(500).json({ success: false, error: 'Google Pay not configured' })
    }

    const result = await provider.capturePayment({
      userId,
      orderId,
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
        source: 'google_pay',
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
        error: 'Payment capture failed',
        details: result.rawResponse,
      })
    }
  } catch (err) {
    logger.error({ err: (err as Error).message, userId }, 'Google Pay capture error')
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
