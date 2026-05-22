import { Router } from 'express'
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth'
import { processPaymentSuccess, getPaymentDetails, validatePurchaseEligibility } from '../../services/payment'
import { recordPaymentSuccess } from '../../services/prom-metrics'
import { errorResponse, CommonErrorCodes } from '../../lib/errorCodes'
import logger from '../../lib/logger'
import { getPaymentProvider } from '../../providers/payment'

const router = Router()

/**
 * POST /api/payments/wechat/create-order
 * 创建微信支付订单
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

    const provider = await getPaymentProvider('wechat_pay')
    if (!provider.isConfigured()) {
      return errorResponse(res, 503, CommonErrorCodes.SERVER_ERROR, '微信支付未配置')
    }

    const result = await provider.createOrder({ userId, tier, billingCycle })

    res.json({ success: true, data: result })
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '微信支付创建订单失败')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

/**
 * POST /api/payments/wechat/capture
 * 查询并确认微信支付订单
 */
router.post('/capture', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, tier, billingCycle } = req.body
    const userId = req.user.id

    if (!orderId || !tier || !billingCycle) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
    }

    const provider = await getPaymentProvider('wechat_pay')
    if (!provider.isConfigured()) {
      return errorResponse(res, 503, CommonErrorCodes.SERVER_ERROR, '微信支付未配置')
    }

    const result = await provider.capturePayment({ userId, orderId, tier, billingCycle })

    if (!result.success) {
      return errorResponse(res, 400, CommonErrorCodes.SERVER_ERROR, '微信支付未完成')
    }

    const details = await getPaymentDetails(tier as any, billingCycle as any)

    await processPaymentSuccess({
      userId,
      tier: tier as any,
      billingCycle: billingCycle as any,
      source: 'wechat_pay',
      sourceTransactionId: result.transactionId,
      priceCny: details.priceCny,
      priceUsd: details.priceUsd,
      expiresAt: details.expiresAt,
    })

    recordPaymentSuccess('wechat_pay', tier, details.priceUsd)

    res.json({ success: true, data: { transactionId: result.transactionId } })
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '微信支付确认失败')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

/**
 * POST /api/payments/wechat/notify
 * 微信支付异步回调通知
 */
router.post('/notify', async (req, res) => {
  try {
    const provider = await getPaymentProvider('wechat_pay')
    const verification = await provider.verifyWebhook?.(req.headers, JSON.stringify(req.body))

    if (!verification || !verification.valid) {
      logger.warn('微信支付回调签名验证失败')
      return res.status(400).send('fail')
    }

    // TODO: 解析回调数据，处理支付成功逻辑
    // 微信支付回调数据结构较复杂，需要解析加密数据
    logger.info({ body: req.body }, '收到微信支付回调')

    res.status(200).send('success')
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '微信支付回调处理失败')
    res.status(500).send('fail')
  }
})

export default router
