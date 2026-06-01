import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { getErrorMessage, type SupportedLocale, isValidLocale } from '@linkchest/i18n';
import { getCachedTranslation } from './i18n';
import { isChinaMarket } from './market';

const API_URL_STORAGE_KEY = 'linkchest_api_url';

/** 获取默认 API URL（运行时计算，避免模块加载时 Constants 未就绪） */
export function getDefaultApiUrl(): string {
  return isChinaMarket()
    ? 'https://linkchest.cn/api'
    : 'https://linkchest.net/api';
}

// 根据市场返回对应的基础域名
export function getBaseDomain(): string {
  return isChinaMarket() ? 'linkchest.cn' : 'linkchest.net';
}

// 根据市场返回对应的客服邮箱
export function getSupportEmail(): string {
  return isChinaMarket() ? 'support@linkchest.cn' : 'support@linkchest.net';
}

// 根据市场返回对应的下载页面
export function getDownloadUrl(locale: string): string {
  return `https://${getBaseDomain()}/download?lang=${locale}`;
}

let currentBaseUrl = getDefaultApiUrl();

export const api = axios.create({
  baseURL: getDefaultApiUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 初始化 API URL（从存储读取）
export async function initApiUrl() {
  try {
    const savedUrl = await SecureStore.getItemAsync(API_URL_STORAGE_KEY);
    if (savedUrl) {
      // 验证保存的 URL 是否与当前市场匹配（防止海外/国内切换后残留旧配置）
      const isSavedChina = savedUrl.includes('linkchest.cn');
      const isSavedGlobal = savedUrl.includes('linkchest.net');
      if ((isChinaMarket() && isSavedChina) || (!isChinaMarket() && isSavedGlobal)) {
        currentBaseUrl = savedUrl;
        api.defaults.baseURL = savedUrl;
      } else {
        // URL 与市场不匹配，清除旧配置并使用运行时计算的默认值
        await SecureStore.deleteItemAsync(API_URL_STORAGE_KEY);
        const defaultUrl = getDefaultApiUrl();
        currentBaseUrl = defaultUrl;
        api.defaults.baseURL = defaultUrl;
      }
    } else {
      // 没有保存的 URL，使用运行时计算的默认值（避免模块加载时 Constants 未就绪导致错误）
      const defaultUrl = getDefaultApiUrl();
      currentBaseUrl = defaultUrl;
      api.defaults.baseURL = defaultUrl;
    }
  } catch {
    // 读取失败使用运行时计算的默认值
    const defaultUrl = getDefaultApiUrl();
    currentBaseUrl = defaultUrl;
    api.defaults.baseURL = defaultUrl;
  }
}

// 设置自定义 API URL
export async function setApiUrl(url: string) {
  const normalized = url.endsWith('/api') ? url : url + '/api';
  currentBaseUrl = normalized;
  api.defaults.baseURL = normalized;
  await SecureStore.setItemAsync(API_URL_STORAGE_KEY, normalized);
}

// 获取当前 API URL
export async function getApiUrl(): Promise<string> {
  try {
    const savedUrl = await SecureStore.getItemAsync(API_URL_STORAGE_KEY);
    if (savedUrl) {
      const isSavedChina = savedUrl.includes('linkchest.cn');
      const isSavedGlobal = savedUrl.includes('linkchest.net');
      if ((isChinaMarket() && isSavedChina) || (!isChinaMarket() && isSavedGlobal)) {
        return savedUrl;
      }
      // URL 与市场不匹配，清除旧配置
      await SecureStore.deleteItemAsync(API_URL_STORAGE_KEY);
    }
    return getDefaultApiUrl();
  } catch {
    return getDefaultApiUrl();
  }
}

// 重置为默认 API URL
export async function resetApiUrl() {
  await SecureStore.deleteItemAsync(API_URL_STORAGE_KEY);
  const defaultUrl = getDefaultApiUrl();
  currentBaseUrl = defaultUrl;
  api.defaults.baseURL = defaultUrl;
}

// 获取公开路由的基础URL（不含 /api 前缀）
export function getPublicBaseUrl(): string {
  return currentBaseUrl.replace('/api', '');
}

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('linkchest_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 获取当前 locale 对应的翻译
    let locale: SupportedLocale = 'en';
    try {
      const saved = await AsyncStorage.getItem('linkchest-locale');
      if (saved && isValidLocale(saved)) locale = saved;
    } catch {}

    // 前端根据错误码和当前语言自动翻译错误消息
    if (error.response?.data && typeof error.response.data === 'object') {
      const errCode = error.response.data.error;
      if (typeof errCode === 'string') {
        error.response.data.message = getErrorMessage(errCode, locale);
      }
    }

    const t = (key: string) => getCachedTranslation(locale)[key] || getCachedTranslation('en')[key] || key;

    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('linkchest_token');
      const { useAuthStore } = require('../store/auth');
      useAuthStore.setState({ token: null, user: null });
    } else if (!error.response) {
      // 网络断开/超时
      const isTimeout = error.code === 'ECONNABORTED';
      Toast.show({
        type: 'error',
        text1: isTimeout ? t('common.requestTimeout') : t('common.networkError'),
        text2: isTimeout ? t('common.tryLater') : t('common.checkNetwork'),
        visibilityTime: 3000,
      });
    } else if (error.response.status >= 500) {
      Toast.show({
        type: 'error',
        text1: t('common.serverBusy'),
        text2: t('common.tryLater'),
        visibilityTime: 3000,
      });
    } else if (error.response.status === 403) {
      const errCode = error.response.data?.error || '';
      // 配额超限特殊提示
      if (typeof errCode === 'string' && errCode.startsWith('QUOTA_EXCEEDED')) {
        Toast.show({
          type: 'error',
          text1: t('error.quotaExceeded'),
          text2: t('common.tryLater'),
          visibilityTime: 4000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('common.noAccess'),
          visibilityTime: 3000,
        });
      }
    } else if (error.response.status === 429) {
      // 限流提示
      const message = error.response.data?.message || t('common.rateLimited');
      Toast.show({
        type: 'error',
        text1: message,
        text2: t('common.tryLater'),
        visibilityTime: 4000,
      });
    }
    return Promise.reject(error);
  }
);

// ===== 新增 API 辅助函数 =====

/** 上传封面 */
export async function uploadCover(imageData: string, originalName?: string) {
  const response = await api.post('/upload/cover', { imageData, originalName });
  return response.data?.data || response.data;
}

/** 获取当前配额 */
export async function getQuota() {
  const response = await api.get('/quota');
  return response.data?.data || response.data;
}

/** 记录分享浏览 */
export async function recordShareView(shareId: string) {
  const response = await api.post(`/shares/${shareId}/view`);
  return response.data;
}

/** 一键导入分享 */
export async function importShare(shareId: string, syncTags = false) {
  const response = await api.post('/subscriptions/import', { shareId, syncTags });
  return response.data?.data || response.data;
}

/** 获取当前用户等级详情 */
export async function getMyTier() {
  const response = await api.get('/tiers/me');
  return response.data?.data || response.data;
}

/** 获取所有等级配置 */
export async function getTiers() {
  const response = await api.get('/tiers');
  return response.data?.data || response.data;
}

// ===== 市场配置 =====

export interface MarketConfig {
  market: string;
  authProviders: {
    google: boolean;
    apple: boolean;
    wechat: boolean;
    alipay_auth: boolean;
    facebook: boolean;
  };
  paymentProviders: {
    paypal: boolean;
    wechat_pay: boolean;
    alipay: boolean;
    google_pay: boolean;
    apple_iap: boolean;
    google_play_billing: boolean;
  };
  features: {
    contentModeration: boolean;
    referralProgram: boolean;
  };
}

/** 获取市场配置 */
export async function getMarketConfig(): Promise<MarketConfig> {
  const response = await api.get('/market/config');
  return response.data?.data || response.data;
}
