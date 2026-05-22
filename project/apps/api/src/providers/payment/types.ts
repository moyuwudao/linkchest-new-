/**
 * 支付 Provider 统一接口
 * 所有支付渠道（PayPal、Google Pay、微信支付、支付宝、Apple IAP、Google Play Billing）
 * 必须实现此接口，确保核心支付流程统一
 */

import type { UserTier, BillingCycle } from '../../lib/config'

/** 支持的支付来源类型 */
export type PaymentSource =
  | 'paypal'
  | 'google_pay'
  | 'wechat_pay'
  | 'alipay'
  | 'apple_iap'
  | 'google_play_billing'

/** 支付模式：一次性订单 / 订阅 */
export type PaymentMode = 'one_time' | 'subscription'

/** 创建订单参数 */
export interface CreateOrderParams {
  userId: string
  tier: Exclude<UserTier, 'medium'>
  billingCycle: BillingCycle
  mode?: PaymentMode
}

/** 创建订单结果 */
export interface CreateOrderResult {
  orderId: string
  /** 前端需要额外传递的数据（如 PayPal 的 orderId、微信的 prepayId 等） */
  extra?: Record<string, unknown>
  /** 订阅模式下的跳转链接 */
  redirectUrl?: string
  /** 支付模式 */
  mode?: PaymentMode
}

/** 捕获/确认支付参数 */
export interface CapturePaymentParams {
  userId: string
  orderId: string
  tier: Exclude<UserTier, 'medium'>
  billingCycle: BillingCycle
  mode?: PaymentMode
}

/** 捕获/确认支付结果 */
export interface CapturePaymentResult {
  success: boolean
  transactionId: string
  /** 第三方原始响应（用于调试和对账） */
  rawResponse?: unknown
  /** 订阅模式下的订阅ID */
  subscriptionId?: string
}

/** 支付 Provider 统一接口 */
export interface PaymentProvider {
  /** Provider 唯一标识 */
  readonly name: PaymentSource

  /** 是否已配置（环境变量是否齐全） */
  isConfigured(): boolean

  /** 创建订单 */
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>

  /** 捕获/确认支付 */
  capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResult>

  /** 验证 webhook 签名（如适用） */
  verifyWebhook?(
    headers: Record<string, string | string[] | undefined>,
    body: string
  ): Promise<{ valid: boolean; event?: unknown }>
}

/** Provider 构造函数类型 */
export type PaymentProviderConstructor = new () => PaymentProvider
