import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { getRedisClient } from '../lib/redis'
import { JWT_SECRET } from '../lib/config'
import { AuthErrorCodes, AuthErrorCode, errorResponse } from '../lib/errorCodes'

interface SafeUser {
  id: string
  phone: string | null
  email: string | null
  username: string | null
  nickname: string | null
  avatar: string | null
  userTier: string
  authSource: string | null
  googleId: string | null
  appleId: string | null
  wechatOpenId: string | null
  wechatUnionId: string | null
}

export type AuthRequest = Request & { user?: SafeUser }

export type AuthenticatedRequest = Request & { user: SafeUser }

const USER_CACHE_TTL_SECONDS = 300

function userCacheKey(userId: string): string {
  return `lc:user:${userId}:safe`
}

async function getCachedUser(userId: string): Promise<SafeUser | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    const raw = await redis.get(userCacheKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as SafeUser
  } catch {
    return null
  }
}

async function setCachedUser(user: SafeUser): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.setex(userCacheKey(user.id), USER_CACHE_TTL_SECONDS, JSON.stringify(user))
  } catch {
    // 缓存写入失败不影响主流程
  }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return errorResponse(res, 401, AuthErrorCodes.UNAUTHORIZED)
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    // 优先从 Redis 缓存读取用户信息
    let safeUser = await getCachedUser(decoded.userId)

    if (!safeUser) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      })

      if (!user) {
        return errorResponse(res, 401, AuthErrorCodes.USER_NOT_FOUND)
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

      safeUser = {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        userTier: user.userTier,
        authSource: user.authSource,
        googleId: user.googleId,
        appleId: user.appleId,
        wechatOpenId: user.wechatOpenId,
        wechatUnionId: user.wechatUnionId,
      }

      // 写入 Redis 缓存（异步，不阻塞请求）
      setCachedUser(safeUser).catch(() => {})
    }

    req.user = safeUser
    next()
  } catch (error) {
    return errorResponse(res, 401, AuthErrorCodes.TOKEN_INVALID)
  }
}
