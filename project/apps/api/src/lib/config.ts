// 集中管理应用配置，避免分散的硬编码回退值
// 确保 dotenv 在读取环境变量之前加载
import dotenv from 'dotenv'
import {
  USER_CACHE_TTL_SECONDS,
  SHARE_CACHE_TTL_SECONDS,
  METADATA_CACHE_TTL_SECONDS,
  METADATA_TOTAL_TIMEOUT_MS,
  METADATA_FETCH_TIMEOUT_MS,
  METADATA_MAX_CONCURRENT,
  METADATA_LRU_CACHE_MAX_SIZE,
  ALERT_SCAN_INTERVAL_MS,
  COVER_CLEANUP_DAYS,
  AVATAR_MAX_SIZE,
  AVATAR_DIMENSION,
  COVER_MAX_SIZE,
  COVER_TARGET_SIZE,
  COVER_MAX_DIMENSION,
} from './constants'
dotenv.config()

// JWT 密钥：强制要求环境变量，不提供弱默认值
export const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('❌ FATAL: JWT_SECRET 环境变量未设置！请先配置 JWT_SECRET 后再启动服务。')
    process.exit(1)
  }
  return secret
})()

// CORS 允许的来源：支持逗号分隔多个来源
export const CORS_ORIGINS = (() => {
  const envOrigins = process.env.CORS_ORIGIN
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean)
  }
  // 默认仅允许本地开发
  return ['http://localhost:3000', 'http://localhost:3001']
})()

// 分享链接基础 URL（指向 Web 前端，用于生成分享链接和浏览器重定向）
export const SHARE_BASE_URL = process.env.SHARE_BASE_URL || 'http://localhost:3003'

// Web 前端基础 URL（浏览器访问 /s/:id 时重定向到此地址）
export const WEB_BASE_URL = process.env.WEB_BASE_URL || SHARE_BASE_URL

// API 端口
export const PORT = parseInt(process.env.PORT || '3001', 10)

// 共享业务常量
export const DEFAULT_LIST_KEY = '__DEFAULT_LIST__'
export const DEFAULT_LIST_DESC = '__DEFAULT_LIST_DESC__'

// ===== COS 配置 =====
export const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID || '',
  secretKey: process.env.COS_SECRET_KEY || '',
  bucket: process.env.COS_BUCKET || '',
  region: process.env.COS_REGION || 'ap-guangzhou',
  domain: process.env.COS_DOMAIN || '', // 自定义域名（可选）
}

// ===== 配额配置 =====
export type UserTier = 'medium' | 'heavy' | 'super'

export interface QuotaLimits {
  // 数值型配额
  collections: number
  tags: number
  lists: number
  shares: number
  shareItems: number
  coverImages: number        // 封面总量上限（保留兼容）
  coverImagesDaily: number   // 日上传封面数（v3.0 核心限制）
  maxItemsPerShare: number   // 单次分享容量上限
  dailyImportLimit: number   // 每日导入条数上限
  metadataDailyLimit: number // 元数据日抓取上限
  trashRetentionDays: number // 回收站保留天数
  // 功能开关型（true=开启，false=关闭）
  sharePassword: boolean     // 分享密码保护
  shareStats: boolean        // 分享访问统计
  shareExpiry: boolean       // 分享有效期设置
  shareRating: boolean       // 分享时附带评分
  customShareCover: boolean  // 自定义分享封面
  shareLayout: boolean       // 分享布局选择（非 grid）
  batchOps: boolean          // 批量操作
  exportPdf: boolean         // PDF 导出
  prioritySupport: boolean
  earlyAccess: boolean
}

// ===== 配额配置（v3.0）=====
// 核心原则：非服务器瓶颈资源设极高上限（999,999 = 功能性无限）
// 分级限制聚焦：分享数量、单次分享容量、日导入条数
export const QUOTA_CONFIG: Record<UserTier, QuotaLimits> = {
  // 基础版：体验核心功能不设限，分享/导入做收敛引导升级
  medium: { collections: 999999, tags: 999999, lists: 999999, shares: 10, shareItems: 999999, coverImages: 999999, coverImagesDaily: 5, maxItemsPerShare: 100, dailyImportLimit: 200, metadataDailyLimit: 30, trashRetentionDays: 7, sharePassword: false, shareStats: false, shareExpiry: false, shareRating: false, customShareCover: false, shareLayout: false, batchOps: false, exportPdf: false, prioritySupport: false, earlyAccess: false },
  // 专业版：分享和单次容量大幅提升，导入日配额够用
  heavy:  { collections: 999999, tags: 999999, lists: 999999, shares: 50, shareItems: 999999, coverImages: 999999, coverImagesDaily: 20, maxItemsPerShare: 300, dailyImportLimit: 1000, metadataDailyLimit: 200, trashRetentionDays: 30, sharePassword: true, shareStats: true, shareExpiry: true, shareRating: true, customShareCover: true, shareLayout: true, batchOps: true, exportPdf: false, prioritySupport: false, earlyAccess: false },
  // 旗舰版：所有开放类资源功能性无限，分享/导入日配额最高
  super:  { collections: 999999, tags: 999999, lists: 999999, shares: 300, shareItems: 999999, coverImages: 999999, coverImagesDaily: 100, maxItemsPerShare: 1000, dailyImportLimit: 5000, metadataDailyLimit: 500, trashRetentionDays: 90, sharePassword: true, shareStats: true, shareExpiry: true, shareRating: true, customShareCover: true, shareLayout: true, batchOps: true, exportPdf: true, prioritySupport: true, earlyAccess: true },
}

// ===== 头像处理配置 =====
export const AVATAR_CONFIG = {
  maxUploadSize: AVATAR_MAX_SIZE,
  dimension: AVATAR_DIMENSION, // 200x200 正方形
  format: 'webp' as const,
  quality: 80,
  urlExpirySeconds: SHARE_CACHE_TTL_SECONDS, // 签名URL 7天
  redisCacheTtl: USER_CACHE_TTL_SECONDS, // Redis缓存 5天
}

// ===== 封面处理配置 =====
export const COVER_CONFIG = {
  maxUploadSize: COVER_MAX_SIZE,
  recommendSize: 2 * 1024 * 1024, // 2MB（前端建议）
  targetSize: COVER_TARGET_SIZE,
  maxDimension: COVER_MAX_DIMENSION,
  format: 'webp' as const,
  quality: 80,
  urlExpirySeconds: SHARE_CACHE_TTL_SECONDS, // 签名URL 7天（Mobile端无法像Web端缓存Blob，需较长有效期）
  redisCacheTtl: USER_CACHE_TTL_SECONDS, // Redis缓存 5天
  cleanupDays: COVER_CLEANUP_DAYS,
}

// ===== 本地缓存配置 =====
export const CACHE_CONFIG = {
  mobileMaxSize: 100 * 1024 * 1024, // 100MB
  webMaxSize: 50 * 1024 * 1024, // 50MB
}

// ===== SES 邮件推送配置 =====
export const SES_CONFIG = {
  secretId: process.env.TENCENTCLOUD_SECRET_ID || '',
  secretKey: process.env.TENCENTCLOUD_SECRET_KEY || '',
  region: process.env.SES_REGION || 'ap-guangzhou',
  fromEmail: process.env.SES_FROM_EMAIL || 'noreply@linkchest.net',
}

// ===== TMS 腾讯云内容安全配置 =====
export const TMS_CONFIG = {
  secretId: process.env.TENCENTCLOUD_SECRET_ID || '',
  secretKey: process.env.TENCENTCLOUD_SECRET_KEY || '',
  // 与 SES/COS-国内版保持一致,内网互通 + 低延迟
  region: process.env.TMS_REGION || 'ap-guangzhou',
  // 是否启用(国内版且密钥已配置时为 true)
  enabled: !!(process.env.TENCENTCLOUD_SECRET_ID && process.env.TENCENTCLOUD_SECRET_KEY),
}

// ===== Google OAuth 配置 =====
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''

// ===== 运维监控配置 =====
export const ADMIN_CONFIG = {
  /** 管理员用户ID列表，逗号分隔 */
  userIds: (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
  /** 告警引擎开关 */
  alertingEnabled: process.env.ALERTING_ENABLED !== 'false',
  /** 告警扫描间隔（毫秒），默认 15 分钟 */
  alertScanIntervalMs: parseInt(process.env.ALERT_SCAN_INTERVAL_MS || String(ALERT_SCAN_INTERVAL_MS), 10),
  /** 告警接收邮箱，逗号分隔 */
  alertEmails: (process.env.ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean),
  /** 飞书 Webhook URL */
  feishuWebhook: process.env.FEISHU_WEBHOOK_URL || '',
  /** 企业微信 Webhook URL */
  wecomWebhook: process.env.WECOM_WEBHOOK_URL || '',
}

// ===== 元数据抓取配置 =====
export const METADATA_CONFIG = {
  // Redis 缓存 24 小时（V3.6 优化：从 1 小时延长到 24 小时，大幅减少重复抓取）
  cacheTtlSeconds: METADATA_CACHE_TTL_SECONDS,
  // 单次抓取总超时 8 秒（P1 优化：从 10s 缩短到 8s，加快失败回退）
  totalTimeoutMs: METADATA_TOTAL_TIMEOUT_MS,
  // 单个 HTTP 请求超时 4 秒（P1 优化：从 5s 缩短到 4s）
  fetchTimeoutMs: METADATA_FETCH_TIMEOUT_MS,
  // 最大并发抓取数（配合 metadata-queue.ts 的 p-limit）
  maxConcurrentFetch: METADATA_MAX_CONCURRENT,
  // 内存 LRU 缓存最大条目数
  lruCacheMaxSize: METADATA_LRU_CACHE_MAX_SIZE,
}

// ===== 套餐品牌名映射 =====
export const TIER_DISPLAY_NAMES: Record<UserTier, { nameZh: string; nameEn: string }> = {
  medium: { nameZh: '基础版', nameEn: 'Free' },
  heavy:  { nameZh: '专业版', nameEn: 'Pro' },
  super:  { nameZh: '旗舰版', nameEn: 'Ultimate' },
}

// ===== 定价配置（价格单位：美元美分，避免浮点精度问题） =====
export type BillingCycle = 'monthly' | 'yearly'

export interface PlanPrice {
  usd: number  // 美元美分
  cny?: number // 人民币分（国内市场）
}

export interface PlanPricing {
  monthly: PlanPrice
  yearly: PlanPrice
}

// ===== 定价配置 =====
// 国内市场：价格单位为人民币分（cny），国内市场必须配置 cny，缺失时显示为 $0 是错误的
// 海外市场：价格单位为美元美分（usd）
// cny 与 usd 同步设置，避免任一市场显示为空或单位错误
export const PRICING_CONFIG: Record<Exclude<UserTier, 'medium'>, PlanPricing> = {
  heavy: {
    // 国内：¥19/月、¥199/年（8折）；海外：$2.99/月、$28.71/年
    monthly: { usd: 299, cny: 1990 },
    yearly:  { usd: 2871, cny: 19900 },
  },
  super: {
    // 国内：¥39/月、¥399/年（8折）；海外：$5.99/月、$57.51/年
    monthly: { usd: 599, cny: 3990 },
    yearly:  { usd: 5751, cny: 39900 },
  },
}

// ===== 广场配置（已下线，保留以备后续恢复） =====
// export const PLAZA_CONFIG = {
//   pageSize: 20,
//   previewItems: 3,
//   defaultTags: ['技术', '设计', '生活', '娱乐', '学习'],
// }
