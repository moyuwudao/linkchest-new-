import sharp from 'sharp'
import prisma from '../lib/prisma'
import { getRedisClient, isRedisAvailable } from '../lib/redis'
import { COVER_CONFIG, AVATAR_CONFIG } from '../lib/config'
import { uploadToCos, deleteFromCos, getSignedUrl, generateCosKey, generateAvatarCosKey } from './cos'
import { getQuotaUsage } from './quota'
import { QuotaErrorCodes } from '../lib/errorCodes'
import fetch from 'node-fetch'

export interface CoverUploadResult {
  coverImageId: string
  cosUrl: string
  size: number
  width: number
  height: number
}

/**
 * 压缩并上传封面图片
 * @param userId 用户ID
 * @param buffer 原始图片 Buffer
 * @param originalName 原始文件名
 */
export async function processAndUploadCover(
  userId: string,
  buffer: Buffer,
  originalName: string
): Promise<CoverUploadResult> {
  // v3.0: 封面日配额检查（coverImagesDaily）
  const { limits } = await getQuotaUsage(userId)
  const today = new Date().toISOString().slice(0, 10)
  const dailyKey = `lc:cover:daily:${userId}:${today}`

  const redis = getRedisClient()
  let dailyUsed = 0
  if (redis) {
    dailyUsed = parseInt(await redis.get(dailyKey) || '0', 10)
  }

  if (dailyUsed >= limits.coverImagesDaily) {
    throw new Error(QuotaErrorCodes.QUOTA_COVER_IMAGES_EXCEEDED)
  }

  // 校验图片格式（避免 sharp 处理非图片数据崩溃）
  try {
    const metadata = await sharp(buffer).metadata()
    if (!metadata.format) {
      throw new Error('无法识别图片格式')
    }
  } catch {
    throw new Error('无效的图片文件')
  }

  // Sharp 压缩处理
  const processed = await sharp(buffer)
    .resize({
      width: COVER_CONFIG.maxDimension,
      height: COVER_CONFIG.maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: COVER_CONFIG.quality })
    .toBuffer({ resolveWithObject: true })

  const { data, info } = processed

  // 如果压缩后仍超过目标大小，进一步降低质量
  let finalBuffer = data
  let finalQuality = COVER_CONFIG.quality

  while (finalBuffer.length > COVER_CONFIG.targetSize && finalQuality > 40) {
    finalQuality -= 10
    finalBuffer = await sharp(buffer)
      .resize({
        width: COVER_CONFIG.maxDimension,
        height: COVER_CONFIG.maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: finalQuality })
      .toBuffer()
  }

  // 上传至 COS
  const cosKey = generateCosKey(userId, `${Date.now()}.webp`)
  await uploadToCos(cosKey, finalBuffer, 'image/webp')

  // 生成签名 URL
  const cosUrl = await getSignedUrl(cosKey, COVER_CONFIG.urlExpirySeconds)
  const urlExpiresAt = new Date(Date.now() + COVER_CONFIG.urlExpirySeconds * 1000)

  // 写入 CoverImage 记录
  const coverImage = await prisma.coverImage.create({
    data: {
      userId,
      cosKey,
      cosUrl,
      urlExpiresAt,
      size: finalBuffer.length,
      width: info.width,
      height: info.height,
      format: COVER_CONFIG.format,
    },
  })

  // 更新封面日上传计数器（失败不影响主流程）
  if (redis) {
    try {
      await redis.incr(dailyKey)
      await redis.expire(dailyKey, 86400)
    } catch {
      // Redis 计数器更新失败不影响主流程
    }
  }

  // 缓存 URL 到 Redis（失败不影响主流程）
  if (redis) {
    try {
      await redis.setex(
        `cover:url:${coverImage.id}`,
        COVER_CONFIG.redisCacheTtl,
        cosUrl
      )
    } catch {
      // Redis 写入失败不影响封面上传主流程
    }
  }

  return {
    coverImageId: coverImage.id,
    cosUrl,
    size: finalBuffer.length,
    width: info.width,
    height: info.height,
  }
}

/**
 * 获取封面签名 URL（优先 Redis 缓存，过期则刷新）
 */
export async function getCoverUrl(coverImageId: string): Promise<string | null> {
  // 1. 查 Redis 缓存（失败降级到数据库）
  const redis = getRedisClient()
  if (redis) {
    try {
      const cached = await redis.get(`cover:url:${coverImageId}`)
      if (cached) return cached
    } catch {
      // Redis 读取失败，继续查数据库
    }
  }

  // 2. 查数据库
  const cover = await prisma.coverImage.findUnique({
    where: { id: coverImageId },
  })
  if (!cover) return null

  // 3. URL 未过期，直接返回
  if (cover.urlExpiresAt && cover.urlExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    if (redis) {
      try {
        const ttl = Math.floor((cover.urlExpiresAt.getTime() - Date.now()) / 1000)
        await redis.setex(`cover:url:${coverImageId}`, Math.max(ttl, 60), cover.cosUrl)
      } catch {
        // 缓存回写失败不影响返回结果
      }
    }
    return cover.cosUrl
  }

  // 4. URL 即将过期，重新生成
  const newUrl = await getSignedUrl(cover.cosKey, COVER_CONFIG.urlExpirySeconds)
  const newExpiresAt = new Date(Date.now() + COVER_CONFIG.urlExpirySeconds * 1000)

  await prisma.coverImage.update({
    where: { id: coverImageId },
    data: { cosUrl: newUrl, urlExpiresAt: newExpiresAt },
  })

  if (redis) {
    try {
      await redis.setex(
        `cover:url:${coverImageId}`,
        COVER_CONFIG.redisCacheTtl,
        newUrl
      )
    } catch {
      // 缓存更新失败不影响返回新 URL
    }
  }

  return newUrl
}

/**
 * 关联封面到收藏
 */
export async function attachCoverToCollection(
  coverImageId: string,
  collectionId: string
): Promise<void> {
  await prisma.coverImage.update({
    where: { id: coverImageId },
    data: { collectionId },
  })
}

/**
 * 删除封面（清理 COS + 数据库）
 */
export async function deleteCover(coverImageId: string): Promise<void> {
  const cover = await prisma.coverImage.findUnique({
    where: { id: coverImageId },
  })
  if (!cover) return

  // 删除 COS 对象
  try {
    await deleteFromCos(cover.cosKey)
  } catch (err) {
    console.error('COS 删除失败:', err)
  }

  // 删除 Redis 缓存
  const redis = getRedisClient()
  if (redis) {
    await redis.del(`cover:url:${coverImageId}`)
  }

  // 删除数据库记录
  await prisma.coverImage.delete({
    where: { id: coverImageId },
  })
}

/**
 * 定时清理任务：删除未关联的过期封面
 */
export async function cleanupOrphanedCovers(): Promise<{ deleted: number; errors: number }> {
  const cutoffDate = new Date(Date.now() - COVER_CONFIG.cleanupDays * 24 * 60 * 60 * 1000)

  const orphaned = await prisma.coverImage.findMany({
    where: {
      collectionId: null,
      createdAt: { lt: cutoffDate },
    },
  })

  let deleted = 0
  let errors = 0

  for (const cover of orphaned) {
    try {
      await deleteFromCos(cover.cosKey)
      await prisma.coverImage.delete({ where: { id: cover.id } })
      const redis = getRedisClient()
      if (redis) await redis.del(`cover:url:${cover.id}`)
      deleted++
    } catch {
      errors++
    }
  }

  console.log(`🧹 封面清理完成: 删除 ${deleted} 条, 失败 ${errors} 条`)
  return { deleted, errors }
}

// ===== 头像上传 =====

/**
 * 压缩并上传头像图片
 * 使用固定 COS Key，覆盖式上传
 */
/**
 * 从远程封面 URL 下载并处理为头像
 */
export async function processAvatarFromCoverUrl(
  userId: string,
  coverUrl: string
): Promise<{ url: string }> {
  // 下载远程图片（使用 AbortController 实现超时，兼容 node-fetch v2）
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(coverUrl, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) {
      throw new Error(`下载封面失败: ${res.status}`)
    }
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      throw new Error('封面 URL 不是图片格式')
    }
    const buffer = await res.buffer()
    return processAndUploadAvatar(userId, buffer)
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('下载封面超时')
    }
    throw err
  }
}

export async function processAndUploadAvatar(
  userId: string,
  buffer: Buffer
): Promise<{ url: string }> {
  // 校验图片格式（避免 sharp 处理非图片数据崩溃）
  try {
    const metadata = await sharp(buffer).metadata()
    if (!metadata.format) {
      throw new Error('无法识别图片格式')
    }
  } catch {
    throw new Error('无效的图片文件')
  }

  // Sharp 压缩: 200x200 居中裁剪
  const processed = await sharp(buffer)
    .resize(AVATAR_CONFIG.dimension, AVATAR_CONFIG.dimension, { fit: 'cover' })
    .webp({ quality: AVATAR_CONFIG.quality })
    .toBuffer()

  // 读取旧头像 cosKey（用于删除旧对象）
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } })
  const oldAvatar = user?.avatar || null

  // 上传到 COS（固定路径，覆盖式）
  const cosKey = generateAvatarCosKey(userId)
  await uploadToCos(cosKey, processed, 'image/webp')

  // 生成签名 URL
  const cosUrl = await getSignedUrl(cosKey, AVATAR_CONFIG.urlExpirySeconds)

  // 更新 User.avatar
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: cosUrl },
  })

  // 缓存 URL 到 Redis
  const redis = getRedisClient()
  if (redis) {
    try {
      await redis.setex(`avatar:url:${userId}`, AVATAR_CONFIG.redisCacheTtl, cosUrl)
    } catch {
      // Redis 写入失败不影响主流程
    }
  }

  return { url: cosUrl }
}

/**
 * 删除用户头像
 */
export async function deleteAvatar(userId: string): Promise<void> {
  const cosKey = generateAvatarCosKey(userId)

  // 删除 COS 对象
  try {
    await deleteFromCos(cosKey)
  } catch {
    // COS 对象可能不存在，忽略错误
  }

  // 清除 Redis 缓存
  const redis = getRedisClient()
  if (redis) {
    try {
      await redis.del(`avatar:url:${userId}`)
    } catch {}
  }

  // 更新 User.avatar 为 null
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null },
  })
}

/**
 * 获取头像签名 URL（优先 Redis 缓存，过期则刷新）
 */
export async function getAvatarUrl(userId: string): Promise<string | null> {
  // 1. 查 Redis 缓存
  const redis = getRedisClient()
  if (redis) {
    try {
      const cached = await redis.get(`avatar:url:${userId}`)
      if (cached) return cached
    } catch {}
  }

  // 2. 查数据库
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  })
  if (!user?.avatar) return null

  // 3. 如果 avatar 不是 COS 签名 URL（如 Google 头像等外部 URL），直接返回
  if (!user.avatar.includes('myqcloud.com') && !user.avatar.includes('cos.')) {
    return user.avatar
  }

  // 4. 重新生成签名 URL
  const cosKey = generateAvatarCosKey(userId)
  try {
    const newUrl = await getSignedUrl(cosKey, AVATAR_CONFIG.urlExpirySeconds)
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: newUrl },
    })
    if (redis) {
      try {
        await redis.setex(`avatar:url:${userId}`, AVATAR_CONFIG.redisCacheTtl, newUrl)
      } catch {}
    }
    return newUrl
  } catch {
    // 签名失败，返回当前存储的 URL
    return user.avatar
  }
}

// ===== 封面库 =====

/**
 * 获取用户封面库列表
 */
export async function getUserCovers(
  userId: string,
  page = 1,
  limit = 20
): Promise<{ data: any[]; total: number }> {
  const where = { userId }
  const [covers, total] = await Promise.all([
    prisma.coverImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        cosUrl: true,
        urlExpiresAt: true,
        size: true,
        width: true,
        height: true,
        collectionId: true,
        createdAt: true,
      },
    }),
    prisma.coverImage.count({ where }),
  ])

  // 检查并刷新过期 URL
  const refreshedCovers = await Promise.all(
    covers.map(async (cover) => {
      // 如果 URL 即将过期（5分钟内），刷新
      if (cover.urlExpiresAt && cover.urlExpiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
        try {
          const newUrl = await getCoverUrl(cover.id)
          return { ...cover, cosUrl: newUrl || cover.cosUrl }
        } catch {
          return cover
        }
      }
      return cover
    })
  )

  return { data: refreshedCovers, total }
}

// ===== 系统封面库 =====

/**
 * 获取系统预置封面列表
 */
export async function getSystemCovers(): Promise<{ data: any[] }> {
  const covers = await prisma.systemCover.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      cosKey: true,
      cosUrl: true,
      urlExpiresAt: true,
      name: true,
      sortOrder: true,
      width: true,
      height: true,
    },
  })

  // 检查并刷新过期 URL
  const refreshedCovers = await Promise.all(
    covers.map(async (cover) => {
      if (cover.urlExpiresAt && cover.urlExpiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
        try {
          const newUrl = await getSignedUrl(cover.cosKey, COVER_CONFIG.urlExpirySeconds)
          const newExpiresAt = new Date(Date.now() + COVER_CONFIG.urlExpirySeconds * 1000)
          await prisma.systemCover.update({
            where: { id: cover.id },
            data: { cosUrl: newUrl, urlExpiresAt: newExpiresAt },
          })
          return { ...cover, cosUrl: newUrl }
        } catch {
          return cover
        }
      }
      return cover
    })
  )

  return { data: refreshedCovers }
}
