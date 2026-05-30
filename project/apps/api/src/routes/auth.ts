import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { OAuth2Client } from 'google-auth-library'
import prisma from '../lib/prisma'
import { getRedisClient } from '../lib/redis'
import { JWT_SECRET, GOOGLE_CLIENT_ID } from '../lib/config'
import { DEFAULT_LIST_KEY, DEFAULT_LIST_DESC } from '../lib/config'
import {
  IP_RATE_LIMIT_MAX,
  IP_RATE_LIMIT_WINDOW_MS,
  VERIFY_CODE_TTL_SECONDS,
  VERIFY_CODE_MAX_ATTEMPTS,
  VERIFY_CODE_SEND_COOLDOWN_MS,
  VERIFY_CODE_LENGTH,
  MAX_LOGIN_ATTEMPTS,
  ACCOUNT_LOCK_DURATION_MINUTES,
} from '../lib/constants'
import { AuthErrorCodes, AuthErrorCode, errorResponse } from '../lib/errorCodes'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { sendTemplateEmail } from '../services/ses'
import { recordUserRegistered } from '../services/prom-metrics'
import { useReferralCode } from './referrals'
import logger from '../lib/logger'

const router = Router()

// 默认标签（双语）
const DEFAULT_TAGS = [
  { nameCn: '学习', nameEn: 'Study' },
  { nameCn: '记录', nameEn: 'Record' },
  { nameCn: '分享', nameEn: 'Share' },
  { nameCn: '待办', nameEn: 'Todo' },
  { nameCn: '娱乐', nameEn: 'Entertainment' },
  { nameCn: '工作', nameEn: 'Work' },
]

// 创建用户默认标签
async function createDefaultTags(userId: string, lang: string) {
  const tagsToCreate = DEFAULT_TAGS.map((tag, index) => ({
    userId,
    nameCn: tag.nameCn,
    nameEn: tag.nameEn,
    name: lang === 'en' ? tag.nameEn : tag.nameCn, // 显示名称根据语言
    sortOrder: index,
  }))

  await prisma.tag.createMany({
    data: tagsToCreate,
  })
}

// ===== 验证码安全机制 =====
// 验证码存储在 Redis 中，支持多实例水平扩展
// Redis 不可用时自动降级到进程内存（单实例场景兼容）
interface VerificationEntry {
  code: string
  expiresAt: number
  attempts: number
}

// 内存降级存储（Redis 不可用时使用）
const verificationCodesFallback = new Map<string, VerificationEntry>()
const sendCodeRateLimitFallback = new Map<string, number>()
const ipRateLimitFallback = new Map<string, { count: number; resetAt: number }>()

// 生成随机验证码
function generateCode(): string {
  const min = 10 ** (VERIFY_CODE_LENGTH - 1)
  const max = 9 * min
  return Math.floor(min + Math.random() * max).toString()
}

// 每5分钟清理内存降级存储中的过期记录
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of verificationCodesFallback) {
    if (now > entry.expiresAt) verificationCodesFallback.delete(key)
  }
  for (const [key, timestamp] of sendCodeRateLimitFallback) {
    if (now - timestamp > 60000) sendCodeRateLimitFallback.delete(key)
  }
  for (const [ip, entry] of ipRateLimitFallback) {
    if (now > entry.resetAt) ipRateLimitFallback.delete(ip)
  }
}, 5 * 60 * 1000)

// 保存验证码到 Redis（生产环境强制要求 Redis，拒绝内存降级）
async function saveVerificationCode(key: string, code: string): Promise<void> {
  const redis = getRedisClient()
  if (redis) {
    await redis.setex(`lc:verify:${key}`, VERIFY_CODE_TTL_SECONDS, JSON.stringify({ code, attempts: 0 }))
    return
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Redis unavailable: verification code storage requires Redis in production')
  }
  verificationCodesFallback.set(key, { code, expiresAt: Date.now() + VERIFY_CODE_TTL_SECONDS * 1000, attempts: 0 })
}

// 验证验证码（Redis 优先，降级到内存）
async function verifyCode(key: string, code: string): Promise<{ valid: boolean; errorCode?: AuthErrorCode }> {
  const redis = getRedisClient()

  if (redis) {
    const raw = await redis.get(`lc:verify:${key}`)
    if (!raw) {
      return { valid: false, errorCode: AuthErrorCodes.VERIFICATION_EXPIRED }
    }

    const data = JSON.parse(raw) as { code: string; attempts: number }

    if (data.attempts >= VERIFY_CODE_MAX_ATTEMPTS) {
      await redis.del(`lc:verify:${key}`)
      return { valid: false, errorCode: AuthErrorCodes.VERIFICATION_ATTEMPTS_EXCEEDED }
    }

    // 递增尝试次数，保持剩余 TTL
    const ttl = await redis.ttl(`lc:verify:${key}`)
    await redis.setex(`lc:verify:${key}`, Math.max(ttl, 1), JSON.stringify({ code: data.code, attempts: data.attempts + 1 }))

    if (data.code !== code) {
      return { valid: false, errorCode: AuthErrorCodes.VERIFICATION_INVALID }
    }

    await redis.del(`lc:verify:${key}`)
    return { valid: true }
  }

  // 生产环境拒绝内存降级（SEC-03）
  if (process.env.NODE_ENV === 'production') {
    return { valid: false, errorCode: AuthErrorCodes.SERVER_ERROR }
  }

  // 内存降级（仅开发/测试环境）
  const entry = verificationCodesFallback.get(key)
  if (!entry) {
    return { valid: false, errorCode: AuthErrorCodes.VERIFICATION_EXPIRED }
  }
  if (Date.now() > entry.expiresAt) {
    verificationCodesFallback.delete(key)
    return { valid: false, errorCode: AuthErrorCodes.VERIFICATION_EXPIRED }
  }
  if (entry.attempts >= VERIFY_CODE_MAX_ATTEMPTS) {
    verificationCodesFallback.delete(key)
    return { valid: false, errorCode: AuthErrorCodes.VERIFICATION_ATTEMPTS_EXCEEDED }
  }
  entry.attempts++
  if (entry.code !== code) {
    return { valid: false, errorCode: AuthErrorCodes.VERIFICATION_INVALID }
  }
  verificationCodesFallback.delete(key)
  return { valid: true }
}

// IP 级别防刷检查
async function checkIpRateLimit(clientIp: string): Promise<{ allowed: boolean; count: number }> {
  const redis = getRedisClient()
  const now = Date.now()

  if (redis) {
    const key = `lc:verify:ip:${clientIp}`
    const raw = await redis.get(key)
    if (raw) {
      const data = JSON.parse(raw) as { count: number; resetAt: number }
      if (now < data.resetAt) {
        if (data.count >= IP_RATE_LIMIT_MAX) {
          return { allowed: false, count: data.count }
        }
        data.count++
        const ttl = Math.ceil((data.resetAt - now) / 1000)
        await redis.setex(key, Math.max(ttl, 1), JSON.stringify(data))
        return { allowed: true, count: data.count }
      }
    }
    const resetAt = now + IP_RATE_LIMIT_WINDOW_MS
    await redis.setex(key, IP_RATE_LIMIT_WINDOW_MS / 1000, JSON.stringify({ count: 1, resetAt }))
    return { allowed: true, count: 1 }
  }

  // 生产环境拒绝内存降级（SEC-03）
  if (process.env.NODE_ENV === 'production') {
    return { allowed: false, count: IP_RATE_LIMIT_MAX }
  }

  // 内存降级（仅开发/测试环境）
  const entry = ipRateLimitFallback.get(clientIp)
  if (entry && now < entry.resetAt) {
    if (entry.count >= IP_RATE_LIMIT_MAX) {
      return { allowed: false, count: entry.count }
    }
    entry.count++
    return { allowed: true, count: entry.count }
  }
  ipRateLimitFallback.set(clientIp, { count: 1, resetAt: now + IP_RATE_LIMIT_WINDOW_MS })
  return { allowed: true, count: 1 }
}

// 发送频率限制检查
async function checkSendRateLimit(key: string): Promise<boolean> {
  const redis = getRedisClient()

  if (redis) {
    const rateLimitKey = `lc:verify:ratelimit:${key}`
    const lastSent = await redis.get(rateLimitKey)
    if (lastSent && Date.now() - parseInt(lastSent, 10) < VERIFY_CODE_SEND_COOLDOWN_MS) {
      return false
    }
    await redis.setex(rateLimitKey, VERIFY_CODE_SEND_COOLDOWN_MS / 1000, String(Date.now()))
    return true
  }

  // 生产环境拒绝内存降级（SEC-03）
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  // 内存降级（仅开发/测试环境）
  const lastSent = sendCodeRateLimitFallback.get(key)
  if (lastSent && Date.now() - lastSent < VERIFY_CODE_SEND_COOLDOWN_MS) {
    return false
  }
  sendCodeRateLimitFallback.set(key, Date.now())
  return true
}

// 违禁词
const BANNED_WORDS = [
  'admin', 'administrator', 'root', 'system', 'test',
  'fuck', 'shit', 'damn', 'ass',
  '管理员', '系统', '测试', '官方',
  '色情', '赌博', '毒品', '暴力',
]

function containsBannedWord(text: string): boolean {
  const lower = text.toLowerCase()
  return BANNED_WORDS.some(word => lower.includes(word.toLowerCase()))
}

// 发送验证码（仅支持邮箱）
router.post('/send-code', async (req, res) => {
  const reqId = req.reqId
  try {
    const { email, lang = 'zh' } = req.body

    if (!email) {
      return errorResponse(res, 400, AuthErrorCodes.INVALID_EMAIL_FORMAT)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse(res, 400, AuthErrorCodes.INVALID_EMAIL_FORMAT)
    }

    // 检查已登录用户是否已维护邮箱
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
        if (user && !user.email) {
          return errorResponse(res, 400, AuthErrorCodes.EMAIL_NOT_SET)
        }
      } catch {
        // token 无效，忽略
      }
    }

    const key = `email:${email}`

    // 生产环境脱敏邮箱地址
    const maskEmail = (email: string) => {
      if (process.env.NODE_ENV === 'production') {
        const [local, domain] = email.split('@')
        return `${local.charAt(0)}***@${domain}`
      }
      return email
    }

    logger.info({ reqId, email: maskEmail(email), lang }, '发送验证码请求')

    // IP 级别防刷：限制每 IP 每小时最多发送次数
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown'
    const ipCheck = await checkIpRateLimit(clientIp)
    if (!ipCheck.allowed) {
      logger.warn({ reqId, ip: clientIp, count: ipCheck.count }, 'IP 防刷触发')
      return errorResponse(res, 429, AuthErrorCodes.VERIFICATION_SEND_TOO_FREQUENT)
    }

    // 60秒频率限制（同一邮箱）
    const rateLimitOk = await checkSendRateLimit(key)
    if (!rateLimitOk) {
      return errorResponse(res, 429, AuthErrorCodes.VERIFICATION_SEND_TOO_FREQUENT)
    }

    // 生成随机验证码
    const code = generateCode()

    // 保存到 Redis（10分钟有效，带内存降级）
    await saveVerificationCode(key, code)

    // 不再自动创建用户，仅发送验证码
    // 如果用户已存在，更新语言偏好
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lang }
      })
    }

    // 发送验证码（仅邮箱）
    try {
      const templateId = parseInt(process.env.SES_VERIFY_TEMPLATE_ID || '0', 10)
      if (!templateId) {
        logger.warn({ reqId }, '[SES] SES_VERIFY_TEMPLATE_ID 未配置，跳过邮件发送')
      } else {
        await sendTemplateEmail({
          to: [email],
          subject: lang === 'en' ? 'Verification Code' : '验证码',
          templateId,
          templateData: { code, expire: '10' },
          fromAlias: 'LinkChest',
          triggerType: 1,
        })
        logger.info({ reqId, email: maskEmail(email) }, '[SES] 验证码邮件已发送')
      }
    } catch (err: unknown) {
      const sesErr = err as { message?: string; code?: string; requestId?: string }
      logger.error({
        reqId,
        email: maskEmail(email),
        err: sesErr.message,
        sesCode: sesErr.code,
        sesRequestId: sesErr.requestId,
      }, '[SES] 邮件发送失败')
      // 将实际错误消息传递给 requestTracker 用于持久化
      res.locals.errorMessage = `SES邮件发送失败: ${sesErr.message}`
      return errorResponse(res, 500, AuthErrorCodes.EMAIL_SEND_FAILED)
    }

    const responseData: { message: string; code?: string } = { message: 'verificationCodeSent' }
    if (process.env.NODE_ENV !== 'production') {
      responseData.code = code // 仅开发环境返回验证码
    }
    res.json(responseData)
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ reqId, err: err.message }, '发送验证码错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 邮箱+密码登录
router.post('/login-email', [
  body('email').isEmail().withMessage('ERR_INVALID_EMAIL_FORMAT'),
  body('password').notEmpty().withMessage('ERR_INVALID_PASSWORD_FORMAT'),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0]
      return errorResponse(res, 400, firstError.msg === 'ERR_INVALID_EMAIL_FORMAT'
        ? AuthErrorCodes.INVALID_EMAIL_FORMAT
        : AuthErrorCodes.INVALID_PASSWORD_FORMAT)
    }

    const { email, password, lang = 'zh' } = req.body

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return errorResponse(res, 401, AuthErrorCodes.ACCOUNT_NOT_FOUND)
    }

    // 检查用户状态
    if (user.status === 'banned') {
      return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_BANNED)
    }
    if (user.status === 'suspended') {
      return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_SUSPENDED)
    }
    // 检查账号是否被锁定
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_LOCKED)
    }

    if (!user.passwordHash) {
      if (user.authSource === 'google' || user.googleId) {
        return errorResponse(res, 401, AuthErrorCodes.ACCOUNT_GOOGLE_NO_PASSWORD)
      }
      return errorResponse(res, 401, AuthErrorCodes.ACCOUNT_NOT_SET_PASSWORD)
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      // 增加失败次数
      const newAttempts = (user.loginAttempts || 0) + 1
      const updateData: { loginAttempts: number; lockedUntil?: Date } = { loginAttempts: newAttempts }
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000)
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData })
      return errorResponse(res, 401, AuthErrorCodes.PASSWORD_INCORRECT)
    }

    // 获取客户端 IP
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || undefined

    // 登录成功：重置失败次数，记录登录时间和IP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: clientIp,
        loginAttempts: 0,
        lockedUntil: null,
        lang,
      }
    })

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        hasPassword: !!user.passwordHash,
        authSource: user.authSource,
        googleId: user.googleId,
        userTier: user.userTier,
      }
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '邮箱登录错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 邮箱+密码注册
router.post('/register-email', [
  body('email').isEmail().withMessage('ERR_INVALID_EMAIL_FORMAT'),
  body('password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/).withMessage('ERR_INVALID_PASSWORD_FORMAT'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('ERR_INVALID_VERIFICATION_CODE'),
], async (req, res) => {
  const reqId = req.reqId
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0]
      let errorCode: AuthErrorCode = AuthErrorCodes.UNKNOWN_ERROR
      switch (firstError.msg) {
        case 'ERR_INVALID_EMAIL_FORMAT': errorCode = AuthErrorCodes.INVALID_EMAIL_FORMAT; break
        case 'ERR_INVALID_PASSWORD_FORMAT': errorCode = AuthErrorCodes.INVALID_PASSWORD_FORMAT; break
      }
      return errorResponse(res, 400, errorCode)
    }

    const { email, password, code, lang = 'zh', referralCode } = req.body

    // 验证验证码
    // 邮箱注册使用 email 作为 key
    const emailKey = `email:${email}`
    const verifyResult = await verifyCode(emailKey, code)
    if (!verifyResult.valid) {
      return errorResponse(res, 400, verifyResult.errorCode!)
    }

    // 检查邮箱是否已被使用
    const existing = await prisma.user.findUnique({
      where: { email }
    })
    if (existing) {
      return errorResponse(res, 400, AuthErrorCodes.EMAIL_ALREADY_REGISTERED)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname: email.split('@')[0],
        lang,
      }
    })

    // 创建默认分组
    await prisma.list.create({
      data: {
        userId: user.id,
        name: DEFAULT_LIST_KEY,
        description: DEFAULT_LIST_DESC,
      }
    })

    // 创建默认标签
    await createDefaultTags(user.id, lang)

    recordUserRegistered('email')

    // 处理邀请码
    if (referralCode && typeof referralCode === 'string') {
      try {
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
          || req.socket.remoteAddress
          || 'unknown'
        const userAgent = req.headers['user-agent'] || undefined
        const result = await useReferralCode(referralCode, user.id, clientIp, userAgent)
        if (result.success) {
          logger.info({ reqId, userId: user.id, code: referralCode.toUpperCase() }, '邀请码注册成功，邀请关系已绑定')
        } else {
          logger.warn({ reqId, userId: user.id, code: referralCode.toUpperCase(), errorCode: result.errorCode }, '邀请码使用失败')
        }
      } catch (refErr) {
        logger.warn({ reqId, referralCode, err: (refErr as Error).message }, '邀请码处理失败')
      }
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        hasPassword: !!user.passwordHash,
        authSource: user.authSource,
        googleId: user.googleId,
        userTier: user.userTier,
      }
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '邮箱注册错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 获取当前用户信息
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return errorResponse(res, 404, AuthErrorCodes.USER_NOT_FOUND)
    }

    // 检查 avatar 签名 URL 是否即将过期，如果过期则刷新
    let avatarUrl = user.avatar
    if (avatarUrl && (avatarUrl.includes('myqcloud.com') || avatarUrl.includes('cos.'))) {
      // COS 签名 URL 包含签名参数，检查是否即将过期（5分钟内）
      try {
        const urlObj = new URL(avatarUrl)
        const signTime = parseInt(urlObj.searchParams.get('q-sign-time')?.split(';')[0] || '0', 10)
        if (signTime > 0) {
          const expiryTime = signTime + 7 * 24 * 3600 // 签名有效期 7 天
          const now = Math.floor(Date.now() / 1000)
          if (now > expiryTime - 300) { // 5分钟内过期
            // 刷新头像 URL
            const { getAvatarUrl } = await import('../services/cover')
            const refreshedUrl = await getAvatarUrl(userId)
            if (refreshedUrl) avatarUrl = refreshedUrl
          }
        }
      } catch {
        // URL 解析失败，不影响返回
      }
    }

    // 判断是否需要邮箱补充提醒
    const needsEmailSetup = !user.email && !user.passwordHash

    res.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      avatar: avatarUrl,
      hasPassword: !!user.passwordHash,
      authSource: user.authSource,
      googleId: user.googleId,
      appleId: user.appleId,
      wechatOpenId: user.wechatOpenId,
      userTier: user.userTier,
      createdAt: user.createdAt,
      needsEmailSetup,
    })
  } catch (error) {
    return errorResponse(res, 401, AuthErrorCodes.TOKEN_INVALID)
  }
})

// 更新用户信息
router.patch('/profile', authenticate, [
  body('nickname').optional().isLength({ min: 1, max: 20 }).withMessage('ERR_USERNAME_INVALID_FORMAT'),
  body('username').optional().isLength({ min: 2, max: 20 }).withMessage('ERR_USERNAME_INVALID_FORMAT')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/).withMessage('ERR_USERNAME_INVALID_FORMAT'),
  body('email').optional().isEmail().withMessage('ERR_INVALID_EMAIL_FORMAT'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0]
    return errorResponse(res, 400, AuthErrorCodes.USERNAME_INVALID_FORMAT)
  }

  const userId = req.user.id
    const { nickname, avatar, username, email, code } = req.body

  try {
    const currentUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!currentUser) {
      return errorResponse(res, 404, AuthErrorCodes.USER_NOT_FOUND)
    }

    // 用户名违禁词检查
    if (username && containsBannedWord(username)) {
      return errorResponse(res, 400, AuthErrorCodes.USERNAME_CONTAINS_BANNED_WORDS)
    }

    // 检查用户名唯一性
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: { username, id: { not: userId } }
      })
      if (existingUsername) {
        return errorResponse(res, 400, AuthErrorCodes.USERNAME_ALREADY_EXISTS)
      }
    }

    // 邮箱变更需要验证码
    if (email !== undefined && email !== currentUser.email) {
      if (!code) {
        return errorResponse(res, 400, AuthErrorCodes.VERIFICATION_INVALID)
      }
      const emailKey = `email:${email.trim()}`
      const verifyResult = await verifyCode(emailKey, code)
      if (!verifyResult.valid) {
        return errorResponse(res, 400, verifyResult.errorCode!)
      }
    }

    // 检查邮箱唯一性
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: userId } }
      })
      if (existing) {
        return errorResponse(res, 400, AuthErrorCodes.EMAIL_ALREADY_REGISTERED)
      }
    }

    const updateData: { nickname?: string; avatar?: string; username?: string; email?: string; emailVerified?: boolean; passwordSet?: boolean; passwordHash?: string } = {}
    if (nickname !== undefined) updateData.nickname = nickname
    if (avatar !== undefined) updateData.avatar = avatar
    if (username !== undefined) updateData.username = username
    if (email !== undefined) {
      updateData.email = email
      updateData.emailVerified = true
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    res.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      hasPassword: !!user.passwordHash,
      userTier: user.userTier,
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '更新用户信息错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 设置密码（首次设置密码）
router.post('/set-password', authenticate, [
  body('password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/).withMessage('ERR_INVALID_PASSWORD_FORMAT'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, AuthErrorCodes.INVALID_PASSWORD_FORMAT)
  }

  const userId = req.user.id
  const { password } = req.body

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return errorResponse(res, 404, AuthErrorCodes.USER_NOT_FOUND)
    }

    if (user.passwordHash) {
      return errorResponse(res, 400, AuthErrorCodes.PASSWORD_INCORRECT) // Reuse for "already set"
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordSet: true }
    })

    res.json({ message: 'passwordSetSuccess' })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '设置密码错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 修改密码
router.put('/change-password', authenticate, [
  body('oldPassword').notEmpty().withMessage('ERR_INVALID_PASSWORD_FORMAT'),
  body('newPassword').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/).withMessage('ERR_INVALID_PASSWORD_FORMAT'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, AuthErrorCodes.INVALID_PASSWORD_FORMAT)
  }

  const userId = req.user.id
  const { oldPassword, newPassword } = req.body

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user || !user.passwordHash) {
      return errorResponse(res, 400, AuthErrorCodes.ACCOUNT_NOT_SET_PASSWORD)
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!valid) {
      return errorResponse(res, 401, AuthErrorCodes.PASSWORD_INCORRECT)
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordSet: true }
    })

    res.json({ message: 'passwordChangedSuccess' })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '修改密码错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 检查用户名是否可用
router.get('/check-username', async (req, res) => {
  const { username } = req.query as { username?: string }

  if (!username) {
    return errorResponse(res, 400, AuthErrorCodes.USERNAME_INVALID_FORMAT)
  }

  if (containsBannedWord(username)) {
    return res.json({ available: false, reason: 'ERR_USERNAME_CONTAINS_BANNED_WORDS' })
  }

  const existing = await prisma.user.findUnique({
    where: { username }
  })

  res.json({ available: !existing })
})

// 删除账号
router.delete('/account', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    // 删除用户所有数据
    await prisma.$transaction([
      prisma.collection.deleteMany({ where: { userId } }),
      prisma.tag.deleteMany({ where: { userId } }),
      prisma.list.deleteMany({ where: { userId } }),
      prisma.share.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } })
    ])

    res.json({ message: 'accountDeleted' })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '删除账号错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 重置密码（通过验证码）
router.post('/reset-password', [
  body('email').isEmail().withMessage('ERR_INVALID_EMAIL_FORMAT'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('ERR_INVALID_VERIFICATION_CODE'),
  body('newPassword').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/).withMessage('ERR_INVALID_PASSWORD_FORMAT'),
], async (req, res) => {
  const reqId = req.reqId
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0]
      let errorCode: AuthErrorCode = AuthErrorCodes.UNKNOWN_ERROR
      switch (firstError.msg) {
        case 'ERR_INVALID_EMAIL_FORMAT': errorCode = AuthErrorCodes.INVALID_EMAIL_FORMAT; break
        case 'ERR_INVALID_PASSWORD_FORMAT': errorCode = AuthErrorCodes.INVALID_PASSWORD_FORMAT; break
        case 'ERR_INVALID_VERIFICATION_CODE': errorCode = AuthErrorCodes.VERIFICATION_INVALID; break
      }
      return errorResponse(res, 400, errorCode)
    }

    const { email, code, newPassword } = req.body

    // 验证验证码
    const emailKey = `email:${email}`
    const verifyResult = await verifyCode(emailKey, code)
    if (!verifyResult.valid) {
      return errorResponse(res, 400, verifyResult.errorCode!)
    }

    // 查找用户
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return errorResponse(res, 404, AuthErrorCodes.ACCOUNT_NOT_FOUND)
    }

    // 更新密码
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    logger.info({ reqId, userId: user.id }, '密码重置成功')
    res.json({ message: 'passwordResetSuccess' })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ reqId, err: err.message }, '重置密码错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// ===== Google 登录 =====
router.post('/google', async (req, res) => {
  const reqId = req.reqId
  try {
    const { credential, lang = 'zh', referralCode } = req.body
    if (!credential) {
      return errorResponse(res, 400, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
    }

    if (!GOOGLE_CLIENT_ID) {
      logger.error({}, '[Google Auth] GOOGLE_CLIENT_ID 未配置')
      return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID)
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return errorResponse(res, 401, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
    }

    const googleId = payload.sub
    const name = payload.name || 'User'
    const picture = payload.picture || null

    // 1. 先通过 googleId 查找用户
    let user = await prisma.user.findUnique({ where: { googleId } })

    // 2. 如果都没有，创建新用户（不再通过 email 关联，email 留空）
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId,
          nickname: name,
          avatar: picture,
          lang,
          authSource: 'google',
        },
      })

      // 创建默认分组
      await prisma.list.create({
        data: {
          userId: user.id,
          name: DEFAULT_LIST_KEY,
          description: DEFAULT_LIST_DESC,
        },
      })

      // 创建默认标签
      await createDefaultTags(user.id, lang)

      recordUserRegistered('google')

      // 处理邀请码
      if (referralCode && typeof referralCode === 'string') {
        try {
          const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || 'unknown'
          const userAgent = req.headers['user-agent'] || undefined
          const result = await useReferralCode(referralCode, user.id, clientIp, userAgent)
          if (result.success) {
            logger.info({ reqId, userId: user.id, code: referralCode.toUpperCase() }, 'Google邀请码注册成功，邀请关系已绑定')
          } else {
            logger.warn({ reqId, userId: user.id, code: referralCode.toUpperCase(), errorCode: result.errorCode }, 'Google邀请码使用失败')
          }
        } catch (refErr) {
          logger.warn({ reqId, referralCode, err: (refErr as Error).message }, 'Google邀请码处理失败')
        }
      }
    } else {
      // 检查用户状态
      if (user.status === 'banned') {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_BANNED)
      }
      if (user.status === 'suspended') {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_SUSPENDED)
      }
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_LOCKED)
      }
      // 获取客户端 IP
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || undefined
      // 更新最后登录时间和IP
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: clientIp,
          loginAttempts: 0,
          lockedUntil: null,
        },
      })
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // 判断是否需要邮箱补充提醒
    const needsEmailSetup = !user.email && !user.passwordHash

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        hasPassword: !!user.passwordHash,
        authSource: user.authSource,
        googleId: user.googleId,
        userTier: user.userTier,
        needsEmailSetup,
      },
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, 'Google 登录错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 401, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
  }
})

// ===== 微信登录 =====
router.post('/wechat', async (req, res) => {
  const reqId = req.reqId
  try {
    const { credential, lang = 'zh', referralCode } = req.body
    if (!credential) {
      return errorResponse(res, 400, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
    }

    const { getAuthProvider } = await import('../providers/auth')
    const provider = await getAuthProvider('wechat')
    
    if (!provider.isConfigured()) {
      logger.error({}, '[WeChat Auth] 微信登录未配置')
      return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
    }

    const result = await provider.verifyCredential({ token: credential })
    
    if (!result.success) {
      return errorResponse(res, 401, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
    }

    const wechatId = result.providerUserId
    const email = result.email || null
    const name = result.name || '用户'
    const picture = result.avatar

    let user = await prisma.user.findUnique({ where: { wechatOpenId: wechatId } })

    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        if (user.status === 'banned') {
          return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_BANNED)
        }
        if (user.status === 'suspended') {
          return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_SUSPENDED)
        }
        if (user.lockedUntil && new Date() < user.lockedUntil) {
          return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_LOCKED)
        }
        user = await prisma.user.update({
          where: { id: user.id },
          data: { wechatOpenId: wechatId, lastLoginAt: new Date() },
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email || undefined,
          wechatOpenId: wechatId,
          nickname: name,
          avatar: picture,
          lang,
          authSource: 'wechat',
        },
      })

      await prisma.list.create({
        data: {
          userId: user.id,
          name: DEFAULT_LIST_KEY,
          description: DEFAULT_LIST_DESC,
        },
      })

      await createDefaultTags(user.id, lang)

      recordUserRegistered('wechat')

      if (referralCode && typeof referralCode === 'string') {
        try {
          const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || 'unknown'
          const userAgent = req.headers['user-agent'] || undefined
          const result = await useReferralCode(referralCode, user.id, clientIp, userAgent)
          if (result.success) {
            logger.info({ reqId, userId: user.id, code: referralCode.toUpperCase() }, '微信邀请码注册成功')
          }
        } catch (refErr) {
          logger.warn({ reqId, referralCode, err: (refErr as Error).message }, '微信邀请码处理失败')
        }
      }
    } else {
      if (user.status === 'banned') {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_BANNED)
      }
      if (user.status === 'suspended') {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_SUSPENDED)
      }
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_LOCKED)
      }
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || undefined
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: clientIp,
          loginAttempts: 0,
          lockedUntil: null,
        },
      })
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        hasPassword: !!user.passwordHash,
        authSource: user.authSource,
        googleId: user.googleId,
        userTier: user.userTier,
      },
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '微信登录错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 401, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
  }
})

// ===== 微信登录回调 =====
router.get('/wechat/callback', async (req, res) => {
  const reqId = req.reqId
  try {
    const { code, state } = req.query
    if (!code) {
      return res.redirect('/login?error=invalid_code')
    }

    const { getAuthProvider } = await import('../providers/auth')
    const provider = await getAuthProvider('wechat')
    
    if (!provider.isConfigured()) {
      logger.error({}, '[WeChat Auth] 微信登录未配置')
      return res.redirect('/login?error=server_error')
    }

    const result = await provider.verifyCredential({ token: code as string })
    
    if (!result.success) {
      return res.redirect('/login?error=invalid_credential')
    }

    const wechatId = result.providerUserId
    const email = result.email || null
    const name = result.name || '用户'
    const picture = result.avatar

    // 解析 state 参数获取 redirect 和 lang
    let redirectUrl = '/'
    let lang = 'zh'
    if (state) {
      try {
        const stateData = JSON.parse(atob(state as string))
        redirectUrl = stateData.redirect || '/'
        lang = stateData.lang || 'zh'
      } catch {
        // 解析失败使用默认值
      }
    }

    let user = await prisma.user.findUnique({ where: { wechatOpenId: wechatId } })

    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        if (user.status === 'banned') {
          return res.redirect('/login?error=account_banned')
        }
        if (user.status === 'suspended') {
          return res.redirect('/login?error=account_suspended')
        }
        if (user.lockedUntil && new Date() < user.lockedUntil) {
          return res.redirect('/login?error=account_locked')
        }
        user = await prisma.user.update({
          where: { id: user.id },
          data: { wechatOpenId: wechatId, lastLoginAt: new Date() },
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email || undefined,
          wechatOpenId: wechatId,
          nickname: name,
          avatar: picture,
          lang,
          authSource: 'wechat',
        },
      })

      await prisma.list.create({
        data: {
          userId: user.id,
          name: DEFAULT_LIST_KEY,
          description: DEFAULT_LIST_DESC,
        },
      })

      await createDefaultTags(user.id, lang)

      recordUserRegistered('wechat')
    } else {
      if (user.status === 'banned') {
        return res.redirect('/login?error=account_banned')
      }
      if (user.status === 'suspended') {
        return res.redirect('/login?error=account_suspended')
      }
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        return res.redirect('/login?error=account_locked')
      }
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || undefined
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: clientIp,
          loginAttempts: 0,
          lockedUntil: null,
        },
      })
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // 设置 cookie
    res.cookie('lc_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    // 返回 HTML 页面关闭弹窗并通知父窗口刷新
    const needsPassword = !user.passwordHash ? '1' : '0'
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>登录成功</title></head>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
        <script>
          // 通知父窗口刷新
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'wechat_login',
              success: true,
              needsPassword: ${needsPassword},
              redirect: '${redirectUrl}'
            }, window.location.origin);
            window.close();
          } else {
            // 回退方案：直接跳转
            window.location.href = '/login?wechat_success=1&needs_password_setup=${needsPassword}&redirect=${encodeURIComponent(redirectUrl)}';
          }
        </script>
        <p style="text-align:center;color:#666;">登录成功，正在关闭...</p>
      </body>
      </html>
    `)
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '微信登录回调错误')
    res.locals.errorMessage = err.message
    // 登录失败也返回 HTML 关闭弹窗
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>登录失败</title></head>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
        <script>
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
              type: 'wechat_login',
              success: false,
              error: 'login_failed'
            }, window.location.origin);
            window.close();
          } else {
            window.location.href = '/login?error=login_failed';
          }
        </script>
        <p style="text-align:center;color:#c00;">登录失败，正在关闭...</p>
      </body>
      </html>
    `)
  }
})

// ===== Apple Sign In =====
router.post('/apple', async (req, res) => {
  const reqId = req.reqId
  try {
    const { credential, lang = 'zh', referralCode } = req.body
    if (!credential) {
      return errorResponse(res, 400, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
    }

    const { getAuthProvider } = await import('../providers/auth')
    const provider = await getAuthProvider('apple')
    
    if (!provider.isConfigured()) {
      logger.error({}, '[Apple Auth] Apple登录未配置')
      return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
    }

    const result = await provider.verifyCredential({ token: credential })
    
    if (!result.success) {
      return errorResponse(res, 401, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
    }

    const appleId = result.providerUserId
    const email = result.email || null
    const name = result.name || '用户'
    const picture = result.avatar

    let user = await prisma.user.findUnique({ where: { appleId } })

    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        if (user.status === 'banned') {
          return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_BANNED)
        }
        if (user.status === 'suspended') {
          return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_SUSPENDED)
        }
        if (user.lockedUntil && new Date() < user.lockedUntil) {
          return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_LOCKED)
        }
        user = await prisma.user.update({
          where: { id: user.id },
          data: { appleId, lastLoginAt: new Date() },
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email || undefined,
          appleId,
          nickname: name,
          avatar: picture,
          lang,
          authSource: 'apple',
        },
      })

      await prisma.list.create({
        data: {
          userId: user.id,
          name: DEFAULT_LIST_KEY,
          description: DEFAULT_LIST_DESC,
        },
      })

      await createDefaultTags(user.id, lang)

      recordUserRegistered('apple')

      if (referralCode && typeof referralCode === 'string') {
        try {
          const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || 'unknown'
          const userAgent = req.headers['user-agent'] || undefined
          const result = await useReferralCode(referralCode, user.id, clientIp, userAgent)
          if (result.success) {
            logger.info({ reqId, userId: user.id, code: referralCode.toUpperCase() }, 'Apple邀请码注册成功')
          }
        } catch (refErr) {
          logger.warn({ reqId, referralCode, err: (refErr as Error).message }, 'Apple邀请码处理失败')
        }
      }
    } else {
      if (user.status === 'banned') {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_BANNED)
      }
      if (user.status === 'suspended') {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_SUSPENDED)
      }
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        return errorResponse(res, 403, AuthErrorCodes.ACCOUNT_LOCKED)
      }
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || undefined
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: clientIp,
          loginAttempts: 0,
          lockedUntil: null,
        },
      })
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        hasPassword: !!user.passwordHash,
        authSource: user.authSource,
        googleId: user.googleId,
        userTier: user.userTier,
      },
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, 'Apple登录错误')
    res.locals.errorMessage = err.message
    return errorResponse(res, 401, AuthErrorCodes.INVALID_GOOGLE_TOKEN)
  }
})

// ===== Onboarding 引导 =====

// 示例收藏数据（新用户引导用）
const ONBOARDING_COLLECTIONS = [
  { url: 'https://www.bilibili.com/video/BV1GJ411x7h7', title: 'B站热门视频：如何高效整理收藏', platform: 'bilibili', nameCn: '学习', nameEn: 'Study' },
  { url: 'https://www.xiaohongshu.com/explore', title: '小红书：生活灵感与好物推荐', platform: 'xiaohongshu', nameCn: '娱乐', nameEn: 'Entertainment' },
  { url: 'https://github.com/trending', title: 'GitHub Trending：发现开源项目', platform: 'github', nameCn: '工作', nameEn: 'Work' },
  { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'YouTube：经典音乐视频', platform: 'youtube', nameCn: '娱乐', nameEn: 'Entertainment' },
  { url: 'https://sspai.com/post/65591', title: '少数派：高效信息管理指南', platform: 'sspai', nameCn: '学习', nameEn: 'Study' },
]

// 完成新手引导（标记完成 + 插入示例数据）
router.post('/complete-onboarding', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } })
    const settings = (user?.settings as Record<string, unknown>) || {}

    // 已完成引导则跳过
    if (settings.onboardingCompleted) {
      res.json({ message: '引导已完成', data: { skipped: true } })
      return
    }

    // 获取用户默认分组
    const defaultList = await prisma.list.findFirst({
      where: { userId, name: '我的收藏' },
    })

    // 获取用户已有标签（注册时已创建默认标签）
    const existingTags = await prisma.tag.findMany({
      where: { userId },
      select: { id: true, nameCn: true, nameEn: true },
    })

    // 创建示例收藏
    for (const item of ONBOARDING_COLLECTIONS) {
      // 查找对应标签
      const tag = existingTags.find(t => t.nameCn === item.nameCn || t.nameEn === item.nameEn)
      const tagIds = tag ? [tag.id] : []

      await prisma.collection.create({
        data: {
          userId,
          url: item.url,
          title: item.title,
          platform: item.platform,
          tags: tagIds.length > 0 ? { connect: tagIds.map(id => ({ id })) } : undefined,
          lists: defaultList ? { connect: [{ id: defaultList.id }] } : undefined,
        },
      })
    }

    // 标记引导完成
    await prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...settings,
          onboardingCompleted: true,
        },
      },
    })

    logger.info({ userId }, '✅ 新用户引导完成，已插入示例数据')
    res.json({ message: '引导完成', data: { created: ONBOARDING_COLLECTIONS.length } })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error({ err: err.message }, '完成新手引导错误')
    errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

export default router
