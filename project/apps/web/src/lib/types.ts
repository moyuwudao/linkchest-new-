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
