import type {
  PaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
  CapturePaymentParams,
  CapturePaymentResult,
} from './types'
import { getPaymentDetails } from '../../services/payment'
import logger from '../../lib/logger'
import crypto from 'crypto'

const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || ''
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || ''
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || ''

const ALIPAY_BASE_URL = 'https://openapi.alipay.com/gateway.do'

/**
 * 支付宝支付 Provider
 * 实现支付宝 PC / Wap / App 下单和查询
 */
export class AlipayProvider implements PaymentProvider {
  readonly name = 'alipay' as const

  isConfigured(): boolean {
    return !!(ALIPAY_APP_ID && ALIPAY_PRIVATE_KEY && ALIPAY_PUBLIC_KEY)
  }

  /**
   * 生成支付宝签名（RSA2）
   */
  private sign(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .filter((k) => k !== 'sign' && params[k] !== undefined && params[k] !== null && String(params[k]) !== '')
      .sort()
      .map((k) => `${k}=${String(params[k])}`)
      .join('&')

    const sign = crypto.createSign('RSA-SHA256')
    sign.update(sorted)
    return sign.sign(ALIPAY_PRIVATE_KEY, 'base64')
  }

  /**
   * 验证支付宝回调签名
   */
  private verifySign(params: Record<string, unknown>, signature: string): boolean {
    const sorted = Object.keys(params)
      .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== undefined && params[k] !== null && String(params[k]) !== '')
      .sort()
      .map((k) => `${k}=${String(params[k])}`)
      .join('&')

    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(sorted)
    return verify.verify(ALIPAY_PUBLIC_KEY, signature, 'base64')
  }

  /**
   * 构建通用请求参数
   */
  private buildCommonParams(method: string): Record<string, unknown> {
    return {
      app_id: ALIPAY_APP_ID,
      method,
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      version: '1.0',
      notify_url: `${process.env.WEB_BASE_URL || ''}/api/payments/alipay/notify`,
    }
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { userId, tier, billingCycle } = params

    const details = await getPaymentDetails(tier, billingCycle)
    const amountCny = details.priceCny || details.priceUsd

    const outTradeNo = `LC${Date.now()}${userId.slice(0, 8)}`

    // 业务参数（移动 APP 支付和网页支付参数一致）
    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: (amountCny / 100).toFixed(2),
      subject: `LinkChest ${tier} (${billingCycle})`,
      // APP 支付 product_code 必须为 QUICK_MSECURITY_PAY
      product_code: 'QUICK_MSECURITY_PAY',
      body: JSON.stringify({ userId, tier, billingCycle }),
    }

    // 公共请求参数（移动 APP 支付和网页支付一致）
    const commonParams = this.buildCommonParams('alipay.trade.app.pay')
    const requestParams: Record<string, unknown> = {
      ...commonParams,
      biz_content: JSON.stringify(bizContent),
    }

    const sign = this.sign(requestParams)

    // 移动 APP 支付：返回 orderString（待签名字符串），不需拼成 URL
    // 客户端 SDK 拿到 orderString 后直接调起支付宝 APP 完成支付
    const orderStringParts: string[] = []
    Object.entries(requestParams).forEach(([k, v]) => {
      orderStringParts.push(`${k}=${encodeURIComponent(String(v))}`)
    })
    orderStringParts.push(`sign=${encodeURIComponent(sign)}`)
    const orderString = orderStringParts.join('&')

    // 同时生成网页支付的 payUrl，作为 web 端兜底
    const webCommonParams = this.buildCommonParams('alipay.trade.page.pay')
    const webRequestParams = {
      ...webCommonParams,
      biz_content: JSON.stringify(bizContent),
      return_url: `${process.env.WEB_BASE_URL || ''}/tier/upgrade/success`,
    }
    const webSign = this.sign(webRequestParams)
    const queryParams = new URLSearchParams()
    Object.entries(webRequestParams).forEach(([k, v]) => {
      queryParams.append(k, String(v))
    })
    queryParams.append('sign', webSign)
    const payUrl = `${ALIPAY_BASE_URL}?${queryParams.toString()}`

    return {
      orderId: outTradeNo,
      // 移动端 SDK 使用 orderString
      // web 端使用 payUrl 跳转
      extra: {
        orderString,
        payUrl,
      },
    }
  }

  async capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResult> {
    const { orderId } = params

    const bizContent = {
      out_trade_no: orderId,
    }

    const commonParams = this.buildCommonParams('alipay.trade.query')
    const requestParams = {
      ...commonParams,
      biz_content: JSON.stringify(bizContent),
    }

    const sign = this.sign(requestParams)
    const queryParams = new URLSearchParams()
    Object.entries(requestParams).forEach(([k, v]) => {
      queryParams.append(k, String(v))
    })
    queryParams.append('sign', sign)

    const res = await fetch(`${ALIPAY_BASE_URL}?${queryParams.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    const data = await res.json() as {
      alipay_trade_query_response?: {
        trade_status?: string
        trade_no?: string
        out_trade_no?: string
        code?: string
        msg?: string
      }
    }

    const response = data.alipay_trade_query_response
    if (!response || response.code !== '10000') {
      logger.error({ data, orderId }, 'Alipay query failed')
      throw new Error(`Alipay query failed: ${response?.msg || 'Unknown error'}`)
    }

    const success = response.trade_status === 'TRADE_SUCCESS' || response.trade_status === 'TRADE_FINISHED'

    return {
      success,
      transactionId: response.trade_no || orderId,
      rawResponse: data,
    }
  }

  /**
   * 验证支付宝回调签名
   */
  async verifyWebhook(
    params: Record<string, unknown>,
    signature: string
  ): Promise<{ valid: boolean; event?: unknown }> {
    const valid = this.verifySign(params, signature)
    if (!valid) {
      return { valid: false }
    }

    return { valid: true, event: params }
  }
}
