/**
 * 每日运营报告服务（国内版）
 * - 每日上午 9:00 由 scheduler 触发
 * - 聚合昨日运营数据，生成摘要
 * - 通过飞书 + 企业微信 Webhook 推送
 * - 一期不落库，仅推送
 */

import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { fetchWithTimeout } from '../lib/fetchWithTimeout'
import { getMetrics } from './metrics'
import { getWebhookConfig } from './systemConfig'
import { isChinaMarket } from '../lib/market'

// 报告开关
const isEnabled = process.env.DAILY_REPORT_ENABLED !== 'false'

interface DailyReportMetrics {
  reportDate: string
  newUsers: number
  dau: number
  totalUsers: number
  newCollections: number
  totalCollections: number
  newShares: number
  totalShares: number
  newShareViews: number
  shareViews24h: number
  newSubscriptions: number
  revenueCny: number
  revenueUsd: number
  requests24h: number
  errorRate24h: number
  avgDuration24h: number
  alertCount24h: number
  referralUses: number
}

interface ReportSection {
  title: string
  items: Array<{ label: string; value: string; trend?: string }>
}

/**
 * 构建每日运营报告数据
 * 供定时任务和测试按钮复用
 */
export async function buildDailyReport(): Promise<{ metrics: DailyReportMetrics; sections: ReportSection[]; summaryText: string }> {
  const metrics = await aggregateMetrics()
  const sections = buildReportSections(metrics)
  const summaryText = buildSummaryText(metrics)
  return { metrics, sections, summaryText }
}

/**
 * 向指定 Webhook 发送已构建好的日报
 */
export async function sendDailyReportToWebhooks(
  webhooks: { feishu?: string; wecom?: string },
  sections: ReportSection[],
  reportDate: string,
): Promise<string[]> {
  const channels: string[] = []

  if (webhooks.feishu) {
    try {
      await sendFeishuReport(webhooks.feishu, sections, reportDate)
      channels.push('feishu')
    } catch (e) {
      logger.warn({ err: (e as Error).message }, '飞书运营日报发送失败')
      throw new Error(`飞书: ${(e as Error).message}`)
    }
  }

  if (webhooks.wecom) {
    try {
      await sendWeComReport(webhooks.wecom, sections, reportDate)
      channels.push('wecom')
    } catch (e) {
      logger.warn({ err: (e as Error).message }, '企业微信运营日报发送失败')
      throw new Error(`企微: ${(e as Error).message}`)
    }
  }

  return channels
}

/**
 * 生成并发送每日运营报告
 */
export async function generateDailyReport(): Promise<{ success: boolean; channels: string[]; message?: string }> {
  if (!isEnabled) {
    logger.info('每日运营报告已禁用（DAILY_REPORT_ENABLED=false）')
    return { success: false, channels: [], message: 'disabled' }
  }

  if (!isChinaMarket()) {
    logger.info('非国内市场，跳过每日运营报告')
    return { success: false, channels: [], message: 'not china market' }
  }

  try {
    logger.info('🕐 开始生成每日运营报告...')

    const { metrics, sections, summaryText } = await buildDailyReport()

    // 获取全局 Webhook 配置
    const globalWebhooks = await getWebhookConfig()

    const channels = await sendDailyReportToWebhooks(globalWebhooks, sections, metrics.reportDate)

    if (channels.length === 0) {
      logger.warn('未配置飞书/企业微信 Webhook，运营日报未发送')
      return { success: false, channels: [], message: 'no channels configured' }
    }

    logger.info({ channels, date: metrics.reportDate, summary: summaryText }, '✅ 每日运营报告发送完成')
    return { success: true, channels }
  } catch (e) {
    const errMsg = (e as Error).message
    logger.error({ err: errMsg }, '❌ 每日运营报告生成失败')
    return { success: false, channels: [], message: errMsg }
  }
}

/**
 * 聚合昨日运营指标
 */
async function aggregateMetrics(): Promise<DailyReportMetrics> {
  const now = new Date()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const reportDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  const yesterdayStart = yesterday
  const yesterdayEnd = today

  // 并行聚合业务数据
  const [
    newUsers,
    totalUsers,
    newCollections,
    totalCollections,
    newShares,
    totalShares,
    newShareViews,
    shareViews24h,
    newSubscriptions,
    revenueAgg,
    alertCount24h,
    referralUses,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } } }),
    prisma.user.count(),
    prisma.collection.count({ where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd }, deletedAt: null } }),
    prisma.collection.count({ where: { deletedAt: null } }),
    prisma.share.count({ where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } } }),
    prisma.share.count(),
    prisma.shareView.count({ where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } } }),
    prisma.shareView.count({ where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } } }),
    prisma.subscription.count({ where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd }, status: 'active' } }),
    prisma.subscription.aggregate({
      where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd }, status: 'active' },
      _sum: { priceCny: true, priceUsd: true },
    }),
    prisma.alertHistory.count({ where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } } }),
    prisma.referralUse.count({ where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } } }),
  ])

  // Redis 请求指标（24 小时）
  const requestMetrics = await getMetrics(1440).catch(() => ({
    totalRequests: 0,
    totalErrors: 0,
    avgDuration: 0,
    errorRate: 0,
    statusDistribution: {},
  }))

  // DAU：按昨日有收藏创建行为的用户去重（与 updateDauMetrics 逻辑一致）
  const dauResult = await prisma.collection.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    _count: { userId: true },
  }).catch(() => [])

  return {
    reportDate,
    newUsers,
    dau: dauResult.length,
    totalUsers,
    newCollections,
    totalCollections,
    newShares,
    totalShares,
    newShareViews,
    shareViews24h,
    newSubscriptions,
    revenueCny: revenueAgg._sum.priceCny || 0,
    revenueUsd: revenueAgg._sum.priceUsd || 0,
    requests24h: requestMetrics.totalRequests,
    errorRate24h: requestMetrics.errorRate,
    avgDuration24h: requestMetrics.avgDuration,
    alertCount24h,
    referralUses,
  }
}

/**
 * 构建报告分块（用于飞书卡片）
 */
function buildReportSections(metrics: DailyReportMetrics): ReportSection[] {
  const formatCurrency = (cents: number, currency: string) => {
    if (cents === 0) return `0 ${currency}`
    const value = currency === 'CNY' ? (cents / 100).toFixed(2) : (cents / 100).toFixed(2)
    return `${value} ${currency}`
  }

  return [
    {
      title: '用户增长',
      items: [
        { label: '新增用户', value: String(metrics.newUsers) },
        { label: 'DAU', value: String(metrics.dau) },
        { label: '累计用户', value: String(metrics.totalUsers) },
      ],
    },
    {
      title: '内容数据',
      items: [
        { label: '新增收藏', value: String(metrics.newCollections) },
        { label: '累计收藏', value: String(metrics.totalCollections) },
        { label: '新增分享', value: String(metrics.newShares) },
        { label: '累计分享', value: String(metrics.totalShares) },
        { label: '分享页浏览', value: String(metrics.shareViews24h) },
      ],
    },
    {
      title: '收入数据',
      items: [
        { label: '新增订阅', value: String(metrics.newSubscriptions) },
        { label: '人民币收入', value: formatCurrency(metrics.revenueCny, 'CNY') },
        { label: '美元收入', value: formatCurrency(metrics.revenueUsd, 'USD') },
      ],
    },
    {
      title: '系统稳定性',
      items: [
        { label: '24h 请求量', value: String(metrics.requests24h) },
        { label: '24h 错误率', value: `${(metrics.errorRate24h * 100).toFixed(2)}%` },
        { label: '平均响应时间', value: `${metrics.avgDuration24h} ms` },
        { label: '24h 告警次数', value: String(metrics.alertCount24h) },
      ],
    },
    {
      title: '邀请码',
      items: [
        { label: '昨日邀请使用', value: String(metrics.referralUses) },
      ],
    },
  ]
}

/**
 * 构建纯文本摘要（用于日志/企微）
 */
function buildSummaryText(metrics: DailyReportMetrics): string {
  const cny = (metrics.revenueCny / 100).toFixed(2)
  const usd = (metrics.revenueUsd / 100).toFixed(2)
  return `新增用户 ${metrics.newUsers} | DAU ${metrics.dau} | 新增收藏 ${metrics.newCollections} | 新增订阅 ${metrics.newSubscriptions} | 收入 ¥${cny} / $${usd} | 错误率 ${(metrics.errorRate24h * 100).toFixed(2)}%`
}

/**
 * 生成飞书卡片内容
 */
function buildFeishuContent(sections: ReportSection[], reportDate: string): string {
  const lines: string[] = []
  for (const section of sections) {
    lines.push(`**${section.title}**`)
    const itemTexts = section.items.map(item => `${item.label}：${item.value}`)
    lines.push(itemTexts.join('　|　'))
    lines.push('')
  }
  return lines.join('\n')
}

/**
 * 发送飞书运营日报
 */
async function sendFeishuReport(webhookUrl: string, sections: ReportSection[], reportDate: string) {
  if (!webhookUrl) return

  const content = buildFeishuContent(sections, reportDate)

  const body = {
    msg_type: 'interactive',
    card: {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: `📊 LinkChest 国内运营日报（${reportDate}）` },
        template: 'blue',
      },
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content },
        },
        {
          tag: 'note',
          elements: [
            { tag: 'plain_text', content: `生成时间：${new Date().toLocaleString('zh-CN')}` },
          ],
        },
      ],
    },
  }

  const res = await fetchWithTimeout(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs: 10000,
  })

  if (res instanceof Response && !res.ok) {
    throw new Error(`Feishu webhook failed: ${res.status}`)
  }
}

/**
 * 发送企业微信运营日报
 */
async function sendWeComReport(webhookUrl: string, sections: ReportSection[], reportDate: string) {
  if (!webhookUrl) return

  const lines: string[] = [`## 📊 LinkChest 国内运营日报（${reportDate}）`, '']
  for (const section of sections) {
    lines.push(`**${section.title}**`)
    for (const item of section.items) {
      lines.push(`>${item.label}：${item.value}`)
    }
    lines.push('')
  }
  lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`)

  const body = {
    msgtype: 'markdown',
    markdown: { content: lines.join('\n') },
  }

  const res = await fetchWithTimeout(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs: 10000,
  })

  if (res instanceof Response && !res.ok) {
    throw new Error(`WeCom webhook failed: ${res.status}`)
  }
}
