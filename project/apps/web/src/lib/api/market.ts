import { api } from './client';

export interface MarketConfig {
  market: 'global' | 'china';
  paymentProviders: {
    paypal: boolean;
    google_pay: boolean;
    apple_iap: boolean;
    google_play_billing: boolean;
    wechat_pay: boolean;
    alipay: boolean;
  };
  authProviders: {
    email: boolean;
    google: boolean;
    apple: boolean;
    facebook: boolean;
    wechat: boolean;
    alipay_auth: boolean;
  };
  pricing: {
    primaryCurrency: 'CNY' | 'USD';
    showCny: boolean;
    showUsd: boolean;
  };
  platforms: {
    bilibili: boolean;
    xiaohongshu: boolean;
    douyin: boolean;
    youtube: boolean;
    twitter: boolean;
    instagram: boolean;
  };
  clientIds: {
    google: string | null;
    facebook: string | null;
    wechat: string | null;
    alipay: string | null;
  };
}

export async function getMarketConfig(): Promise<MarketConfig> {
  try {
    const res = await api.get('/market/config');
    return res.data.data;
  } catch (error) {
    // 服务端渲染或API调用失败时返回默认值
    return {
      market: 'global',
      paymentProviders: {
        paypal: true,
        google_pay: false,
        apple_iap: false,
        google_play_billing: false,
        wechat_pay: false,
        alipay: false,
      },
      authProviders: {
        email: true,
        google: true,
        apple: false,
        facebook: false,
        wechat: false,
        alipay_auth: false,
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
      clientIds: {
        google: null,
        facebook: null,
        wechat: null,
        alipay: null,
      },
    };
  }
}
