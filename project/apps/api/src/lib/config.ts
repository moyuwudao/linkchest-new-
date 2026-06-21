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
// 优先读 SHARE_BASE_URL，未设置则回退到 FRONTEND_URL / WEB_BASE_URL，避免生产环境误用 localhost
export const SHARE_BASE_URL = process.env.SHARE_BASE_URL || process.env.FRONTEND_URL || process.env.WEB_BASE_URL || 'http://localhost:3003'

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
  // 功能开关型（true=开启，false=关闭）- 仅保留已实现的功能
  sharePassword: boolean     // 分享密码保护（分享增强）
  shareExpiry: boolean       // 分享有效期设置（分享增强）
  shareRating: boolean       // 分享时附带评分（分享增强）
  duplicateCheck: boolean     // 重复检测
  autoBackup: boolean        // 自动备份
}

// ===== 配额配置（v4.1 - 仅年付，移除未实现功能字段）=====
// v4.1: 仅支持年付（¥98），删除未实现功能字段 (shareStats/shareViews/shareLayout/
//       batchOps/exportPdf/prioritySupport/earlyAccess/customShareCover)
// v4.0: 简化为 2 档套餐（medium=免费, heavy=付费）
//       super 保留内部数据兼容，UI 不展示（未来扩展/企业版使用）
export const QUOTA_CONFIG: Record<UserTier, QuotaLimits> = {
  // 免费版（medium）
  medium: { collections: 999999, tags: 999999, lists: 999999, shares: 5, shareItems: 999999, coverImages: 999999, coverImagesDaily: 5, maxItemsPerShare: 50, dailyImportLimit: 15, metadataDailyLimit: 30, trashRetentionDays: 7, sharePassword: false, shareExpiry: false, shareRating: false, duplicateCheck: false, autoBackup: false },
  // 付费版（heavy）¥98/年
  heavy:  { collections: 999999, tags: 999999, lists: 999999, shares: 100, shareItems: 999999, coverImages: 999999, coverImagesDaily: 80, maxItemsPerShare: 200, dailyImportLimit: 100, metadataDailyLimit: 200, trashRetentionDays: 30, sharePassword: true, shareExpiry: true, shareRating: true, duplicateCheck: true, autoBackup: true },
  // 旗舰版（super）：保留内部数据兼容，UI 不展示（未来扩展/企业版使用）
  super:  { collections: 999999, tags: 999999, lists: 999999, shares: 300, shareItems: 999999, coverImages: 999999, coverImagesDaily: 100, maxItemsPerShare: 1000, dailyImportLimit: 5000, metadataDailyLimit: 500, trashRetentionDays: 90, sharePassword: true, shareExpiry: true, shareRating: true, duplicateCheck: true, autoBackup: true },
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
  medium: { nameZh: '普通版', nameEn: 'Free' },
  heavy:  { nameZh: '进阶版', nameEn: 'Pro' },
  // 内部保留名称（UI 不展示，未来企业版扩展用）
  super:  { nameZh: '企业版', nameEn: 'Enterprise' },
}

// ===== 定价配置（价格单位：美元美分，避免浮点精度问题） =====
// v4.2: 支持月付+年付
export type BillingCycle = 'monthly' | 'yearly'

export interface PlanPrice {
  usd: number  // 美元美分
  cny?: number // 人民币分（国内市场）
}

export interface PlanPricing {
  // v4.2: 恢复月付
  monthly: PlanPrice
  yearly: PlanPrice
}

// ===== 定价配置 =====
// 国内市场：价格单位为人民币分（cny），国内市场必须配置 cny，缺失时显示为 $0 是错误的
// 海外市场：价格单位为美元美分（usd）
// cny 与 usd 同步设置，避免任一市场显示为空或单位错误
// v4.2: heavy 月付 ¥9.8/月，年付 ¥98/年；super 内部保留（企业版），UI 不展示
export const PRICING_CONFIG: Record<Exclude<UserTier, 'medium'>, PlanPricing> = {
  heavy: {
    // 国内：月付 ¥9.8，年付 ¥98；海外：$1.49/月，$14.99/年
    monthly: { usd: 149, cny: 980 },
    yearly: { usd: 1499, cny: 9800 },
  },
  super: {
    // 国内：月付 ¥19.9，年付 ¥199；海外：$2.87/月，$28.71/年（企业版，UI 不展示）
    monthly: { usd: 287, cny: 1990 },
    yearly: { usd: 2871, cny: 19900 },
  },
}

// ===== 广场配置（已下线，保留以备后续恢复） =====
// export const PLAZA_CONFIG = {
//   pageSize: 20,
//   previewItems: 3,
//   defaultTags: ['技术', '设计', '生活', '娱乐', '学习'],
// }
