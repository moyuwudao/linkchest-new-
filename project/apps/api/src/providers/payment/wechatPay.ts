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

const WECHAT_PAY_MCH_ID = process.env.WECHAT_PAY_MCH_ID || ''
const WECHAT_PAY_APP_ID = process.env.WECHAT_PAY_APP_ID || ''
const WECHAT_PAY_API_V3_KEY = process.env.WECHAT_PAY_API_V3_KEY || ''
const WECHAT_PAY_SERIAL_NO = process.env.WECHAT_PAY_SERIAL_NO || ''
const WECHAT_PAY_PRIVATE_KEY = process.env.WECHAT_PAY_PRIVATE_KEY || ''

const WECHAT_PAY_BASE_URL = 'https://api.mch.weixin.qq.com'

/**
 * 微信支付 Provider
 * 实现微信支付 Native / JSAPI 下单和查询
 */
export class WechatPayProvider implements PaymentProvider {
  readonly name = 'wechat_pay' as const

  isConfigured(): boolean {
    return !!(
      WECHAT_PAY_MCH_ID &&
      WECHAT_PAY_APP_ID &&
      WECHAT_PAY_API_V3_KEY &&
      WECHAT_PAY_SERIAL_NO &&
      WECHAT_PAY_PRIVATE_KEY
    )
  }

  /**
   * 生成微信支付 V3 请求签名
   */
  private sign(method: string, url: string, body: string, timestamp: string, nonceStr: string): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`
    const sign = crypto.createSign('RSA-SHA256')
    sign.update(message)
    return sign.sign(WECHAT_PAY_PRIVATE_KEY, 'base64')
  }

  /**
   * 生成随机字符串
   */
  private nonceStr(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  /**
   * 构建 Authorization 头
   */
  private authHeader(method: string, url: string, body: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = this.nonceStr()
    const signature = this.sign(method, url, body, timestamp, nonce)
    return `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_PAY_MCH_ID}",serial_no="${WECHAT_PAY_SERIAL_NO}",timestamp="${timestamp}",nonce_str="${nonce}",signature="${signature}"`
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const { userId, tier, billingCycle } = params

    const details = await getPaymentDetails(tier, billingCycle)
    const amountCny = details.priceCny || details.priceUsd

    const outTradeNo = `LC${Date.now()}${userId.slice(0, 8)}`
    const url = '/v3/pay/transactions/native'
    const body = JSON.stringify({
      mchid: WECHAT_PAY_MCH_ID,
      appid: WECHAT_PAY_APP_ID,
      description: `LinkChest ${tier} (${billingCycle})`,
      out_trade_no: outTradeNo,
      notify_url: `${process.env.WEB_BASE_URL || ''}/api/payments/wechat/notify`,
      amount: {
        total: amountCny,
        currency: 'CNY',
      },
      attach: JSON.stringify({ userId, tier, billingCycle }),
    })

    const res = await fetch(`${WECHAT_PAY_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader('POST', url, body),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
    })

    const data = await res.json() as {
      code_url?: string
      prepay_id?: string
      code?: string
      message?: string
    }

    if (!res.ok) {
      logger.error({ data, outTradeNo }, 'WeChat Pay create order failed')
      throw new Error(`WeChat Pay order failed: ${data.message || res.statusText}`)
    }

    return {
      orderId: outTradeNo,
      extra: {
        codeUrl: data.code_url,
        prepayId: data.prepay_id,
      },
    }
  }

  async capturePayment(params: CapturePaymentParams): Promise<CapturePaymentResult> {
    const { orderId } = params

    const url = `/v3/pay/transactions/out-trade-no/${orderId}`
    const res = await fetch(`${WECHAT_PAY_BASE_URL}${url}?mchid=${WECHAT_PAY_MCH_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader('GET', url, ''),
        'Accept': 'application/json',
      },
    })

    const data = await res.json() as {
      trade_state?: string
      transaction_id?: string
      out_trade_no?: string
      code?: string
      message?: string
    }

    if (!res.ok) {
      logger.error({ data, orderId }, 'WeChat Pay query failed')
      throw new Error(`WeChat Pay query failed: ${data.message || res.statusText}`)
    }

    const success = data.trade_state === 'SUCCESS'

    return {
      success,
      transactionId: data.transaction_id || orderId,
      rawResponse: data,
    }
  }

  /**
   * 验证微信支付回调签名
   * 微信支付回调签名验证需要使用平台证书公钥验证
   * 生产环境需要实现证书自动下载和缓存机制
   */
  async verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: string
  ): Promise<{ valid: boolean; event?: unknown }> {
    const serial = headers['wechatpay-serial']
    const signature = headers['wechatpay-signature']
    const timestamp = headers['wechatpay-timestamp']
    const nonce = headers['wechatpay-nonce']

    if (!serial || !signature || !timestamp || !nonce) {
      logger.warn('WeChat Pay webhook missing required headers')
      return { valid: false }
    }

    // 验证签名格式
    const sigString = `${timestamp}\n${nonce}\n${body}\n`
    
    // 获取平台证书公钥（生产环境需要从微信支付API下载证书）
    // 这里使用配置的公钥进行验证
    const platformCertPublicKey = process.env.WECHAT_PAY_PLATFORM_CERT || ''
    
    if (!platformCertPublicKey) {
      logger.warn('WeChat Pay platform certificate public key not configured')
      return { valid: false }
    }

    try {
      const verify = crypto.createVerify('RSA-SHA256')
      verify.update(sigString)
      const isValid = verify.verify(platformCertPublicKey, signature as string, 'base64')
      
      if (!isValid) {
        logger.warn('WeChat Pay webhook signature verification failed')
        return { valid: false }
      }

      return { valid: true, event: JSON.parse(body) }
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'WeChat Pay webhook verification error')
      return { valid: false }
    }
  }
}
