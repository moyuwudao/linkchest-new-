/**
 * 支付 Provider 懒加载入口
 * 根据当前市场配置，动态加载可用的支付 Provider
 */

import type { PaymentProvider, PaymentSource } from './types'
import { isPaymentProviderEnabled, assertProviderEnabled } from '../../lib/market'

// Provider 懒加载映射表
const providerLoaders: Record<PaymentSource, () => Promise<PaymentProvider>> = {
  paypal: async () => {
    const { PayPalProvider } = await import('./paypal')
    return new PayPalProvider()
  },
  google_pay: async () => {
    const { GooglePayProvider } = await import('./googlePay')
    return new GooglePayProvider()
  },
  wechat_pay: async () => {
    const { WechatPayProvider } = await import('./wechatPay')
    return new WechatPayProvider()
  },
  alipay: async () => {
    const { AlipayProvider } = await import('./alipay')
    return new AlipayProvider()
  },
  apple_iap: async () => {
    const { AppleIAPProvider } = await import('./appleIAP')
    return new AppleIAPProvider()
  },
  google_play_billing: async () => {
    const { GooglePlayBillingProvider } = await import('./googlePlayBilling')
    return new GooglePlayBillingProvider()
  },
}

// Provider 实例缓存
const providerCache = new Map<PaymentSource, PaymentProvider>()

/**
 * 获取指定支付 Provider
 * 如果当前市场未启用该 Provider，抛出 MarketGuardError
 */
export async function getPaymentProvider(source: PaymentSource): Promise<PaymentProvider> {
  assertProviderEnabled('payment', source)

  const cached = providerCache.get(source)
  if (cached) return cached

  const loader = providerLoaders[source]
  if (!loader) {
    throw new Error(`Unknown payment provider: ${source}`)
  }

  const provider = await loader()
  providerCache.set(source, provider)
  return provider
}

/**
 * 获取当前市场所有已启用的支付 Provider
 */
export async function getEnabledPaymentProviders(): Promise<PaymentProvider[]> {
  const sources = Object.entries(providerLoaders)
    .filter(([source]) => isPaymentProviderEnabled(source as PaymentSource))
    .map(([source]) => source as PaymentSource)

  return Promise.all(sources.map((s) => getPaymentProvider(s)))
}

/**
 * 获取当前市场已启用的支付 Provider 名称列表
 */
export function getEnabledPaymentProviderNames(): PaymentSource[] {
  return (Object.keys(providerLoaders) as PaymentSource[]).filter((source) =>
    isPaymentProviderEnabled(source)
  )
}

/**
 * 清除 Provider 缓存（主要用于测试）
 */
export function clearPaymentProviderCache(): void {
  providerCache.clear()
}
