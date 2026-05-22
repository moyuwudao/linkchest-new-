import type {
  PaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
  CapturePaymentParams,
  CapturePaymentResult,
  PaymentMode,
} from './types'
import { getPaymentDetails } from '../../services/payment'
import logger from '../../lib/logger'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || ''
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

// PayPal 订阅计划 ID 配置（从环境变量读取，支持沙盒和生产环境）
const PAYPAL_PLAN_IDS: Record<string, string> = (() => {
  const env = process.env.NODE_ENV === 'production' ? 'prod' : 'sandbox'
  const prefix = `PAYPAL_PLAN_ID_${env.toUpperCase()}_`
  const plans: Record<string, string> = {}
  const keys = [
    'HEAVY_MONTHLY', 'HEAVY_QUARTERLY', 'HEAVY_YEARLY',
    'SUPER_MONTHLY', 'SUPER_QUARTERLY', 'SUPER_YEARLY',
  ]
  for (const key of keys) {
    const value = process.env[`${prefix}${key}`]
    if (value) {
      plans[key.toLowerCase().replace(/_/g, '-')] = value
    }
  }
  return plans
})()

/**
 * PayPal 支付 Provider
 * 支持两种模式：
 * 1. one_time: 一次性订单（Orders API）- 用户手动付款，不自动续费
 * 2. subscription: 订阅（Subscriptions API）- 自动循环扣费
 */
export class PayPalProvider implements PaymentProvider {
  readonly name = 'paypal' as const

  isConfigured(): boolean {
    return !!PAYPAL_CLIENT_ID && !!PAYPAL_CLIENT_SECRET
  }

  private async getAccessToken(): Promise<string> {
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
   * 获取订阅计划 ID
   */
  private getPlanId(tier: string, billingCycle: string): string | undefined {
    const key = `${tier}-${billingCycle}`
    return PAYPAL_PLAN_IDS[key]
  }

  /**
   * 检查是否支持订阅模式
   */
  supportsSubscription(tier: string, billingCycle: string): boolean {
    return !!this.getPlanId(tier, billingCycle)
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { userId, tier, billingCycle, mode = 'one_time' } = params

    // 订阅模式：使用 Subscriptions API
    if (mode === 'subscription') {
      const planId = this.getPlanId(tier, billingCycle)
      if (!planId) {
        throw new Error(`PayPal subscription plan not configured for ${tier}-${billingCycle}`)
      }

      const accessToken = await this.getAccessToken()

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
        throw new Error('Failed to create PayPal subscription')
      }

      const approveLink = subData.links?.find((l) => l.rel === 'approve')

      return {
        orderId: subData.id,
        redirectUrl: approveLink?.href,
        mode: 'subscription',
      }
    }

    // 一次性模式：使用 Orders API（原有逻辑）
    const details = await getPaymentDetails(tier, billingCycle)
    const amountUsd = (details.priceUsd / 100).toFixed(2)

    const accessToken = await this.getAccessToken()

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

    const orderData = await orderRes.json() as {
      id: string
      status: string
      details?: Array<{ issue: string; description: string }>
    }

    if (!orderRes.ok) {
      logger.error({ orderData }, 'PayPal create order failed')
      throw new Error('Failed to create PayPal order')
    }

    return {
      orderId: orderData.id,
      mode: 'one_time',
    }
  }

  async capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResult> {
    const { orderId, mode = 'one_time' } = params

    // 订阅模式：验证订阅状态
    if (mode === 'subscription') {
      const accessToken = await this.getAccessToken()

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
        throw new Error('PayPal subscription not active')
      }

      return {
        success: true,
        transactionId: subData.id,
        subscriptionId: subData.id,
        rawResponse: subData,
      }
    }

    // 一次性模式：捕获订单（原有逻辑）
    const accessToken = await this.getAccessToken()

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
      throw new Error('PayPal payment not completed')
    }

    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0]
    if (!capture || capture.status !== 'COMPLETED') {
      throw new Error('PayPal capture not completed')
    }

    return {
      success: true,
      transactionId: capture.id,
      rawResponse: captureData,
    }
  }
}
