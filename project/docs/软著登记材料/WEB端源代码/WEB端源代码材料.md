﻿﻿import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import PwaInstallBanner from '@/components/PwaInstallBanner';
import FontLoader from './FontLoader';

export const metadata: Metadata = {
  metadataBase: new URL('https://linkchest.net'),
  title: '链藏 LinkChest - 全网好内容，一键收入链藏',
  description: '跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'https://linkchest.net',
    siteName: '链藏 LinkChest',
    title: '链藏 LinkChest - 全网好内容，一键收入链藏',
    description: '跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: '链藏 LinkChest',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '链藏 LinkChest - 全网好内容，一键收入链藏',
    description: '跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自 X、TikTok、YouTube、Amazon 等 91+ 平台的内容链接。',
    images: ['/og-image.svg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '链藏 LinkChest',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f0e8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <FontLoader />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <PwaInstallBanner />
      </body>
    </html>
  );
}

// LinkChest 前端类型定义

// ===== 认证相关 =====
export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
  username: string | null;
  nickname: string | null;
  avatar: string | null;
  hasPassword: boolean;
  createdAt?: string;
}

// ===== 收藏 =====
export interface CollectionTag {
  id: string;
  name: string;
}

export interface CollectionList {
  id: string;
  name: string;
}

export interface Collection {
  id: string;
  url: string;
  title: string;
  coverImage: string | null;
  platform: string;
  note: string | null;
  tags: CollectionTag[];
  lists: CollectionList[];
  createdAt: string;
  updatedAt: string;
}

// ===== 标签 =====
export interface Tag {
  id: string;
  name: string;
  collectionCount: number;
  sortOrder?: number;
}

// ===== 分组 =====
export interface List {
  id: string;
  name: string;

  description: string | null;
  collectionCount: number;
  totalCollectionCount?: number;
  isDefault?: boolean;
  sortOrder?: number;
  parentId?: string | null;
  depth?: number;
}

// ===== 分享 =====
export interface Share {
  id: string;
  type: string;
  title: string;
  description: string | null;
  hasPassword: boolean;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  itemCount: number;
  viewCount: number;
  shareUrl: string;
  listId?: string | null;
  tagId?: string | null;
}

// ===== 统计 =====
export interface StatsOverview {
  collectionCount: number;
  listCount: number;
  shareCount: number;
  tagCount: number;
}

export interface StatsPlatform {
  platform: string;
  name: string;
  count: number;
  color: string;
}

// ===== API 响应 =====
export interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== Admin 类型 =====

export interface LogQueryParams {
  level?: string;
  startTime?: string;
  endTime?: string;
  keyword?: string;
  errorCode?: string;
  path?: string;
  page?: number;
  pageSize?: number;
}

export interface ErrorQueryParams {
  status?: string;
  errorCode?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface AlertRuleInput {
  name: string;
  type: 'error_rate' | 'error_count' | 'response_time' | 'service_down';
  conditionConfig: Record<string, number>;
  channels?: Record<string, string[]>;
  enabled?: boolean;
  cooldownMinutes?: number;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  silentStart?: string | null;
  silentEnd?: string | null;
}

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface TierConfigInput {
  key: string;
  nameZh: string;
  nameEn: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  quotaConfig: Record<string, number>;
  pricingConfig?: Record<string, unknown> | null;
  benefits?: string[];
}

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

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, X, LayoutGrid, LayoutTemplate, Filter, ChevronDown, Tag as TagIcon, Move, Check, CheckSquare, MinusCircle, ArrowLeft, XCircle, Archive, Inbox, Loader2, FolderOpen, Trash2, Edit2, ExternalLink, ArrowUpDown, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { useI18n, getListDisplayName, getListPathDisplayName } from '@/lib/i18n';
import { platformNames, getContrastTextColor, PLATFORMS, generateDefaultCover } from '@/lib/platforms';
import { PAGE_TYPES, PageTypeIcon, getPageTypeConfig } from '@/lib/pageTypes';
import LazyImage from './LazyImage';
import UndoToast from './UndoToast';
import { EmptyState, CollectionSkeletonGrid, CollectionSkeletonList } from './ui';
import StarRating from './StarRating';
import dynamic from 'next/dynamic';

const CollectionDetailModal = dynamic(() => import('./CollectionDetailModal'), { ssr: false });
import { useToast } from './Toast';
import type { DisplayFieldKey, CollectionViews } from '@/app/(main)/settings/CollectionViewConfig';
import { useLocalCollectionViews } from '@/hooks/useLocalCollectionViews';

interface Collection {
  id: string;
  title: string;
  coverImage: string | null;
  platform: string;
  pageType?: string;
  note: string | null;
  rating?: number | null;
  tags: { id: string; name: string }[];
  lists: { id: string; name: string; isDefault?: boolean }[];
  url: string;
  createdAt?: string;
}

// 获取排序后的字段配置
function getSortedFields(views: CollectionViews | undefined, mode: 'webGrid' | 'webList'): { key: DisplayFieldKey; enabled: boolean }[] {
  if (!views?.[mode]?.fields) {
    return [
      { key: 'cover', enabled: true },
      { key: 'title', enabled: true },
      { key: 'platform', enabled: true },
      { key: 'rating', enabled: true },
      { key: 'pageType', enabled: false },
      { key: 'tags', enabled: true },

      { key: 'lists', enabled: true },
      { key: 'note', enabled: true },
      { key: 'createdAt', enabled: false },
    ];
  }
  return [...views[mode].fields]
    .sort((a, b) => a.order - b.order)
    .map(f => ({ key: f.key, enabled: f.enabled }));
}

export default function CollectionList() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toast, setToast] = useState<{ id: string; message: string; restoreData: Collection } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'card'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPlatforms, setFilterPlatforms] = useState<Set<string>>(new Set());
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [filterListIds, setFilterListIds] = useState<Set<string>>(new Set());
  const [filterHasRating, setFilterHasRating] = useState<boolean | null>(null);
  const [filterPageType, setFilterPageType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'rating'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [moveModal, setMoveModal] = useState<{ type: 'list' | 'tag'; item: Collection } | null>(null);
  const [detailItem, setDetailItem] = useState<Collection | null>(null);
  const [showSortModal, setShowSortModal] = useState(false);

  // 视图配置（本地存储）
  const { views: collectionViews } = useLocalCollectionViews();
  const viewConfig = getSortedFields(collectionViews, viewMode === 'grid' ? 'webGrid' : 'webList');
  const enabledFields = new Set(viewConfig.filter(f => f.enabled).map(f => f.key));

  // URL参数筛选：从分组页/标签页点击跳转
  const [urlFilterLabel, setUrlFilterLabel] = useState('');
  const [urlFilterType, setUrlFilterType] = useState<'list' | 'tag' | null>(null);
  const [urlFilterId, setUrlFilterId] = useState('');

  // 批量操作状态
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModal, setBatchModal] = useState<'list' | 'tag' | null>(null);

  // 滚动位置记忆 + 自动加载更多
  const listContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 读取URL参数
    const listId = searchParams.get('listId');
    const listName = searchParams.get('listName');
    const tagId = searchParams.get('tagId');
    const tagName = searchParams.get('tagName');
    if (listId) {
      setFilterListIds(new Set([listId]));
      setUrlFilterId(listId);
      setUrlFilterType('list');
      setUrlFilterLabel(listName || t('sidebar.groups'));
    } else if (tagId) {
      setFilterTagIds(new Set([tagId]));
      setUrlFilterId(tagId);
      setUrlFilterType('tag');
      setUrlFilterLabel(`#${tagName || t('collection.tag')}`);
    }
    // 恢复滚动位置
    const savedScroll = sessionStorage.getItem('collectionListScroll');
    if (savedScroll && listContainerRef.current) {
      listContainerRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, [searchParams]);

  // 记忆滚动位置
  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      sessionStorage.setItem('collectionListScroll', String(container.scrollTop));
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Toast 自动消失
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 无限滚动查询：筛选条件传给后端，分页懒加载
  const {

    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['collections', Array.from(filterTagIds).sort().join(','), Array.from(filterListIds).sort().join(','), debouncedSearch, Array.from(filterPlatforms).sort().join(','), filterHasRating, filterPageType, sortBy, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', '40');
      if (filterTagIds.size > 0) params.set('tagIds', Array.from(filterTagIds).join(','));
      if (filterListIds.size > 0) params.set('listIds', Array.from(filterListIds).join(','));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterPlatforms.size > 0) params.set('platforms', Array.from(filterPlatforms).join(','));
      if (filterHasRating !== null) params.set('hasRating', filterHasRating ? 'true' : 'false');
      if (filterPageType) params.set('pageType', filterPageType);
      if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
      if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
      const response = await api.get(`/collections?${params.toString()}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!getToken(),
    staleTime: 30 * 1000,
  });

  // Tags & Lists for filter dropdowns
  interface TagItem { id: string; name: string; }
  interface ListItem { id: string; name: string; isDefault?: boolean; depth?: number; }

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => { const r = await api.get('/tags'); return (r.data.data || r.data) as TagItem[]; },
    enabled: !!getToken(),
  });

  const { data: listsData } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => { const r = await api.get('/lists/flat'); return (r.data.data || r.data) as ListItem[]; },
    enabled: !!getToken(),
  });

  const allCollections: Collection[] = data?.pages.flatMap((page: { data: Collection[] }) =>

    (page.data || []).map((item: Collection) => ({
      ...item,
      tags: item.tags || [],
      lists: item.lists || [],
    }))
  ) || [];
  const totalCount = data?.pages[0]?.pagination?.total || 0;
  const hasMore = hasNextPage;

  // 虚拟滚动：跟踪容器宽度以计算每行列数
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // 自动加载更多（IntersectionObserver）
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { root: listContainerRef.current, rootMargin: '200px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 后端已处理筛选，前端直接使用聚合结果
  const collections = allCollections;

  // 虚拟滚动：按行虚拟化，每行 2 列（desktop）
  const COLS = containerWidth >= 1024 ? 2 : 1;
  const ROW_HEIGHT = 156; // 虚拟滚动行高
  const ITEM_HEIGHT = 140; // 实际 item 高度，小于 ROW_HEIGHT 形成竖直间距
  const virtualizer = useVirtualizer({
    count: Math.ceil(collections.length / COLS),
    getScrollElement: () => listContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // 批量操作
  const batchDeleteMutation = useMutation({

    mutationFn: (ids: string[]) => api.post('/collections/batch-delete', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedIds(new Set());
      setEditMode(false);
      showToast(t('edit.deleteSuccess'), 'success');
    },
  });

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => setSelectedIds(new Set(collections.map(c => c.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const clearUrlFilter = () => {
    if (urlFilterType === 'list') setFilterListIds(new Set());
    else if (urlFilterType === 'tag') setFilterTagIds(new Set());
    setUrlFilterType(null);
    setUrlFilterLabel('');
    setUrlFilterId('');
    // 清除URL参数
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/');
    }
  };

  // 删除收藏（带撤销）
  const handleDelete = useCallback(async (item: Collection) => {
    if (!confirm(t('collection.deleteConfirm'))) return;
    try {
      await api.delete(`/collections/${item.id}`);
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setDetailItem(null);
      setToast({
        id: item.id,
        message: t('collection.deleted', { title: item.title }),
        restoreData: item,
      });
    } catch {
      showAlert(t('common.operationFailed'), 'error');

// 认证工具函数，token 同时存储在 cookie 和 localStorage 中
// cookie 供 Next.js Middleware 读取，localStorage 供 axios 拦截器读取

const TOKEN_KEY = 'linkchest_token';
const USER_KEY = 'linkchest_user';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30天

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  // Partitioned 增强隐私隔离（CHIPS），防止跨上下文共享 cookie
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}; Partitioned`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
  // 同时设置 Expires 和 Max-Age 确保所有浏览器兼容，Partitioned 属性必须与设置时一致
  document.cookie = `${name}=; Path=/; Expires=${pastDate}; Max-Age=0; SameSite=Lax${secure}; Partitioned`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // 优先从 cookie 读取，兼容 localStorage 旧数据
  return getCookie(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  // 双写：cookie + localStorage
  localStorage.setItem(TOKEN_KEY, token);
  setCookie(TOKEN_KEY, token, COOKIE_MAX_AGE);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  deleteCookie(TOKEN_KEY);
}

export function getUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);

  return userStr ? JSON.parse(userStr) : null;
}

export function setUser(user: Record<string, unknown>): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // 通知所有监听用户变化的组件（如 Sidebar）
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('linkchest-user-updated', { detail: user }));
  }
}

export function removeUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout(): void {
  removeToken();
  removeUser();
  window.dispatchEvent(new CustomEvent('linkchest-logout'));
  // 使用 replace 避免在历史记录中留下当前受保护页面
  // 添加 logout 参数 + 时间戳：1) 跳过 login 页面的 isLoggedIn 自动重定向 2) 防止缓存 3) 强制完整页面刷新
  window.location.replace('/login?logout=1&t=' + Date.now());
}

'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getPlatformName, getPlatformColor, getPlatformIcon, isPlatformValid } from '@/lib/platforms'
import { isValidUrl, parseShareText, parseUrlPlatform } from '@/lib/utils'
import CoverEditor from '@/components/CoverEditor'
import StarRating from '@/components/StarRating'
import { PAGE_TYPES, DEFAULT_PAGE_TYPE, getPageTypeConfig, PageTypeIcon } from '@/lib/pageTypes'

type CollectionFormMode = 'add' | 'edit'

interface Tag {
  id: string
  name: string
  collectionCount?: number
}

interface ListItem {
  id: string
  name: string
  parentId: string | null
  collectionCount: number
  totalCollectionCount?: number
  isDefault?: boolean
  depth?: number
  path?: { id: string; name: string; isDefault?: boolean }[]
  pathName?: string | null
  hasChildren?: boolean
  children?: ListItem[]
}

interface Collection {
  id: string
  url: string
  title: string
  coverImage?: string
  platform: string
  note?: string
  tags: Tag[]
  lists: ListItem[]
  rating?: number | null
  pageType?: string
  createdAt: string
}

interface Props {
  mode: CollectionFormMode
  preselectedTagId?: string

  preselectedListId?: string
}

export default function CollectionForm({ mode, preselectedTagId, preselectedListId }: Props) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const isAdd = mode === 'add'
  const isEdit = mode === 'edit'
  const collectionId = isEdit ? (params.id as string) : undefined

  const initialUrl = searchParams?.get('url') || ''

  // 表单状态
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [platform, setPlatform] = useState('other')
  const [note, setNote] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    isAdd ? (preselectedTagId ? [preselectedTagId] : []) : []
  )
  const [selectedListIds, setSelectedListIds] = useState<string[]>(
    preselectedListId ? [preselectedListId] : []
  )
  const [selectedPageType, setSelectedPageType] = useState<string>(DEFAULT_PAGE_TYPE)
  const [rating, setRating] = useState<number | null>(null)
  const [expandedListIds, setExpandedListIds] = useState<Set<string>>(new Set())

  // UI状态
  const [tagSectionExpanded, setTagSectionExpanded] = useState(false)
  const [groupSectionExpanded, setGroupSectionExpanded] = useState(false)
  const [pageTypeSectionExpanded, setPageTypeSectionExpanded] = useState(false)

  const [newTagModalVisible, setNewTagModalVisible] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newListModalVisible, setNewListModalVisible] = useState(false)
  const [newListName, setNewListName] = useState('')

  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsePhase, setParsePhase] = useState('')

  const [duplicateWarning, setDuplicateWarning] = useState<any>(null)
  const [titleDuplicateWarning, setTitleDuplicateWarning] = useState<any>(null)

  const titleCheckTimer = useRef<NodeJS.Timeout | null>(null)

  // 获取标签列表
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get('/tags')
      return response.data.data || []
    },
  })

  // 获取分组列表（扁平列表）
  const { data: listsData } = useQuery({
    queryKey: ['lists', 'flat'],
    queryFn: async () => {
      const response = await api.get('/lists/flat')
      return response.data.data || []
    },
  })

  // 编辑模式：加载已有数据
  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => {
      if (!collectionId) return null
      const response = await api.get(`/collections/${collectionId}`)
      return response.data.data || response.data
    },
    enabled: isEdit && !!collectionId,
  })

  // 新增模式：读取用户设置
  const { data: userSettings } = useQuery({
    queryKey: ['users', 'settings'],
    queryFn: async () => {
      if (isEdit) return null
      const response = await api.get('/users/settings')
      return response.data?.data
    },
    enabled: isAdd,
  })

  useEffect(() => {
    if (isEdit && collection) {
      setUrl(collection.url || '')
      setTitle(collection.title || '')
      setCoverImage(collection.coverImage || '')
      setPlatform(collection.platform || 'other')
      setNote(collection.note || '')
      setSelectedTags(collection.tags?.map((tg: Tag) => tg.id) || [])
      setSelectedListIds(collection.lists?.map((l: ListItem) => l.id) || [])
      setRating(collection.rating ?? null)
      setSelectedPageType(collection.pageType || DEFAULT_PAGE_TYPE)

    }
  }, [isEdit, collection])

  useEffect(() => {
    if (userSettings && !preselectedListId && !preselectedTagId) {
      if (userSettings.defaultListId) {
        setSelectedListIds([userSettings.defaultListId])
      }
      if (userSettings.defaultTagIds?.length) {
        setSelectedTags(userSettings.defaultTagIds)
      }
    }
  }, [userSettings, preselectedListId, preselectedTagId])

  useEffect(() => {
    if (listsData && selectedListIds.length === 0) {
      const defaultList = listsData.find((l: any) => l.isDefault)
      if (defaultList) {
        setSelectedListIds([defaultList.id])
      } else if (listsData.length > 0) {
        setSelectedListIds([listsData[0].id])
      }
    }
  }, [listsData, selectedListIds.length])

  useEffect(() => {
    if (isAdd && initialUrl) {
      setUrl(initialUrl)
      parseUrl(initialUrl, true)
    }
  }, [isAdd, initialUrl])

  // 新增收藏
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/collections', data)
      return response.data.data || response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      queryClient.invalidateQueries({ queryKey: ['quota'] })
      router.push('/')
    },
    onError: (error: any) => {
      console.error('Create failed:', error)

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  FolderOpen,
  Share2,
  Settings,
  Sun,
  Moon,
  LogOut,
  Plus,
  ChevronRight,
  Tag,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import { getUser, setUser as saveUser, logout, isLoggedIn } from '@/lib/auth';
import { api } from '@/lib/api';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import Logo from './Logo';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobile?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({
  collapsed = false,
  onToggle,
  mobile = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  const menuItems = [
    { icon: LayoutGrid, label: t('sidebar.collections'), href: '/collections' },
    { icon: SlidersHorizontal, label: t('sidebar.manage'), href: '/manage' },

    { icon: Settings, label: t('sidebar.settings'), href: '/settings' },
  ];

  useEffect(() => {
    const stored = getUser();
    setUser(stored);
    setMounted(true);

    if (isLoggedIn()) {
      api
        .get('/auth/me')
        .then((res) => {
          const userData = res.data.data || res.data;
          if (userData && userData.id) {
            saveUser(userData);
            setUser(userData);
          }
        })
        .catch(() => {
          /* ignore */
        });
    }

    const handleUserUpdate = (e: Event) => {
      const userData = (e as CustomEvent).detail;
      if (userData && userData.id) {
        setUser(userData);
      }
    };
    window.addEventListener('linkchest-user-updated', handleUserUpdate);
    return () =>
      window.removeEventListener('linkchest-user-updated', handleUserUpdate);
  }, []);

  if (!mounted) {
    return (
      <aside className="w-full h-full flex flex-col bg-chest-500 border-r border-chest-400/20">
        <div
          className={cn(
            'py-5 border-b border-parchment/10',
            collapsed ? 'px-2 flex justify-center' : 'px-5'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-400 flex items-center justify-center">
              <LayoutGrid size={20} className="text-chest-500" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-parchment leading-tight">

                  {t('sidebar.appName')}
                </h1>
                <p className="text-xs text-parchment/50 mt-0.5">
                  {t('sidebar.subtitle')}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1" />
      </aside>
    );
  }

  return (
    <aside className="w-full h-full flex flex-col bg-chest-500 border-r border-chest-400/20 shadow-[4px_0_24px_rgba(0,0,0,0.08)] transition-colors duration-200">
      {/* Mobile Close Button */}
      {mobile && onMobileClose && (
        <div className="flex items-center justify-end px-4 py-2 border-b border-parchment/10 md:hidden">
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-md text-parchment/60 hover:bg-parchment/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Logo 区域 */}
      <div
        className={cn(
          'py-5 border-b border-parchment/10',
          collapsed ? 'px-2' : 'px-5'
        )}
      >
        <div
          className={cn(
            'flex items-center',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          <Logo size={collapsed ? 32 : 40} variant="dark" />
          {!collapsed && (
            <div>
              <h1 className="text-lg font-display font-semibold text-parchment leading-tight tracking-tight">
                {t('sidebar.appName')}
              </h1>
              <p className="text-xs text-parchment/50 mt-0.5 font-sans">
                {t('sidebar.subtitle')}
              </p>

            </div>
          )}
        </div>
      </div>

      {/* 添加收藏按钮 */}
      <div className={cn('pt-4', collapsed ? 'px-2' : 'px-4')}>
        <Link
          href="/add"
          className={cn(
            'flex items-center justify-center gap-2 w-full bg-amber-400 text-chest-500 rounded-md font-semibold text-sm shadow-elevated hover:bg-amber-500 hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98] active:shadow-card transition-all duration-200',
            collapsed ? 'px-2 py-3' : 'px-4 py-3'
          )}
        >
          <Plus size={18} strokeWidth={2.5} />
          {!collapsed && <span>{t('sidebar.addCollection')}</span>}
        </Link>
      </div>

      {/* 导航菜单 */}
      <nav
        className={cn(
          'flex-1 py-4 space-y-0.5',
          collapsed ? 'px-2' : 'px-3'
        )}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/manage' && pathname?.startsWith('/manage')) || (item.href === '/collections' && (pathname === '/collections' || pathname === '/'));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && onMobileClose?.()}
              className={cn(
                'group relative flex items-center rounded-md text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-parchment/10 text-amber-300'
                  : 'text-parchment/60 hover:bg-parchment/5 hover:text-parchment/90 hover:translate-x-0.5',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
              )}
            >
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-400 shadow-[0_0_8px_rgba(200,149,108,0.4)]" />
              )}
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}

'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type ToastMode = 'toast' | 'alert';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  mode: ToastMode;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showAlert: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, mode: 'toast' }]);
  }, []);

  const showAlert = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, mode: 'alert' }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showAlert }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: number) => void }) {

  const alerts = toasts.filter(t => t.mode === 'alert');
  const toastItems = toasts.filter(t => t.mode === 'toast');

  return (
    <>
      {/* Alert 模式 - 全屏模态弹窗 */}
      {alerts.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col gap-3 max-w-sm w-full mx-4">
            {alerts.map(toast => (
              <AlertItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Toast 模式 - 底部轻提醒 */}
      {toastItems.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
          {toastItems.map(toast => (
            <ToastItemComponent key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>
      )}
    </>
  );
}

const icons = {
  success: <CheckCircle size={20} className="text-sage flex-shrink-0" />,
  error: <AlertCircle size={20} className="text-rust flex-shrink-0" />,
  info: <Info size={20} className="text-chest-500 dark:text-amber-400 flex-shrink-0" />,
};

const bgColors = {
  success: 'border-sage/20 dark:border-sage/30 bg-sage/10 dark:bg-sage/20',
  error: 'border-rust/20 dark:border-rust/30 bg-rust/10 dark:bg-rust/20',
  info: 'border-chest-500/15 dark:border-amber-400/20 bg-chest-500/5 dark:bg-amber-400/10',
};

function AlertItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 px-5 py-4 bg-white dark:bg-chest-800/90 rounded-2xl shadow-2xl border ${bgColors[toast.type]} animate-scale-in pointer-events-auto`}
    >
      {icons[toast.type]}
      <p className="flex-1 text-base font-medium text-charcoal dark:text-parchment">{toast.message}</p>

      <button onClick={onClose} className="p-1.5 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded-lg transition-colors cursor-pointer">
        <X size={18} className="text-taupe" />
      </button>
    </div>
  );
}

function ToastItemComponent({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className={`flex items-center gap-3 px-5 py-3 bg-white dark:bg-chest-800/95 rounded-xl shadow-floating border ${bgColors[toast.type]} animate-slide-up pointer-events-auto cursor-pointer min-w-[280px] max-w-md`}
    >
      {icons[toast.type]}
      <p className="flex-1 text-base font-medium text-charcoal dark:text-parchment">{toast.message}</p>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="p-1 hover:bg-parchment/20 dark:hover:bg-chest-700/40 rounded-lg transition-colors cursor-pointer"
      >
        <X size={18} className="text-taupe" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (message: string, type?: ToastType) => {
        alert(message);
      },
      showAlert: (message: string, type?: ToastType) => {
        alert(message);
      },
    };
  }
  return context;
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 检查字符串是否为有效URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 解析分享文本，提取其中的URL
 */
export function parseShareText(text: string): { isShareText: boolean; url?: string } {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  if (matches && matches.length > 0) {
    return { isShareText: true, url: matches[0] };
  }
  return { isShareText: false };
}

/**
 * 从URL解析平台标识
 */
export function parseUrlPlatform(url: string): string {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();

    const platformMap: Record<string, string> = {
      'douyin.com': 'douyin',
      'iesdouyin.com': 'douyin',
      'xiaohongshu.com': 'xiaohongshu',
      'xhslink.com': 'xiaohongshu',
      'bilibili.com': 'bilibili',
      'b23.tv': 'bilibili',
      'weibo.com': 'weibo',
      'weibo.cn': 'weibo',

      'zhihu.com': 'zhihu',
      'taobao.com': 'taobao',
      'tmall.com': 'taobao',
      'jd.com': 'jd',
      'youtube.com': 'youtube',
      'youtu.be': 'youtube',
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'instagram.com': 'instagram',
      'tiktok.com': 'tiktok',
      'amazon.com': 'amazon',
      'github.com': 'github',
    };

    for (const [domain, platform] of Object.entries(platformMap)) {
      if (host.includes(domain)) {
        return platform;
      }
    }

    return 'other';
  } catch {
    return 'other';
  }
}

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Link2, Sparkles, Palette, Loader2, ImageIcon, RefreshCw, Library, Lock } from 'lucide-react';
import { api, type ApiError } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { generateDefaultCover } from '@/lib/platforms';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useQuery } from '@tanstack/react-query';

type CoverMode = 'url' | 'ai' | 'gradient' | 'library';

interface CoverEditorProps {
  value: string;
  platform: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  collectionId?: string;
}

/** 根据 coverImage 值推断用户上次选择的 mode */
function inferModeFromValue(val: string): CoverMode {
  if (!val || val.startsWith('data:image/svg')) return 'gradient';
  if (val.startsWith('data:image/') || val.includes('cos.') || val.includes('myqcloud.com')) return 'library';
  return 'url';
}

export default function CoverEditor({ value, platform, onChange, disabled, collectionId }: CoverEditorProps) {
  const { t } = useI18n();
  const { showToast, showAlert } = useToast();
  const [mode, setMode] = useState<CoverMode>(inferModeFromValue(value));
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || '');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialCheckDoneRef = useRef(false);

  const gradientSvg = generateDefaultCover(platform);

  // 系统封面库查询（必须在 useEffect 之前声明）
  const { data: systemCoversData, refetch: refetchSystemCovers } = useQuery({
    queryKey: ['systemCovers'],
    queryFn: async () => {
      const response = await api.get('/upload/system-covers');
      return response.data;
    },
    enabled: true,
  });

  // 仅在组件首次挂载且系统封面数据加载完成后，若当前值匹配 AI 封面则自动切换到 ai 模式
  // 避免用户手动切换模式后被强制拉回
  useEffect(() => {
    if (!value || initialCheckDoneRef.current || !systemCoversData?.data) return;
    const isSystemCover = systemCoversData.data.some((c: { cosUrl: string }) => c.cosUrl === value);
    initialCheckDoneRef.current = true;
    if (isSystemCover && mode !== 'ai') {
      setMode('ai');
    }
  }, [systemCoversData?.data, value]);

  // 获取用户订阅级别，判断是否有封面上传权限（heavy / super 用户可用）
  const user = typeof window !== 'undefined' ? getUser() : null;
  const userTier = (user?.userTier as string) || 'medium';
  const canUploadCover = userTier === 'heavy' || userTier === 'super';

  // 封面库查询
  const { data: coverLibraryData, refetch: refetchCovers } = useQuery({
    queryKey: ['coverLibrary'],
    queryFn: async () => {
      const response = await api.get('/upload/covers?limit=50');
      return response.data;
    },
    enabled: mode === 'library',
  });

  const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(img.src);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('图片加载失败，可能是不支持的格式'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

