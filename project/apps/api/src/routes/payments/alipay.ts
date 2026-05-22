import { Router } from 'express'
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth'
import { processPaymentSuccess, getPaymentDetails, validatePurchaseEligibility } from '../../services/payment'
import { recordPaymentSuccess } from '../../services/prom-metrics'
import { errorResponse, CommonErrorCodes } from '../../lib/errorCodes'
import logger from '../../lib/logger'
import { getPaymentProvider } from '../../providers/payment'

const router = Router()

/**
 * POST /api/payments/alipay/create-order
 * 创建支付宝支付订单
 */
router.post('/create-order', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { tier, billingCycle } = req.body
    const userId = req.user.id

    if (!tier || !billingCycle) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
    }

    const eligibility = await validatePurchaseEligibility(userId, tier)
    if (!eligibility.valid) {
      const errCode = eligibility.reason === 'USER_NOT_FOUND' ? CommonErrorCodes.NOT_FOUND : CommonErrorCodes.VALIDATION_FAILED
      return errorResponse(res, 400, errCode)
    }

    const provider = await getPaymentProvider('alipay')
    if (!provider.isConfigured()) {
      return errorResponse(res, 503, CommonErrorCodes.SERVER_ERROR, '支付宝支付未配置')
    }

    const result = await provider.createOrder({ userId, tier, billingCycle })

    res.json({ success: true, data: result })
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '支付宝创建订单失败')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

/**
 * POST /api/payments/alipay/capture
 * 查询并确认支付宝订单
 */
router.post('/capture', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, tier, billingCycle } = req.body
    const userId = req.user.id

    if (!orderId || !tier || !billingCycle) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
    }

    const provider = await getPaymentProvider('alipay')
    if (!provider.isConfigured()) {
      return errorResponse(res, 503, CommonErrorCodes.SERVER_ERROR, '支付宝支付未配置')
    }

    const result = await provider.capturePayment({ userId, orderId, tier, billingCycle })

    if (!result.success) {
      return errorResponse(res, 400, CommonErrorCodes.SERVER_ERROR, '支付宝支付未完成')
    }

    const details = await getPaymentDetails(tier as any, billingCycle as any)

    await processPaymentSuccess({
      userId,
      tier: tier as any,
      billingCycle: billingCycle as any,
      source: 'alipay',
      sourceTransactionId: result.transactionId,
      priceCny: details.priceCny,
      priceUsd: details.priceUsd,
      expiresAt: details.expiresAt,
    })

    recordPaymentSuccess('alipay', tier, details.priceUsd)

    res.json({ success: true, data: { transactionId: result.transactionId } })
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '支付宝确认支付失败')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

/**
 * POST /api/payments/alipay/notify
 * 支付宝异步回调通知
 */
router.post('/notify', async (req, res) => {
  try {
    const provider = await getPaymentProvider('alipay')
    const signature = req.body.sign as string
    const verification = await provider.verifyWebhook?.(req.body, signature)

    if (!verification || !verification.valid) {
      logger.warn('支付宝回调签名验证失败')
      return res.status(400).send('fail')
    }

    const event = verification.event as Record<string, unknown>
    const tradeStatus = event.trade_status as string

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      const attach = JSON.parse((event.body as string) || '{}')
      const { userId, tier, billingCycle } = attach

      if (userId && tier && billingCycle) {
        const details = await getPaymentDetails(tier as any, billingCycle as any)

        await processPaymentSuccess({
          userId,
          tier: tier as any,
          billingCycle: billingCycle as any,
          source: 'alipay',
          sourceTransactionId: event.trade_no as string,
          priceCny: details.priceCny,
          priceUsd: details.priceUsd,
          expiresAt: details.expiresAt,
        })

        recordPaymentSuccess('alipay', tier, details.priceUsd)
      }
    }

    res.status(200).send('success')
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '支付宝回调处理失败')
    res.status(500).send('fail')
  }
})

export default router
