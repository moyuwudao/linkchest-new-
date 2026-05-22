/**
 * 告警引擎服务
 * - 15 分钟定时扫描
 * - 四级优先级（P0/P1/P2/P3）分级推送
 * - 多通道：邮件 + 飞书 + 企业微信 Webhook
 * - 冷却期防重复 + 静默时段
 */
import prisma from '../lib/prisma'
import { getRedisClient, isRedisAvailable } from '../lib/redis'
import logger from '../lib/logger'
import { sendAlertEmail } from './ses'

// ===== 配置 =====
const SCAN_INTERVAL_MS = 15 * 60 * 1000 // 15 分钟
const isEnabled = process.env.ALERTING_ENABLED !== 'false'

// 健康检查连续失败计数
let healthCheckFailures = 0
const HEALTH_CHECK_MAX_FAILURES = 3

// Webhook URL
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL || ''
const WECOM_WEBHOOK = process.env.WECOM_WEBHOOK_URL || ''
const ALERT_EMAILS = (process.env.ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)

// 优先级通道配置（默认行为）
const PRIORITY_CHANNELS: Record<string, { email: boolean; feishu: boolean; wecom: boolean }> = {
  P0: { email: true, feishu: true, wecom: true },   // 紧急：全通道
  P1: { email: true, feishu: true, wecom: false },  // 严重：邮件+飞书
  P2: { email: false, feishu: true, wecom: true },  // 一般：飞书+企微
  P3: { email: false, feishu: false, wecom: false }, // 提示：仅记录
}

let timer: ReturnType<typeof setInterval> | null = null

// ===== 初始化 =====

export function startAlertEngine() {
  if (!isEnabled) {
    logger.info('告警引擎已禁用（ALERTING_ENABLED=false）')
    return
  }

  logger.info(`🚨 告警引擎启动，扫描间隔 ${SCAN_INTERVAL_MS / 60000} 分钟`)

  // 立即执行一次
  runAlertCheck().catch((e: Error) => logger.error({ err: e.message }, 'initial alert check failed'))

  // 定时扫描
  timer = setInterval(() => {
    runAlertCheck().catch((e: Error) => logger.error({ err: e.message }, 'alert check failed'))
  }, SCAN_INTERVAL_MS)
}

export function stopAlertEngine() {
  if (timer) {
    clearInterval(timer)
    timer = null
    logger.info('告警引擎已停止')
  }
}

// ===== 告警规则评估 =====

async function runAlertCheck() {
  const now = new Date()
  logger.debug('🔍 执行告警规则检查')

  const rules = await prisma.alertRule.findMany({
    where: { enabled: true },
  })

  if (rules.length === 0) {
    logger.debug('无启用的告警规则')
    return
  }

  for (const rule of rules) {
    try {
      await evaluateRule(rule, now)
    } catch (e) {
      logger.warn({ ruleId: rule.id, err: (e as Error).message }, 'rule evaluation failed')
    }
  }
}

async function evaluateRule(
  rule: {
    id: string
    name: string
    type: string
    conditionConfig: unknown
    channels: unknown
    cooldownMinutes: number
    priority: string
    silentStart: string | null
    silentEnd: string | null
  },
  now: Date
) {
  const config = rule.conditionConfig as Record<string, number>
  const channels = rule.channels as Record<string, string[]>

  // 检查冷却期
  const inCooldown = await isInCooldown(rule.id, rule.cooldownMinutes)
  if (inCooldown) return

  // 检查静默时段
  if (isInSilentPeriod(rule.silentStart, rule.silentEnd, now)) {
    logger.debug({ ruleId: rule.id }, 'rule in silent period, skip')
    return
  }

  let triggered = false
  let message = ''
  let metricValue = 0

  switch (rule.type) {
    case 'error_rate': {
      const windowMin = config.window || 300
      const metrics = await getMetricsFromRedis(windowMin / 60)
      metricValue = metrics.errorRate
      triggered = metricValue > (config.threshold || 0.1)
      if (triggered) {
        message = `【${rule.name}】错误率 ${(metricValue * 100).toFixed(1)}% 超过阈值 ${(config.threshold * 100).toFixed(1)}%（最近 ${windowMin / 60} 分钟）`
      }
      break
    }
    case 'error_count': {
      const windowMin = config.window || 60
      const metrics = await getMetricsFromRedis(windowMin / 60)
      metricValue = metrics.totalErrors
      triggered = metricValue > (config.threshold || 10)
      if (triggered) {
        message = `【${rule.name}】错误数 ${metricValue} 超过阈值 ${config.threshold}（最近 ${windowMin / 60} 分钟）`
      }
      break
    }
    case 'response_time': {
      const windowMin = config.window || 300
      const metrics = await getMetricsFromRedis(windowMin / 60)
      metricValue = metrics.avgDuration
      triggered = metricValue > (config.threshold || 2000)
      if (triggered) {
        message = `【${rule.name}】平均响应时间 ${metricValue}ms 超过阈值 ${config.threshold}ms（最近 ${windowMin / 60} 分钟）`
      }
      break
    }
    case 'service_down': {
      const consecutive = config.consecutiveFailures || 3
      triggered = healthCheckFailures >= consecutive
      metricValue = healthCheckFailures
      if (triggered) {
        message = `【${rule.name}】服务健康检查连续失败 ${healthCheckFailures} 次（阈值 ${consecutive}）`
      }
      break
    }
  }

  if (!triggered) return

  logger.warn({ ruleId: rule.id, priority: rule.priority, message }, 'alert triggered')

  // 根据优先级确定推送通道
  const priorityConfig = PRIORITY_CHANNELS[rule.priority] || PRIORITY_CHANNELS.P1
  const actualChannels: string[] = []

  // 邮件
  if (priorityConfig.email) {
    const emails = channels.email?.length ? channels.email : ALERT_EMAILS
    if (emails.length > 0) {
      try {
        await sendAlertEmail(emails, rule.name, message, rule.priority)
        actualChannels.push('email')
      } catch (e) {
        logger.warn({ err: (e as Error).message }, 'alert email failed')
      }
    }
  }

  // 飞书
  if (priorityConfig.feishu) {
    const hookUrl = channels.feishu?.[0] || FEISHU_WEBHOOK
    if (hookUrl) {
      try {
        await sendFeishuAlert(hookUrl, rule.name, message, rule.priority)
        actualChannels.push('feishu')
      } catch (e) {
        logger.warn({ err: (e as Error).message }, 'feishu alert failed')
      }
    }
  }

  // 企业微信
  if (priorityConfig.wecom) {
    const hookUrl = channels.wecom?.[0] || WECOM_WEBHOOK
    if (hookUrl) {
      try {
        await sendWeComAlert(hookUrl, rule.name, message, rule.priority)
        actualChannels.push('wecom')
      } catch (e) {
        logger.warn({ err: (e as Error).message }, 'wecom alert failed')
      }
    }
  }

  // 记录告警历史
  await prisma.alertHistory.create({
    data: {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      message,
      channelsSent: { sent: actualChannels, metricValue },
    },
  })

  // 更新冷却期
  await setCooldown(rule.id, rule.cooldownMinutes)
}

// ===== Redis 指标查询（复用 metrics.ts 逻辑，避免循环依赖） =====

async function getMetricsFromRedis(windowMinutes: number) {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) {
    return { totalRequests: 0, totalErrors: 0, avgDuration: 0, errorRate: 0 }
  }

  const keys: string[] = []
  const now = new Date()

  for (let i = 0; i < windowMinutes; i++) {
    const t = new Date(now.getTime() - i * 60 * 1000)
    const minute = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}`
    keys.push(minute)
  }

  const pipeline = redis.pipeline()
  keys.forEach(m => {
    pipeline.get(`lc:metrics:req:${m}`)
    pipeline.get(`lc:metrics:err:${m}`)
    pipeline.get(`lc:metrics:duration:${m}`)
  })

  const results = await pipeline.exec()
  if (!results) {
    return { totalRequests: 0, totalErrors: 0, avgDuration: 0, errorRate: 0 }
  }

  let totalRequests = 0
  let totalErrors = 0
  let totalDuration = 0

  for (let i = 0; i < keys.length; i++) {
    const base = i * 3
    totalRequests += parseInt(String(results[base]?.[1]), 10) || 0
    totalErrors += parseInt(String(results[base + 1]?.[1]), 10) || 0
    totalDuration += parseInt(String(results[base + 2]?.[1]), 10) || 0
  }

  const avgDuration = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0
  const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0

  return { totalRequests, totalErrors, avgDuration, errorRate }
}

// ===== 冷却期管理 =====

async function isInCooldown(ruleId: string, cooldownMinutes: number): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return false

  const key = `alert:cooldown:${ruleId}`
  const exists = await redis.exists(key)
  return exists === 1
}

async function setCooldown(ruleId: string, cooldownMinutes: number) {
  const redis = getRedisClient()
  if (!redis || !isRedisAvailable()) return

  const key = `alert:cooldown:${ruleId}`
  await redis.setex(key, cooldownMinutes * 60, '1')
}

// ===== 静默时段检查 =====

function isInSilentPeriod(start: string | null, end: string | null, now: Date): boolean {
  if (!start || !end) return false

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  }
  // 跨天的情况（如 23:00 - 07:00）
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes
}

// ===== Webhook 推送 =====

async function sendFeishuAlert(webhookUrl: string, ruleName: string, message: string, priority: string) {
  const colorMap: Record<string, string> = {
    P0: 'red',
    P1: 'orange',
    P2: 'yellow',
    P3: 'blue',
  }

  const body = {
    msg_type: 'interactive',
    card: {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: `🚨 LinkChest 告警 [${priority}]` },
        template: colorMap[priority] || 'blue',
      },
      elements: [
        {
          tag: 'div',
          text: { tag: 'lark_md', content: `**规则：** ${ruleName}\n**详情：** ${message}\n**时间：** ${new Date().toLocaleString('zh-CN')}` },
        },
      ],
    },
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Feishu webhook failed: ${res.status}`)
  }
}

async function sendWeComAlert(webhookUrl: string, ruleName: string, message: string, priority: string) {
  const colorMap: Record<string, string> = {
    P0: 'warning',
    P1: 'warning',
    P2: 'comment',
    P3: 'info',
  }

  const body = {
    msgtype: 'markdown',
    markdown: {
      content: `## 🚨 LinkChest 告警 [${priority}]\n>**规则：** ${ruleName}\n>**详情：** ${message}\n>**时间：** ${new Date().toLocaleString('zh-CN')}`,
    },
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`WeCom webhook failed: ${res.status}`)
  }
}

// ===== 健康检查失败计数（由外部调用） =====

export function recordHealthCheckFailure() {
  healthCheckFailures++
  logger.warn({ consecutive: healthCheckFailures }, 'health check failed')
}

export function recordHealthCheckSuccess() {
  if (healthCheckFailures > 0) {
    logger.info({ wasConsecutive: healthCheckFailures }, 'health check recovered')
    healthCheckFailures = 0
  }
}
