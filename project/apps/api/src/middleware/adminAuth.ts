/**
 * 管理员权限校验中间件
 * - 校验 JWT Token
 * - 检查 userId 是否在 ADMIN_USER_IDS 白名单中
 * - 白名单缓存在 Redis（TTL 5分钟）
 */
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../lib/config'
import { getRedisClient, isRedisAvailable } from '../lib/redis'
import logger from '../lib/logger'
import { errorResponse, AuthErrorCodes, CommonErrorCodes } from '../lib/errorCodes'

/** 从环境变量解析管理员用户ID列表 */
const ADMIN_USER_IDS = (() => {
  const ids = process.env.ADMIN_USER_IDS
  if (!ids) return new Set<string>()
  return new Set(ids.split(',').map(s => s.trim()).filter(Boolean))
})()

interface JwtPayload {
  userId: string
}

const CACHE_TTL_SECONDS = 300 // 5 分钟

/**
 * 提取 Bearer Token
 */
function extractToken(req: Request): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

/**
 * 校验用户是否为管理员
 * 优先查 Redis 缓存，未命中则查白名单
 */
async function isAdmin(userId: string): Promise<boolean> {
  if (ADMIN_USER_IDS.size === 0) {
    logger.warn('ADMIN_USER_IDS 未配置，管理员功能不可用')
    return false
  }

  // 快速路径：白名单检查
  if (ADMIN_USER_IDS.has(userId)) return true

  // 检查 Redis 缓存（防止白名单变更后缓存不一致，缓存仅作为补充）
  try {
    const redis = getRedisClient()
    if (redis && isRedisAvailable()) {
      const cacheKey = `admin:user:${userId}`
      const cached = await redis.get(cacheKey)
      if (cached === '1') return true
    }
  } catch (err) {
    logger.warn({ userId, err: err instanceof Error ? err.message : String(err) }, 'isAdmin Redis 检查失败，回退到白名单')
  }

  return false
}

/**
 * 缓存管理员身份到 Redis
 */
async function cacheAdminStatus(userId: string) {
  try {
    const redis = getRedisClient()
    if (redis && isRedisAvailable()) {
      const cacheKey = `admin:user:${userId}`
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, '1')
    }
  } catch (err) {
    logger.warn({ userId, err: err instanceof Error ? err.message : String(err) }, 'cacheAdminStatus Redis 写入失败，忽略')
  }
}

/**
 * Admin 权限中间件
 * 用法：app.use('/api/admin', adminAuth, adminRoutes)
 */
export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    logger.info({ path: req.path }, 'adminAuth start')

    const token = extractToken(req)
    if (!token) {
      logger.info('adminAuth: no token')
      return errorResponse(res, 401, AuthErrorCodes.UNAUTHORIZED)
    }

    let payload: JwtPayload
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    } catch (jwtErr) {
      const reason = jwtErr instanceof Error ? jwtErr.name : 'unknown'
      logger.info({ reason }, 'adminAuth: token invalid')
      return errorResponse(res, 401, AuthErrorCodes.TOKEN_INVALID)
    }

    const userId = payload.userId
    if (!userId) {
      logger.info('adminAuth: missing userId in payload')
      return errorResponse(res, 401, AuthErrorCodes.UNAUTHORIZED)
    }
    logger.info({ userId }, 'adminAuth: token verified')

    const admin = await isAdmin(userId)
    if (!admin) {
      logger.info({ userId, adminIds: Array.from(ADMIN_USER_IDS) }, 'adminAuth: not admin')
      return errorResponse(res, 404, CommonErrorCodes.NOT_FOUND)
    }
    logger.info({ userId }, 'adminAuth: admin check passed')

    // 缓存管理员身份
    await cacheAdminStatus(userId)

    // 将 userId 附加到请求对象
    req.userId = userId

    next()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // 先发送响应，确保即使 logger 失败也不影响客户端收到错误信息
    try {
      if (!res.headersSent) {
        res.status(500).json({ error: AuthErrorCodes.SERVER_ERROR, debug: msg })
      }
    } catch {
      // res 可能已关闭，忽略
    }
    // 再记录日志（防止 logger 失败导致 catch 块崩溃）
    try {
      logger.error({ err: msg }, 'adminAuth middleware exception')
    } catch {
      // 忽略日志错误
    }
  }
}

/**
 * 可选的 admin auth（用于需要认证但不一定需要管理员权限的路由）
 * 如果未提供 token 或不是管理员，继续执行但不附加 userId
 */
export async function optionalAdminAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req)
  if (!token) {
    next()
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    const userId = payload.userId
    if (userId && ADMIN_USER_IDS.has(userId)) {
      req.userId = userId
      await cacheAdminStatus(userId)
    }
  } catch {
    // 忽略 JWT 错误
  }
  next()
}
