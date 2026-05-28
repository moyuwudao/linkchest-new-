import * as tencentcloud from "tencentcloud-sdk-nodejs"
import { ClientConfig } from "tencentcloud-sdk-nodejs/tencentcloud/common/interface"
import logger from '../lib/logger'

const SesClient = tencentcloud.ses.v20201002.Client

// 延迟初始化 SES 客户端，确保 dotenv 已加载
let client: ReturnType<typeof createClient> | null = null

function createClient() {
  const clientConfig: ClientConfig = {
    credential: {
      secretId: process.env.TENCENTCLOUD_SECRET_ID || "",
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY || "",
    },
    region: process.env.SES_REGION || "ap-guangzhou",
    profile: {
      signMethod: "TC3-HMAC-SHA256",
      httpProfile: {
        reqMethod: "POST",
        reqTimeout: 30,
      },
    },
  }
  return new SesClient(clientConfig)
}

function getClient() {
  if (!client) {
    client = createClient()
  }
  return client
}

// 获取当前市场配置
function getMarket(): string {
  return process.env.MARKET || 'global'
}

// 根据市场返回对应的发件邮箱
function getFromEmail(): string {
  const market = getMarket()
  if (market === 'china') {
    return process.env.SES_FROM_EMAIL_CN || process.env.SES_FROM_EMAIL || 'noreply@linkchest.cn'
  }
  return process.env.SES_FROM_EMAIL_GLOBAL || process.env.SES_FROM_EMAIL || 'noreply@linkchest.net'
}

// 根据市场返回对应的验证码模板ID
function getVerificationTemplateId(): number {
  const market = getMarket()
  if (market === 'china') {
    const templateId = process.env.SES_VERIFY_TEMPLATE_ID_CN || process.env.SES_VERIFY_TEMPLATE_ID
    return templateId ? parseInt(templateId, 10) : 49526
  }
  const templateId = process.env.SES_VERIFY_TEMPLATE_ID_GLOBAL || process.env.SES_VERIFY_TEMPLATE_ID
  return templateId ? parseInt(templateId, 10) : 175148
}

// 启动时检查 SES 配置（延迟到首次调用时检查）
let configChecked = false
function checkConfig() {
  if (configChecked) return
  configChecked = true
  
  const SES_FROM_EMAIL = getFromEmail()
  if (!SES_FROM_EMAIL) {
    logger.warn('[SES] SES_FROM_EMAIL 环境变量未配置，邮件发送将失败')
  }
  if (!process.env.TENCENTCLOUD_SECRET_ID || !process.env.TENCENTCLOUD_SECRET_KEY) {
    logger.warn('[SES] 腾讯云 SecretId/SecretKey 环境变量未配置，邮件发送将失败')
  }
  
  logger.info({ market: getMarket(), fromEmail: SES_FROM_EMAIL, templateId: getVerificationTemplateId() }, '[SES] 邮箱配置已加载')
}

export interface SendTemplateEmailParams {
  /** 收件人邮箱列表（单次最多50人） */
  to: string[]
  /** 邮件主题 */
  subject: string
  /** 控制台创建的模板 ID */
  templateId: number
  /** 模板变量数据，如 { code: "1234", username: "张三" } */
  templateData: Record<string, string>
  /** 发件人别名（可选） */
  fromAlias?: string
  /** 回复地址（可选） */
  replyTo?: string
  /** 抄送人（可选，最多20人） */
  cc?: string[]
  /** 密送人（可选，最多20人） */
  bcc?: string[]
  /** 触发类型：0=非触发类（营销），1=触发类（验证码等即时邮件） */
  triggerType?: 0 | 1
}

/**
 * 使用模板发送邮件（SES API 方式）
 * 注意：个人认证用户仅支持 API 发信，不支持 SMTP
 */
export async function sendTemplateEmail(params: SendTemplateEmailParams) {
  checkConfig()
  
  const fromEmail = getFromEmail()
  if (!fromEmail) {
    throw new Error("SES_FROM_EMAIL 环境变量未配置")
  }
  if (!process.env.TENCENTCLOUD_SECRET_ID || !process.env.TENCENTCLOUD_SECRET_KEY) {
    throw new Error("腾讯云 SecretId/SecretKey 环境变量未配置")
  }

  const fromAddress = params.fromAlias
    ? `${params.fromAlias} <${fromEmail}>`
    : fromEmail

  const req = {
    FromEmailAddress: fromAddress,
    Subject: params.subject,
    Destination: params.to,
    Cc: params.cc,
    Bcc: params.bcc,
    ReplyToAddresses: params.replyTo,
    Template: {
      TemplateID: params.templateId,
      TemplateData: JSON.stringify(params.templateData),
    },
    TriggerType: params.triggerType ?? 1,
  }

  try {
    const res = await getClient().SendEmail(req)
    logger.info({ messageId: res.MessageId, to: params.to.join(', ') }, '[SES] 邮件发送成功')
    return {
      success: true,
      messageId: res.MessageId,
      requestId: res.RequestId,
    }
  } catch (error) {
    const sesErr = error as { message?: string; code?: string; requestId?: string }
    logger.error({
      err: sesErr.message,
      sesCode: sesErr.code,
      sesRequestId: sesErr.requestId,
      to: params.to.join(', '),
      templateId: params.templateId,
    }, '[SES] 邮件发送失败')
    throw error
  }
}

/**
 * 发送验证码邮件（快捷方法）
 * 根据 MARKET 环境变量自动选择对应市场的模板
 */
export async function sendVerificationCode(
  to: string,
  code: string,
  templateId?: number,
  expireMinutes = 5
) {
  // 如果未指定模板ID，根据市场自动选择
  const effectiveTemplateId = templateId ?? getVerificationTemplateId()
  
  // 根据市场选择发件人别名
  const market = getMarket()
  const fromAlias = market === 'china' ? '链藏' : 'LinkChest'
  
  return sendTemplateEmail({
    to: [to],
    subject: market === 'china' ? "【链藏】验证码" : "[LinkChest] Verification Code",
    templateId: effectiveTemplateId,
    templateData: {
      code,
      expire: String(expireMinutes),
    },
    fromAlias,
    triggerType: 1,
  })
}

/**
 * 发送 HTML 邮件（无需模板）
 */
export async function sendHtmlEmail(
  to: string[],
  subject: string,
  htmlBody: string,
  options?: { fromAlias?: string; replyTo?: string; cc?: string[]; bcc?: string[]; triggerType?: 0 | 1 }
) {
  checkConfig()
  
  const fromEmail = getFromEmail()
  if (!fromEmail) {
    throw new Error("SES_FROM_EMAIL 环境变量未配置")
  }
  if (!process.env.TENCENTCLOUD_SECRET_ID || !process.env.TENCENTCLOUD_SECRET_KEY) {
    throw new Error("腾讯云 SecretId/SecretKey 环境变量未配置")
  }

  const fromAddress = options?.fromAlias
    ? `${options.fromAlias} <${fromEmail}>`
    : fromEmail

  const textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const req = {
    FromEmailAddress: fromAddress,
    Subject: subject,
    Destination: to,
    Cc: options?.cc,
    Bcc: options?.bcc,
    ReplyToAddresses: options?.replyTo,
    Simple: {
      Html: htmlBody,
      Text: textBody,
    },
    TriggerType: options?.triggerType ?? 1,
  }

  try {
    const res = await getClient().SendEmail(req)
    logger.info({ messageId: res.MessageId, to: to.join(', ') }, '[SES] HTML 邮件发送成功')
    return {
      success: true,
      messageId: res.MessageId,
      requestId: res.RequestId,
    }
  } catch (error) {
    const sesErr = error as { message?: string; code?: string; requestId?: string }
    logger.error({
      err: sesErr.message,
      sesCode: sesErr.code,
      sesRequestId: sesErr.requestId,
      to: to.join(', '),
    }, '[SES] HTML 邮件发送失败')
    throw error
  }
}

/**
 * 发送告警邮件
 * 使用纯文本/HTML 方式（无需模板 ID）
 */
export async function sendAlertEmail(
  to: string[],
  ruleName: string,
  message: string,
  priority: string
) {
  checkConfig()
  
  const fromEmail = getFromEmail()
  if (!fromEmail) {
    throw new Error("SES_FROM_EMAIL 环境变量未配置")
  }

  const priorityLabels: Record<string, string> = {
    P0: '紧急',
    P1: '严重',
    P2: '一般',
    P3: '提示',
  }

  const subject = `🚨 [${priorityLabels[priority] || priority}] LinkChest 告警 - ${ruleName}`

  const htmlBody = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #1a1a2e; color: #fff; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">🚨 LinkChest 运维告警</h2>
      </div>
      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p><strong>优先级：</strong><span style="color: ${priority === 'P0' ? '#dc2626' : priority === 'P1' ? '#ea580c' : '#ca8a04'};">${priority} ${priorityLabels[priority] || ''}</span></p>
        <p><strong>规则：</strong>${ruleName}</p>
        <p><strong>详情：</strong>${message}</p>
        <p><strong>时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">此邮件由 LinkChest 自动告警系统发送，请勿回复。</p>
      </div>
    </div>
  `

  const textBody = `[${priority}] ${ruleName}\n${message}\n时间: ${new Date().toLocaleString('zh-CN')}`

  const req = {
    FromEmailAddress: `LinkChest <${fromEmail}>`,
    Subject: subject,
    Destination: to,
    Simple: {
      Html: Buffer.from(htmlBody).toString('base64'),
      Text: Buffer.from(textBody).toString('base64'),
    },
    TriggerType: 1 as const,
  }

  try {
    const res = await getClient().SendEmail(req)
    logger.info({ messageId: res.MessageId, to: to.join(', ') }, '[SES] 告警邮件发送成功')
    return {
      success: true,
      messageId: res.MessageId,
      requestId: res.RequestId,
    }
  } catch (error) {
    const sesErr = error as { message?: string; code?: string; requestId?: string }
    logger.error({
      err: sesErr.message,
      sesCode: sesErr.code,
      sesRequestId: sesErr.requestId,
      to: to.join(', '),
    }, '[SES] 告警邮件发送失败')
    throw error
  }
}
