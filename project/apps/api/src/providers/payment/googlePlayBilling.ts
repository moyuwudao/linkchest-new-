/**
 * Google Play Billing Provider
 * 实现 Google Play 应用内购买验证
 * 
 * Google Play Billing 验证流程：
 * 1. 客户端通过 Google Play Billing Library 发起购买
 * 2. Google Play 返回 purchaseToken
 * 3. 后端使用 Google Play Developer API 验证 purchaseToken
 * 4. 验证通过后处理订阅或一次性购买
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
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

const GOOGLE_PLAY_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY || ''
const GOOGLE_PLAY_PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.linkchest.app'

// 服务账号认证客户端
let authClient: any = null

async function getAuthClient(): Promise<any> {
  if (authClient) return authClient

  if (!GOOGLE_PLAY_SERVICE_ACCOUNT_KEY) {
    throw new Error('Google Play service account key not configured')
  }

  let keyData: any
  try {
    // 支持 JSON 字符串或文件路径
    if (GOOGLE_PLAY_SERVICE_ACCOUNT_KEY.startsWith('{')) {
      keyData = JSON.parse(GOOGLE_PLAY_SERVICE_ACCOUNT_KEY)
    } else {
      // 如果是文件路径，读取文件
      keyData = require(GOOGLE_PLAY_SERVICE_ACCOUNT_KEY)
    }
  } catch (err) {
    throw new Error(`Failed to parse Google Play service account key: ${(err as Error).message}`)
  }

  authClient = new JWT({
    email: keyData.client_email,
    key: keyData.private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })

  await authClient.authorize()
  return authClient
}

export class GooglePlayBillingProvider implements PaymentProvider {
  readonly name = 'google_play_billing' as const

  isConfigured(): boolean {
    return !!(GOOGLE_PLAY_SERVICE_ACCOUNT_KEY && GOOGLE_PLAY_PACKAGE_NAME)
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { userId, tier, billingCycle } = params

    const details = await getPaymentDetails(tier, billingCycle)

    // Google Play Billing 不需要后端创建订单
    // 订单由客户端直接在 Google Play 发起
    // 这里返回空的订单信息，实际支付验证在 capturePayment 中进行

    return {
      orderId: `GP-${Date.now()}-${userId.slice(0, 8)}`,
      extra: {
        tier,
        billingCycle,
        priceUsd: details.priceUsd,
        priceCny: details.priceCny,
      },
    }
  }

  async capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResult> {
    const { orderId, tier, billingCycle } = params

    try {
      const auth = await getAuthClient()
      const androidpublisher = google.androidpublisher({
        version: 'v3',
        auth,
      })

      // 从 orderId 中提取 purchaseToken
      // 实际实现中，客户端应传递 purchaseToken 作为 orderId
      const purchaseToken = orderId // 这里假设 orderId 就是 purchaseToken

      // 查询购买信息
      const response = await androidpublisher.purchases.subscriptions.get({
        packageName: GOOGLE_PLAY_PACKAGE_NAME,
        subscriptionId: this.getSubscriptionId(tier, billingCycle),
        token: purchaseToken,
      })

      const purchase = response.data

      if (!purchase) {
        logger.error({ orderId, tier, billingCycle }, 'Google Play purchase not found')
        return {
          success: false,
          transactionId: orderId,
          rawResponse: purchase,
        }
      }

      // 验证购买状态
      // Google Play API 返回的字段可能因版本不同而有差异
      const purchaseState = (purchase as any).purchaseState
      const isActive = purchaseState === 0 // 0 = purchased
      const isAutoRenewing = purchase.autoRenewing === true

      if (!isActive) {
        logger.warn({ orderId, purchaseState }, 'Google Play purchase not active')
        return {
          success: false,
          transactionId: (purchase as any).orderId || orderId,
          rawResponse: purchase,
        }
      }

      logger.info({ orderId, purchase }, 'Google Play purchase verified')

      return {
        success: true,
        transactionId: purchase.orderId || orderId,
        rawResponse: purchase,
      }
    } catch (err) {
      logger.error({ err: (err as Error).message, orderId }, 'Google Play billing capture failed')
      return {
        success: false,
        transactionId: orderId,
        rawResponse: { error: (err as Error).message },
      }
    }
  }

  /**
   * 根据套餐和计费周期获取 Google Play 订阅 ID
   */
  private getSubscriptionId(tier: string, billingCycle: string): string {
    const subscriptionMap: Record<string, Record<string, string>> = {
      heavy: {
        monthly: 'com.linkchest.subscription.heavy.monthly',
        yearly: 'com.linkchest.subscription.heavy.yearly',
      },
      super: {
        monthly: 'com.linkchest.subscription.super.monthly',
        yearly: 'com.linkchest.subscription.super.yearly',
      },
    }

    return subscriptionMap[tier]?.[billingCycle] || `com.linkchest.subscription.${tier}.${billingCycle}`
  }
}