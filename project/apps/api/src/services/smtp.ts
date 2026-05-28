import nodemailer from 'nodemailer'
import logger from '../lib/logger'

// SMTP 配置
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || 'support@linkchest.cn'
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || '链藏'

// 启动时检查 SMTP 配置
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  logger.warn('[SMTP] SMTP 配置不完整，邮件发送将失败')
}

// 创建 SMTP 传输器
const transporter = nodemailer.createTransporter({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // 465 使用 SSL，587 使用 STARTTLS
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // 开发环境允许自签名证书
  },
})

// 验证连接
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      logger.error({ err: error.message }, '[SMTP] 连接验证失败')
    } else {
      logger.info('[SMTP] 服务器连接成功')
    }
  })
}

export interface SendEmailParams {
  /** 收件人邮箱 */
  to: string
  /** 邮件主题 */
  subject: string
  /** 邮件内容（HTML） */
  html: string
  /** 纯文本内容（可选） */
  text?: string
  /** 发件人别名 */
  fromAlias?: string
}