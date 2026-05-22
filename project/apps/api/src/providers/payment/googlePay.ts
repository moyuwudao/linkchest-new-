/**
 * Google Pay Web Provider
 * 实现 Google Pay Web 端支付
 *
 * Google Pay Web 支付流程：
 * 1. 前端通过 Google Pay API 创建支付请求，获取 paymentToken
 * 2. 前端将 paymentToken 发送到后端
 * 3. 后端使用 Stripe 创建 PaymentIntent 并确认支付
 * 4. 返回支付结果
 *
 * 注意：Google Pay Web 依赖 Stripe 处理支付
 * 前端需要使用 Stripe.js 的 Payment Element 或 Google Pay 按钮
 */

import type {
  PaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
  CapturePaymentParams,
  CapturePaymentResult,
} from './types'
import { getPaymentDetails } from '../../services/payment'
import logger from '../../lib/logger'
import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''

// Stripe 客户端
let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (stripe) return stripe

  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key not configured')
  }

  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  })

  return stripe
}

export class GooglePayProvider implements PaymentProvider {
  readonly name = 'google_pay' as const

  isConfigured(): boolean {
    return !!STRIPE_SECRET_KEY
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { userId, tier, billingCycle } = params

    const details = await getPaymentDetails(tier, billingCycle)

    // 创建 Stripe PaymentIntent
    const stripeClient = getStripe()
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: details.priceUsd,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId,
        tier,
        billingCycle,
      },
    })

    return {
      orderId: paymentIntent.id,
      extra: {
        clientSecret: paymentIntent.client_secret,
        tier,
        billingCycle,
        priceUsd: details.priceUsd,
        priceCny: details.priceCny,
      },
    }
  }

  async capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResult> {
    const { orderId, tier, billingCycle } = params

    // orderId 是 PaymentIntent ID
    const paymentIntentId = orderId

    try {
      const stripeClient = getStripe()

      // 查询 PaymentIntent 状态
      const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status === 'succeeded') {
        logger.info({ paymentIntentId }, 'Google Pay payment succeeded')
        return {
          success: true,
          transactionId: paymentIntent.id,
          rawResponse: paymentIntent,
        }
      }

      if (paymentIntent.status === 'requires_confirmation') {
        // 需要确认支付
        const confirmed = await stripeClient.paymentIntents.confirm(paymentIntentId)

        if (confirmed.status === 'succeeded') {
          logger.info({ paymentIntentId }, 'Google Pay payment confirmed')
          return {
            success: true,
            transactionId: confirmed.id,
            rawResponse: confirmed,
          }
        }
      }

      logger.warn({ paymentIntentId, status: paymentIntent.status }, 'Google Pay payment not succeeded')
      return {
        success: false,
        transactionId: paymentIntent.id,
        rawResponse: paymentIntent,
      }
    } catch (err) {
      logger.error({ err: (err as Error).message, paymentIntentId }, 'Google Pay capture failed')
      return {
        success: false,
        transactionId: paymentIntentId,
        rawResponse: { error: (err as Error).message },
      }
    }
  }
}
