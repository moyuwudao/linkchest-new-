/**
 * 业务常量中心
 * 集中管理所有业务相关的硬编码数值，避免魔法数字分散在各文件中
 */

// ===== 时间周期（天）=====
export const TRASH_RETENTION_DAYS = 30
export const SHARE_ITEM_RETENTION_DAYS = 180
export const SHARE_ITEM_ACTIVE_RETENTION_DAYS = 365
export const ERROR_EVENT_RETENTION_DAYS = 30
export const COVER_CLEANUP_DAYS = 7

// ===== 时间周期（秒）=====
export const USER_CACHE_TTL_SECONDS = 300
export const SHARE_CACHE_TTL_SECONDS = 7 * 24 * 3600 // 7天
export const VERIFY_CODE_TTL_SECONDS = 600 // 10分钟
export const METADATA_CACHE_TTL_SECONDS = 86400 // 24小时

// ===== 限流配置 =====
export const IP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1小时
export const IP_RATE_LIMIT_MAX = 10
export const GLOBAL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15分钟
export const GLOBAL_RATE_LIMIT_MAX = 5000 // 放宽：服务器资源增大后，正常用户 15 分钟内不应被误拦
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15分钟
export const AUTH_RATE_LIMIT_MAX = 60 // 放宽：登录/验证码高频操作可用

// ===== 分页配置 =====
export const DEFAULT_PAGE_SIZE = 40
export const MAX_PAGE_SIZE = 100

// ===== 元数据抓取配置 =====
// 从环境变量读取并发数，兼容不同服务器配置；默认 3（2核4G 服务器跑 5 个并发会拖慢全局）
export const METADATA_MAX_CONCURRENT = Number(process.env.METADATA_MAX_CONCURRENT) || 3
export const METADATA_FETCH_TIMEOUT_MS = 4000
export const METADATA_TOTAL_TIMEOUT_MS = 8000
export const METADATA_LRU_CACHE_MAX_SIZE = 500

// ===== 配额配置 =====
export const QUOTA_FUNCTIONAL_UNLIMITED = 999_999
export const QUOTA_DAILY_COUNTER_TTL_SECONDS = 24 * 3600 // 24小时

// ===== 列表/分组配置 =====
export const MAX_LIST_DEPTH = 2

// ===== 邀请码配置 =====
export const REFERRAL_CODE_LENGTH = 6
export const REFERRAL_CODE_MAX_ATTEMPTS = 10
export const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// ===== 告警配置 =====
export const ALERT_SCAN_INTERVAL_MS = 15 * 60 * 1000 // 15分钟
export const ALERT_DEFAULT_COOLDOWN_MINUTES = 30
export const ALERT_HEALTH_CHECK_MAX_FAILURES = 3

// ===== 分享配置 =====
export const SHARE_PASSWORD_MIN_LENGTH = 4
export const SHARE_PASSWORD_MAX_LENGTH = 20
export const SHARE_TITLE_MAX_LENGTH = 100
export const SHARE_DESCRIPTION_MAX_LENGTH = 1000

// ===== 上传配置 =====
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024 // 5MB
export const AVATAR_DIMENSION = 200
export const COVER_MAX_SIZE = 5 * 1024 * 1024 // 5MB
export const COVER_TARGET_SIZE = 80 * 1024 // 80KB
export const COVER_MAX_DIMENSION = 800

// ===== 导入配置 =====
export const IMPORT_BATCH_SIZE = 100

// ===== 账号安全配置 =====
export const MAX_LOGIN_ATTEMPTS = 5
export const ACCOUNT_LOCK_DURATION_MINUTES = 15
export const VERIFY_CODE_MAX_ATTEMPTS = 5
export const VERIFY_CODE_SEND_COOLDOWN_MS = 60 * 1000 // 1分钟
export const VERIFY_CODE_LENGTH = 6

// ===== 通用配置 =====
export const DEFAULT_LANGUAGE = 'zh'
export const JWT_TOKEN_PREFIX = 'Bearer '
export const JSON_BODY_LIMIT = '10mb'
