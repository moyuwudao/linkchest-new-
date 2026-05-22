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

export async function smartParse(input: string) {
  const api = await createApi();
  const res = await api.post('/collections/smart-parse', { input });
  return res.data?.data;
}

export async function createCollection(data: {
  url: string;
  title: string;
  coverImage?: string;
  platform?: string;
  note?: string;
  tagIds?: string[];
  listIds?: string[];
}) {
  const api = await createApi();
  const res = await api.post('/collections', data);
  return res.data?.data;
}

export async function getUserSettings() {
  const api = await createApi();
  const res = await api.get('/users/settings');
  return res.data?.data;
}

export async function getFlatLists() {
  const api = await createApi();
  const res = await api.get('/lists/flat');
  return (res.data?.data || []) as Array<{
    id: string;
    name: string;
    parentId: string | null;
    isDefault?: boolean;
    depth?: number;
    path?: { id: string; name: string; isDefault?: boolean }[];
  }>;
}

export async function getTags() {
  const api = await createApi();
  const res = await api.get('/tags');
  return (res.data?.data || []) as Array<{ id: string; name: string }>;
}

export async function login(credentials: { email: string; password: string }) {
  const api = await createApi();
  const res = await api.post('/auth/login-email', credentials);
  return res.data;
}
