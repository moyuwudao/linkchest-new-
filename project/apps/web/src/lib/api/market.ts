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
}

export async function getMarketConfig(): Promise<MarketConfig> {
  const res = await api.get('/market/config');
  return res.data.data;
}
