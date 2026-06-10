import axios from 'axios';
import { getToken, getServerUrl } from './storage';

export async function createApi() {
  const baseUrl = await getServerUrl();
  const token = await getToken();

  const instance = axios.create({
    baseURL: `${baseUrl}/api`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return instance;
}

/**
 * 提取 axios 错误的详细信息（用于日志和 UI 提示）
 * API 错误响应格式: { error: "ERR_XXX", details: "..." }
 */
export interface ApiErrorInfo {
  status?: number;
  code?: string;
  message?: string;
  details?: unknown;
  raw?: unknown;
}

export function extractApiError(err: any): ApiErrorInfo {
  if (err?.response) {
    return {
      status: err.response.status,
      code: err.response.data?.error,
      message: err.response.data?.message,
      details: err.response.data?.details,
      raw: err.response.data,
    };
  }
  if (err?.request) {
    return {
      message: err.message || '网络请求无响应（可能是 CORS 或网络问题）',
      raw: err,
    };
  }
  return {
    message: err?.message || String(err),
    raw: err,
  };
}

export async function smartParse(input: string) {
  const api = await createApi();
  try {
    const res = await api.post('/collections/smart-parse', { input });
    return res.data?.data;
  } catch (err) {
    const info = extractApiError(err);
    console.error('[LinkChest] smartParse failed:', info);
    throw err;
  }
}

export async function createCollection(data: {
  url: string;
  title: string;
  coverImage?: string;
  coverStrategy?: 'url' | 'brand' | 'ai';
  platform?: string;
  pageType?: string;
  note?: string;
  tagIds?: string[];
  listIds?: string[];
  rating?: number;
}) {
  const api = await createApi();
  try {
    const res = await api.post('/collections', data);
    return res.data?.data;
  } catch (err) {
    const info = extractApiError(err);
    console.error('[LinkChest] createCollection failed:', { payload: data, ...info });
    throw err;
  }
}

export async function getUserSettings() {
  const api = await createApi();
  try {
    const res = await api.get('/users/settings');
    return res.data?.data;
  } catch (err) {
    console.error('[LinkChest] getUserSettings failed:', extractApiError(err));
    throw err;
  }
}

export async function getFlatLists() {
  const api = await createApi();
  try {
    const res = await api.get('/lists/flat');
    return (res.data?.data || []) as Array<{
      id: string;
      name: string;
      parentId: string | null;
      isDefault?: boolean;
      depth?: number;
      path?: { id: string; name: string; isDefault?: boolean }[];
    }>;
  } catch (err) {
    console.error('[LinkChest] getFlatLists failed:', extractApiError(err));
    throw err;
  }
}

export async function getTags() {
  const api = await createApi();
  try {
    const res = await api.get('/tags');
    return (res.data?.data || []) as Array<{ id: string; name: string }>;
  } catch (err) {
    console.error('[LinkChest] getTags failed:', extractApiError(err));
    throw err;
  }
}

export async function login(credentials: { email: string; password: string }) {
  const api = await createApi();
  try {
    const res = await api.post('/auth/login-email', credentials);
    return res.data;
  } catch (err) {
    console.error('[LinkChest] login failed:', extractApiError(err));
    throw err;
  }
}
