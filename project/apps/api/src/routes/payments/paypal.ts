import { Router } from 'express'
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth'
import { processPaymentSuccess, getPaymentDetails, validatePurchaseEligibility } from '../../services/payment'
import { recordPaymentSuccess } from '../../services/prom-metrics'
import { errorResponse, CommonErrorCodes } from '../../lib/errorCodes'
import logger from '../../lib/logger'

const router = Router()

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || ''
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

/**
 * 获取 PayPal Access Token
 */
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json() as { access_token: string; error?: string }
  if (!res.ok || data.error) {
    throw new Error(`PayPal auth failed: ${data.error || res.statusText}`)
  }
  return data.access_token
}

/**
 * POST /api/payments/paypal/create-order
 * 创建 PayPal 订单（支持一次性订单和订阅两种模式）
 */
router.post('/create-order', authenticate, async (req: AuthenticatedRequest, res) => {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    return errorResponse(res, 503, CommonErrorCodes.SERVER_ERROR, 'PayPal not configured')
  }

  try {
    const { tier, billingCycle, mode = 'one_time' } = req.body
    const userId = req.user.id

    if (!tier || !billingCycle) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
    }

    const eligibility = await validatePurchaseEligibility(userId, tier)
    if (!eligibility.valid) {
      const errCode = eligibility.reason === 'USER_NOT_FOUND' ? CommonErrorCodes.NOT_FOUND : CommonErrorCodes.VALIDATION_FAILED
      return errorResponse(res, 400, errCode)
    }

    // 订阅模式：使用 Subscriptions API
    if (mode === 'subscription') {
      const env = process.env.NODE_ENV === 'production' ? 'prod' : 'sandbox'
      const prefix = `PAYPAL_PLAN_ID_${env.toUpperCase()}_`
      const planKey = `${tier.toUpperCase()}_${billingCycle.toUpperCase()}`
      const planId = process.env[`${prefix}${planKey}`]

      if (!planId) {
        return errorResponse(res, 400, CommonErrorCodes.SERVER_ERROR, `Subscription plan not configured for ${tier}-${billingCycle}`)
      }

      const accessToken = await getPayPalAccessToken()

      const subRes = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `sub-${userId}-${Date.now()}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: JSON.stringify({ userId, tier, billingCycle }),
          application_context: {
            brand_name: 'LinkChest',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'SUBSCRIBE_NOW',
            return_url: `${process.env.WEB_BASE_URL || 'https://linkchest.net'}/tier/upgrade?paypal_sub=success`,
            cancel_url: `${process.env.WEB_BASE_URL || 'https://linkchest.net'}/tier/upgrade?paypal_sub=cancel`,
          },
        }),
      })

      const subData = await subRes.json() as {
        id: string
        status: string
        links?: Array<{ href: string; rel: string; method: string }>
        details?: Array<{ issue: string; description: string }>
      }

      if (!subRes.ok) {
        logger.error({ subData }, 'PayPal create subscription failed')
        return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, 'Failed to create PayPal subscription')
      }

      const approveLink = subData.links?.find((l) => l.rel === 'approve')

      return res.json({
        success: true,
        data: {
          orderId: subData.id,
          redirectUrl: approveLink?.href,
          mode: 'subscription',
        },
      })
    }

    // 一次性模式：使用 Orders API
    const details = await getPaymentDetails(tier as any, billingCycle as any)
    const amountUsd = (details.priceUsd / 100).toFixed(2)

    const accessToken = await getPayPalAccessToken()

    const orderRes = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `${userId}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amountUsd,
          },
          description: `LinkChest ${tier} (${billingCycle})`,
          custom_id: JSON.stringify({ userId, tier, billingCycle }),
        }],
        application_context: {
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      }),
    })

    const orderData = await orderRes.json() as { id: string; status: string; details?: Array<{ issue: string; description: string }> }

    if (!orderRes.ok) {
      logger.error({ orderData }, 'PayPal create order failed')
      return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, 'Failed to create PayPal order')
    }

    res.json({ success: true, data: { orderId: orderData.id, mode: 'one_time' } })
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'PayPal create order error')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

/**
 * POST /api/payments/paypal/capture
 * 捕获已批准的订单（支持一次性订单和订阅两种模式）
 */
router.post('/capture', authenticate, async (req: AuthenticatedRequest, res) => {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    return errorResponse(res, 503, CommonErrorCodes.SERVER_ERROR, 'PayPal not configured')
  }

  try {
    const { orderId, tier, billingCycle, mode = 'one_time' } = req.body
    const userId = req.user.id

    if (!orderId || !tier || !billingCycle) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
    }

    const eligibility = await validatePurchaseEligibility(userId, tier)
    if (!eligibility.valid) {
      const errCode = eligibility.reason === 'USER_NOT_FOUND' ? CommonErrorCodes.NOT_FOUND : CommonErrorCodes.VALIDATION_FAILED
      return errorResponse(res, 400, errCode)
    }

    // 订阅模式：验证订阅状态
    if (mode === 'subscription') {
      const accessToken = await getPayPalAccessToken()

      const subRes = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      const subData = await subRes.json() as {
        id: string
        status: string
        subscriber?: { email_address: string }
        billing_info?: {
          last_payment?: { amount: { value: string; currency_code: string }; time: string }
          next_billing_time?: string
        }
      }

      if (!subRes.ok || !['ACTIVE', 'APPROVED'].includes(subData.status)) {
        logger.error({ subData, orderId }, 'PayPal subscription not active')
        return errorResponse(res, 400, CommonErrorCodes.SERVER_ERROR, 'PayPal subscription not active')
      }

      const details = await getPaymentDetails(tier as any, billingCycle as any)

      await processPaymentSuccess({
        userId,
        tier: tier as any,
        billingCycle: billingCycle as any,
        source: 'paypal',
        sourceTransactionId: subData.id,
        priceCny: details.priceCny,
        priceUsd: details.priceUsd,
        expiresAt: details.expiresAt,
      })

      recordPaymentSuccess('paypal', tier, details.priceUsd)

      return res.json({ success: true, data: { subscriptionId: subData.id, mode: 'subscription' } })
    }

    // 一次性模式：捕获订单
    const accessToken = await getPayPalAccessToken()

    const captureRes = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `capture-${orderId}`,
      },
    })

    const captureData = await captureRes.json() as {
      id: string
      status: string
      purchase_units?: Array<{
        payments?: {
          captures?: Array<{
            id: string
            status: string
            amount: { value: string; currency_code: string }
          }>
        }
      }>
      details?: Array<{ issue: string; description: string }>
    }

    if (!captureRes.ok || captureData.status !== 'COMPLETED') {
      logger.error({ captureData, orderId }, 'PayPal capture failed')
      return errorResponse(res, 400, CommonErrorCodes.SERVER_ERROR, 'PayPal payment not completed')
    }

    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    if (!capture || capture.status !== 'COMPLETED') {
      return errorResponse(res, 400, CommonErrorCodes.SERVER_ERROR, 'PayPal capture not completed')
    }

    const details = await getPaymentDetails(tier as any, billingCycle as any)

    await processPaymentSuccess({
      userId,
      tier: tier as any,
      billingCycle: billingCycle as any,
      source: 'paypal',
      sourceTransactionId: capture.id,
      priceCny: details.priceCny,
      priceUsd: details.priceUsd,
      expiresAt: details.expiresAt,
    })

    recordPaymentSuccess('paypal', tier, details.priceUsd)

    res.json({ success: true, data: { captureId: capture.id, mode: 'one_time' } })
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, 'PayPal capture error')
    return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

export default router
