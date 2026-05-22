import axios from 'axios';
import { getErrorMessage } from '@linkchest/i18n';
import { getToken, logout } from '../auth';

const isBrowser = typeof window !== 'undefined';
const API_BASE_URL = isBrowser
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api');
const PUBLIC_BASE_URL = isBrowser
  ? ''
  : API_BASE_URL.replace(/\/api$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const publicApi = axios.create({
  baseURL: PUBLIC_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data && typeof error.response.data === 'object') {
      const rawLocale = typeof window !== 'undefined' ? localStorage.getItem('linkchest-locale') : 'en';
      const locale = rawLocale === 'zh' || rawLocale === 'en' || rawLocale === 'ja' || rawLocale === 'ko' || rawLocale === 'fr' || rawLocale === 'de' ? rawLocale : 'en';
      const errCode = error.response.data.error;
      if (typeof errCode === 'string') {
        error.response.data.message = getErrorMessage(errCode, locale);
      }
    }
    if (error.response?.status === 401) {
      const isAuthRequest = error.config?.url?.includes('/auth/');
      const isAdminRequest = error.config?.url?.includes('/admin/');
      if (!isAuthRequest && !isAdminRequest) {
        logout();
      }
    } else if (error.response?.status === 403) {
      const errCode = error.response.data?.error || '';
      if (typeof errCode === 'string' && errCode.startsWith('QUOTA_EXCEEDED')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('quota-exceeded', { detail: errCode }));
        }
      }
    } else if (error.response?.status === 429) {
      const message = error.response.data?.message || '请求过于频繁，请稍后再试';
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rate-limited', { detail: message }));
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiError {
  response?: { status?: number; data?: { error?: string; message?: string; errors?: { msg?: string }[]; needPassword?: boolean; [key: string]: unknown } };
  message?: string;
  statusCode?: number;
}
