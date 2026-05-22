/**
 * Apple In-App Purchase Provider（iOS 内购）
 * 实现 Apple StoreKit 收据验证
 *
 * Apple IAP 流程：
 * 1. 前端通过 StoreKit 发起购买
 * 2. 购买成功后获取 receipt（iOS 14 前）或 transactionId（iOS 15+）
 * 3. 后端验证 receipt 的有效性
 * 4. 验证通过后处理订阅或一次性购买
 *
 * 验证方式：
 * - 生产环境：https://buy.itunes.apple.com/verifyReceipt
 * - 沙盒环境：https://sandbox.itunes.apple.com/verifyReceipt
 * - iOS 15+：使用 App Store Server API（JWT 认证）
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
import axios from 'axios'

const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET || ''

// Apple 验证收据 API
const APPLE_VERIFY_RECEIPT_URL = 'https://buy.itunes.apple.com/verifyReceipt'
const APPLE_SANDBOX_VERIFY_RECEIPT_URL = 'https://sandbox.itunes.apple.com/verifyReceipt'

// 交易信息接口
interface AppleReceiptInfo {
  product_id: string
  transaction_id: string
  original_transaction_id: string
  purchase_date: string
  expires_date?: string
  is_trial_period: string
  cancellation_date?: string
}

// 验证响应接口
interface AppleVerifyResponse {
  status: number
  receipt?: {
    in_app?: Array<{
      product_id: string
      transaction_id: string
      original_transaction_id: string
      purchase_date: string
      expires_date?: string
      cancellation_date?: string
    }>
  }
  latest_receipt_info?: AppleReceiptInfo[]
  pending_renewal_info?: Array<{
    auto_renew_product_id: string
    auto_renew_status: string
  }>
  environment?: 'Sandbox' | 'Production'
}

export class AppleIAPProvider implements PaymentProvider {
  readonly name = 'apple_iap' as const

  isConfigured(): boolean {
    return !!APPLE_SHARED_SECRET
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    // Apple IAP 不预先创建服务端订单
    // 前端直接调用 StoreKit 购买，支付成功后发送 receipt 到服务端验证
    const details = await getPaymentDetails(params.tier, params.billingCycle)

    return {
      orderId: `iap-${params.userId}-${Date.now()}`,
      extra: {
        productId: `com.linkchest.${params.tier}.${params.billingCycle}`,
        priceUsd: details.priceUsd,
        priceCny: details.priceCny,
      },
    }
  }

  async capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResult> {
    const { orderId, tier, billingCycle } = params

    // orderId 实际上是前端传递的 Apple receipt（base64 编码）
    const receipt = orderId

    if (!receipt || receipt.length < 100) {
      logger.error({ orderId }, 'Apple IAP invalid receipt')
      return {
        success: false,
        transactionId: orderId,
        rawResponse: { error: 'Invalid receipt' },
      }
    }

    try {
      // 验证收据
      const verifyResult = await this.verifyReceipt(receipt)

      if (verifyResult.status !== 0) {
        logger.error({ status: verifyResult.status, orderId }, 'Apple IAP receipt verification failed')
        return {
          success: false,
          transactionId: orderId,
          rawResponse: verifyResult,
        }
      }

      // 查找匹配的交易
      const productId = `com.linkchest.${tier}.${billingCycle}`
      const transactions = verifyResult.latest_receipt_info || verifyResult.receipt?.in_app || []

      const matchingTransaction = transactions.find(
        (t) => t.product_id === productId
      )

      if (!matchingTransaction) {
        logger.error({ productId, orderId }, 'Apple IAP product not found in receipt')
        return {
          success: false,
          transactionId: orderId,
          rawResponse: verifyResult,
        }
      }

      // 检查订阅是否有效
      if (matchingTransaction.expires_date) {
        const expiresDate = new Date(matchingTransaction.expires_date)
        if (expiresDate < new Date()) {
          logger.warn({ orderId, expiresDate }, 'Apple IAP subscription expired')
          return {
            success: false,
            transactionId: matchingTransaction.transaction_id,
            rawResponse: verifyResult,
          }
        }
      }

      // 检查是否已取消
      if (matchingTransaction.cancellation_date) {
        logger.warn({ orderId, cancellationDate: matchingTransaction.cancellation_date }, 'Apple IAP purchase cancelled')
        return {
          success: false,
          transactionId: matchingTransaction.transaction_id,
          rawResponse: verifyResult,
        }
      }

      logger.info({
        orderId,
        transactionId: matchingTransaction.transaction_id,
        productId,
      }, 'Apple IAP payment verified successfully')

      return {
        success: true,
        transactionId: matchingTransaction.transaction_id,
        rawResponse: verifyResult,
      }
    } catch (err) {
      logger.error({ err: (err as Error).message, orderId }, 'Apple IAP capture failed')
      return {
        success: false,
        transactionId: orderId,
        rawResponse: { error: (err as Error).message },
      }
    }
  }

  /**
   * 验证 Apple receipt
   * 先调用生产环境 API，如果返回 21007（沙盒收据），则切换到沙盒环境
   */
  private async verifyReceipt(receipt: string): Promise<AppleVerifyResponse> {
    const verifyData = {
      'receipt-data': receipt,
      password: APPLE_SHARED_SECRET,
    }

    // 先尝试生产环境
    let response = await axios.post(APPLE_VERIFY_RECEIPT_URL, verifyData, {
      timeout: 10000,
    })

    const result = response.data as AppleVerifyResponse

    // 21007 = 沙盒收据，需要切换到沙盒环境验证
    if (result.status === 21007) {
      logger.info('Apple IAP receipt is from sandbox, switching to sandbox environment')
      response = await axios.post(APPLE_SANDBOX_VERIFY_RECEIPT_URL, verifyData, {
        timeout: 10000,
      })
      return response.data as AppleVerifyResponse
    }

    return result
  }
}
