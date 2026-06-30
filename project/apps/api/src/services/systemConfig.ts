/**
 * 系统配置服务
 * 用于存储全局 Webhook、功能开关等运维配置
 * 键值对形式，value 为 Json 类型
 */
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { Prisma } from '@prisma/client'
import { fetchWithTimeout } from '../lib/fetchWithTimeout'

export interface WebhookConfig {
  feishu: string
  wecom: string
}

const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  feishu: process.env.FEISHU_WEBHOOK_URL || '',
  wecom: process.env.WECOM_WEBHOOK_URL || '',
}

const WEBHOOK_CONFIG_KEY = 'global_webhooks'

/**
 * 获取全局 Webhook 配置
 * 数据库未配置时，降级读取环境变量
 */
export async function getWebhookConfig(): Promise<WebhookConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: WEBHOOK_CONFIG_KEY },
    })

    if (config?.value) {
      const value = config.value as Partial<WebhookConfig>
      return {
        feishu: value.feishu || DEFAULT_WEBHOOK_CONFIG.feishu,
        wecom: value.wecom || DEFAULT_WEBHOOK_CONFIG.wecom,
      }
    }
  } catch (e) {
    logger.warn({ err: (e as Error).message }, 'getWebhookConfig failed, fallback to env')
  }

  return { ...DEFAULT_WEBHOOK_CONFIG }
}

/**
 * 更新全局 Webhook 配置
 */
export async function setWebhookConfig(config: Partial<WebhookConfig>): Promise<WebhookConfig> {
  const existing = await getWebhookConfig()
  const next: WebhookConfig = {
    feishu: config.feishu !== undefined ? config.feishu : existing.feishu,
    wecom: config.wecom !== undefined ? config.wecom : existing.wecom,
  }

  await prisma.systemConfig.upsert({
    where: { key: WEBHOOK_CONFIG_KEY },
    create: { key: WEBHOOK_CONFIG_KEY, value: next as unknown as Prisma.InputJsonValue },
    update: { value: next as unknown as Prisma.InputJsonValue },
  })

  return next
}

export interface WebhookTestResult {
  channel: 'feishu' | 'wecom'
  success: boolean
  message: string
}

/**
 * 向当前全局 Webhook 发送测试消息
 * 不修改数据库，仅使用传入的配置进行测试
 */
export async function sendWebhookTest(config: Partial<WebhookConfig>): Promise<WebhookTestResult[]> {
  const results: WebhookTestResult[] = []

  if (config.feishu) {
    try {
      await sendFeishuTest(config.feishu)
      results.push({ channel: 'feishu', success: true, message: '发送成功' })
    } catch (e) {
      results.push({ channel: 'feishu', success: false, message: (e as Error).message })
    }
  }

  if (config.wecom) {
    try {
      await sendWeComTest(config.wecom)
      results.push({ channel: 'wecom', success: true, message: '发送成功' })
    } catch (e) {
      results.push({ channel: 'wecom', success: false, message: (e as Error).message })
    }
  }

  return results
}

async function sendFeishuTest(webhookUrl: string) {
  const body = {
    msg_type: 'text',
    content: {
      text: '🔔 LinkChest Webhook 测试消息\n这是一条来自管理后台的测试消息，如果收到说明 Webhook 配置正确。',
    },
  }

  const res = await fetchWithTimeout(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs: 10000,
  })

  if (res instanceof Response && !res.ok) {
    throw new Error(`status ${res.status}`)
  }
}

async function sendWeComTest(webhookUrl: string) {
  const body = {
    msgtype: 'text',
    text: {
      content: '🔔 LinkChest Webhook 测试消息\n这是一条来自管理后台的测试消息，如果收到说明 Webhook 配置正确。',
    },
  }

  const res = await fetchWithTimeout(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs: 10000,
  })

  if (res instanceof Response && !res.ok) {
    throw new Error(`status ${res.status}`)
  }
}
