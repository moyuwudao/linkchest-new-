/**
 * 市场配置中心
 * 通过 MARKET 环境变量区分国内(china)和海外(global)市场
 * 所有市场差异化配置集中在此管理
 */

export type Market = 'china' | 'global'

const MARKET = (process.env.MARKET || 'global') as Market

export function getMarket(): Market {
  return MARKET
}

export function isChinaMarket(): boolean {
  return MARKET === 'china'
}

export function isGlobalMarket(): boolean {
  return MARKET === 'global'
}

// ===== 市场差异化功能开关 =====

export interface MarketFeatures {
  // 支付渠道
  paymentProviders: {
    paypal: boolean
    google_pay: boolean
    apple_iap: boolean
    google_play_billing: boolean
    wechat_pay: boolean
    alipay: boolean
  }
  // 登录渠道
  authProviders: {
    email: boolean
    google: boolean
    apple: boolean
    facebook: boolean
    wechat: boolean
    alipay_auth: boolean
  }
  // 合规功能
  compliance: {
    contentModeration: boolean // 内容审核（国内强制）
    realNameRequired: boolean // 实名认证要求
    smsVerification: boolean // 短信验证（当前方案：不接入）
    gdprCompliance: boolean // GDPR 合规（海外）
    dataResidency: 'china' | 'global' | 'auto' // 数据驻留要求
  }
  // 云服务配置
  cloud: {
    provider: 'tencentcloud'
    region: string // 国内: ap-beijing/ap-shanghai, 海外: ap-singapore
    cdnDomain: string
  }
  // 定价货币
  pricing: {
    primaryCurrency: 'CNY' | 'USD'
    showCny: boolean
    showUsd: boolean
  }
  // 内容平台支持
  platforms: {
    bilibili: boolean
    xiaohongshu: boolean
    douyin: boolean
    youtube: boolean
    twitter: boolean
    instagram: boolean
  }
}

const CHINA_FEATURES: MarketFeatures = {
  paymentProviders: {
    paypal: false,
    google_pay: false,
    apple_iap: false,
    google_play_billing: false,
    wechat_pay: true,
    alipay: true,
  },
  authProviders: {
    email: true,
    google: false,
    apple: false,
    facebook: false,
    wechat: true,
    alipay_auth: true,
  },
  compliance: {
    contentModeration: true,
    realNameRequired: false, // 可根据业务需要开启
    smsVerification: false,
    gdprCompliance: false,
    dataResidency: 'china',
  },
  cloud: {
    provider: 'tencentcloud',
    region: process.env.COS_REGION || 'ap-beijing',
    cdnDomain: process.env.COS_DOMAIN || '',
  },
  pricing: {
    primaryCurrency: 'CNY',
    showCny: true,
    showUsd: false,
  },
  platforms: {
    bilibili: true,
    xiaohongshu: true,
    douyin: true,
    youtube: false,
    twitter: false,
    instagram: false,
  },
}

const GLOBAL_FEATURES: MarketFeatures = {
  paymentProviders: {
    paypal: true,
    google_pay: true,
    apple_iap: true,
    google_play_billing: true,
    wechat_pay: false,
    alipay: false,
  },
  authProviders: {
    email: true,
    google: true,
    apple: true,
    facebook: true,
    wechat: false,
    alipay_auth: false,
  },
  compliance: {
    contentModeration: false,
    realNameRequired: false,
    smsVerification: false,
    gdprCompliance: true,
    dataResidency: 'global',
  },
  cloud: {
    provider: 'tencentcloud',
    region: process.env.COS_REGION || 'ap-singapore',
    cdnDomain: process.env.COS_DOMAIN || '',
  },
  pricing: {
    primaryCurrency: 'USD',
    showCny: false,
    showUsd: true,
  },
  platforms: {
    bilibili: false,
    xiaohongshu: false,
    douyin: false,
    youtube: true,
    twitter: true,
    instagram: true,
  },
}

export function getMarketFeatures(): MarketFeatures {
  return isChinaMarket() ? CHINA_FEATURES : GLOBAL_FEATURES
}

// ===== 便捷访问函数 =====

export function isPaymentProviderEnabled(provider: keyof MarketFeatures['paymentProviders']): boolean {
  return getMarketFeatures().paymentProviders[provider]
}

export function isAuthProviderEnabled(provider: keyof MarketFeatures['authProviders']): boolean {
  return getMarketFeatures().authProviders[provider]
}

export function isPlatformEnabled(platform: keyof MarketFeatures['platforms']): boolean {
  return getMarketFeatures().platforms[platform]
}

// ===== 市场守卫：拦截未启用的 Provider 请求 =====

import { CommonErrorCodes } from './errorCodes'

export class MarketGuardError extends Error {
  constructor(public provider: string, public market: Market) {
    super(`Provider "${provider}" is not available in ${market} market`)
    this.name = 'MarketGuardError'
  }
}

export function assertProviderEnabled(
  type: 'payment' | 'auth',
  provider: string
): void {
  const features = getMarketFeatures()
  const enabled = type === 'payment'
    ? features.paymentProviders[provider as keyof MarketFeatures['paymentProviders']]
    : features.authProviders[provider as keyof MarketFeatures['authProviders']]

  if (!enabled) {
    throw new MarketGuardError(provider, MARKET)
  }
}

export function getMarketErrorCode(): string {
  return CommonErrorCodes.FEATURE_NOT_AVAILABLE
}
