/**
 * Prometheus 业务指标（prom-client）
 * 暴露 /metrics 端点供 Prometheus/Grafana 拉取
 * - prom-client 未安装时优雅降级，所有埋点函数为空操作
 */
import logger from '../lib/logger'

// 尝试加载 prom-client，未安装时降级为 noop
let client: any = null
let register: any = null
let promAvailable = false

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  client = require('prom-client')
  register = client.register
  promAvailable = true

  client.collectDefaultMetrics({
    register,
    prefix: 'lc_nodejs_',
  })
} catch {
  logger.warn('prom-client 未安装，Prometheus 指标功能不可用')
}

// 创建 noop 指标对象（兼容接口，不记录任何数据）
function noopCounter(): any {
  return { inc: () => {} }
}
function noopGauge(): any {
  return { set: () => {}, reset: () => {} }
}

// ===== 业务 Counter 指标 =====

/** 收藏创建总数（按平台标签） */
export const collectionsCreatedTotal = promAvailable
  ? new client.Counter({
      name: 'lc_collections_created_total',
      help: 'Total number of collections created',
      labelNames: ['platform'],
    })
  : noopCounter()

/** 分享页浏览总数 */
export const shareViewTotal = promAvailable
  ? new client.Counter({
      name: 'lc_share_view_total',
      help: 'Total number of share page views',
      labelNames: ['cache'],
    })
  : noopCounter()

/** 支付成功总数（按来源和套餐） */
export const paymentSuccessTotal = promAvailable
  ? new client.Counter({
      name: 'lc_payment_success_total',
      help: 'Total number of successful payments',
      labelNames: ['source', 'tier'],
    })
  : noopCounter()

/** 支付金额累计（美元，按来源和套餐） */
export const paymentAmountTotal = promAvailable
  ? new client.Counter({
      name: 'lc_payment_amount_usd_total',
      help: 'Total payment amount in USD cents',
      labelNames: ['source', 'tier'],
    })
  : noopCounter()

/** 用户注册总数（按来源） */
export const userRegisteredTotal = promAvailable
  ? new client.Counter({
      name: 'lc_user_registered_total',
      help: 'Total number of user registrations',
      labelNames: ['source'],
    })
  : noopCounter()

/** API 请求总数（按方法和路径） */
export const apiRequestTotal = promAvailable
  ? new client.Counter({
      name: 'lc_api_request_total',
      help: 'Total number of API requests',
      labelNames: ['method', 'path', 'status'],
    })
  : noopCounter()

/** 邀请码生成总数 */
export const referralCodeGeneratedTotal = promAvailable
  ? new client.Counter({
      name: 'lc_referral_code_generated_total',
      help: 'Total number of referral codes generated',
    })
  : noopCounter()

/** 邀请注册转化总数 */
export const referralRegistrationTotal = promAvailable
  ? new client.Counter({
      name: 'lc_referral_registration_total',
      help: 'Total number of registrations via referral',
    })
  : noopCounter()

/** 邀请奖励发放总数 */
export const referralRewardGivenTotal = promAvailable
  ? new client.Counter({
      name: 'lc_referral_reward_given_total',
      help: 'Total number of referral rewards given',
      labelNames: ['type'],
    })
  : noopCounter()

// ===== 业务 Gauge 指标 =====

/** 日活跃用户（DAU）—— 由定时任务每日更新 */
export const userActiveDaily = promAvailable
  ? new client.Gauge({
      name: 'lc_user_active_daily',
      help: 'Daily active users',
    })
  : noopGauge()

/** 用户套餐分布 */
export const userTierDistribution = promAvailable
  ? new client.Gauge({
      name: 'lc_user_tier_distribution',
      help: 'Number of users per tier',
      labelNames: ['tier'],
    })
  : noopGauge()

/** 收藏总数 */
export const collectionsTotal = promAvailable
  ? new client.Gauge({
      name: 'lc_collections_total',
      help: 'Total number of collections in database',
    })
  : noopGauge()

/** 分享总数 */
export const sharesTotal = promAvailable
  ? new client.Gauge({
      name: 'lc_shares_total',
      help: 'Total number of shares in database',
    })
  : noopGauge()

/** 元数据队列待处理任务数 */
export const metadataQueuePending = promAvailable
  ? new client.Gauge({
      name: 'lc_metadata_queue_pending',
      help: 'Number of pending metadata fetch tasks',
    })
  : noopGauge()

// ===== TMS 内容审核指标 =====

/** TMS 审核调用总数（按 bizType / label / safe 标签） */
export const tmsModerationTotal = promAvailable
  ? new client.Counter({
      name: 'lc_tms_moderation_total',
      help: 'Total number of TMS moderation calls',
      labelNames: ['bizType', 'label', 'safe'],
    })
  : noopCounter()

/** TMS 审核拒绝次数（safe=false） */
export const tmsModerationBlockedTotal = promAvailable
  ? new client.Counter({
      name: 'lc_tms_moderation_blocked_total',
      help: 'Total number of TMS moderation blocks',
      labelNames: ['bizType', 'label'],
    })
  : noopCounter()

/** TMS 审核耗时（毫秒） */
export const tmsModerationDurationMs = promAvailable
  ? new client.Histogram({
      name: 'lc_tms_moderation_duration_ms',
      help: 'TMS moderation call duration in milliseconds',
      labelNames: ['bizType', 'success'],
      buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
    })
  : noopCounter()

/** TMS 审核失败次数（API 调用错误） */
export const tmsModerationErrorTotal = promAvailable
  ? new client.Counter({
      name: 'lc_tms_moderation_error_total',
      help: 'Total number of TMS moderation API errors',
      labelNames: ['bizType'],
    })
  : noopCounter()

// ===== 便捷埋点函数 =====

/** 记录收藏创建 */
export function recordCollectionCreated(platform: string): void {
  if (promAvailable) {
    collectionsCreatedTotal.inc({ platform: platform || 'unknown' })
  }
}

/** 记录分享页浏览 */
export function recordShareView(cacheHit: boolean): void {
  if (promAvailable) {
    shareViewTotal.inc({ cache: cacheHit ? 'hit' : 'miss' })
  }
}

/** 记录支付成功 */
export function recordPaymentSuccess(source: string, tier: string, amountUsdCents: number): void {
  if (promAvailable) {
    paymentSuccessTotal.inc({ source, tier })
    paymentAmountTotal.inc({ source, tier }, amountUsdCents)
  }
}

/** 记录用户注册 */
export function recordUserRegistered(source: string = 'direct'): void {
  if (promAvailable) {
    userRegisteredTotal.inc({ source })
  }
}

/** 记录内容审核调用 */
export function recordContentModeration(params: {
  safe: boolean
  label: string
  durationMs: number
  bizType: string
  error?: boolean
}): void {
  if (!promAvailable) return
  const { safe, label, durationMs, bizType, error } = params
  const success = !error
  tmsModerationTotal.inc({ bizType, label, safe: String(safe) })
  if (!safe) {
    tmsModerationBlockedTotal.inc({ bizType, label })
  }
  if (error) {
    tmsModerationErrorTotal.inc({ bizType })
  }
  tmsModerationDurationMs.observe({ bizType, success: String(success) }, durationMs)
}

/** 记录 API 请求 */
export function recordApiRequest(method: string, path: string, status: number): void {
  if (promAvailable) {
    apiRequestTotal.inc({ method, path, status: String(status) })
  }
}

// ===== 定时任务更新指标 =====

/** 更新用户分布指标（由定时任务调用） */
export async function updateUserDistributionMetrics(prisma: any): Promise<void> {
  if (!promAvailable) return
  try {
    const tiers = await prisma.user.groupBy({
      by: ['userTier'],
      _count: { userTier: true },
      where: { status: 'active' },
    })

    userTierDistribution.reset()

    for (const t of tiers) {
      userTierDistribution.set({ tier: t.userTier || 'free' }, t._count.userTier)
    }

    const [collectionCount, shareCount] = await Promise.all([
      prisma.collection.count({ where: { deletedAt: null } }),
      prisma.share.count(),
    ])
    collectionsTotal.set(collectionCount)
    sharesTotal.set(shareCount)
  } catch {
    // 指标更新失败不应影响主流程
  }
}

/** 更新 DAU（由定时任务调用） */
export async function updateDauMetrics(prisma: any): Promise<void> {
  if (!promAvailable) return
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dau = await prisma.collection.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: today } },
      _count: { userId: true },
    })

    userActiveDaily.set(dau.length)
  } catch {
    // 指标更新失败不应影响主流程
  }
}

/** 获取 Prometheus 指标文本 */
export async function getMetricsText(): Promise<string> {
  if (!promAvailable || !register) {
    return '# Prometheus metrics disabled (prom-client not installed)\n'
  }
  return register.metrics()
}
