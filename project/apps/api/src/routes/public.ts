import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { JWT_SECRET, WEB_BASE_URL, SHARE_BASE_URL } from '../lib/config'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { checkQuotaBatch, checkDailyQuota, incrementDailyQuota } from '../services/quota'
import { PublicErrorCodes, CommonErrorCodes, CollectionErrorCodes, AuthErrorCodes, errorResponse } from '../lib/errorCodes'
import { ensureHttps } from '../lib/utils'
import logger from '../lib/logger'
import { getRedisClient } from '../lib/redis'
import { recordShareCacheHit, recordShareCacheMiss, recordSharePageRequest } from '../services/metrics'
import { recordShareView } from '../services/prom-metrics'
import type { QuotaErrorCode } from '../lib/errorCodes'

/**
 * 缓存命中时，合并用户相关状态（isOwner / alreadyRetrieved）
 */
async function mergeUserStates(shareId: string, cachedData: any, authHeader: string | undefined) {
  const result = { ...cachedData, isOwner: false, alreadyRetrieved: false }

  if (!authHeader?.startsWith('Bearer ')) {
    return result
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const userId = decoded.userId

    const [share, savedShare] = await Promise.all([
      prisma.share.findUnique({ where: { id: shareId }, select: { userId: true } }),
      prisma.list.findFirst({ where: { userId, sourceShareId: shareId } })
    ])

    if (share) {
      result.isOwner = share.userId === userId
      // 如果用户是分享创建者，不需要密码
      if (result.isOwner) {
        result.needsPassword = false
      }
    }
    result.alreadyRetrieved = !!savedShare
  } catch {
    // token 无效或查询失败，返回公开数据
  }

  return result
}

const router = Router()

// 分享页缓存 key 前缀
const SHARE_CACHE_PREFIX = 'share:'
// 分享数据缓存 TTL：7 天（分享创建后基本不变，只有删除/停用才会失效）
const SHARE_CACHE_TTL_SECONDS = 7 * 24 * 3600

/**
 * 清除分享页 Redis 缓存
 * 在分享被删除、停用、更新时调用
 */
export async function invalidateShareCache(shareId: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return
  try {
    await redis.del(`${SHARE_CACHE_PREFIX}${shareId}`)
    logger.info({ shareId }, '分享缓存已清除')
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err), shareId }, '清除分享缓存失败')
  }
}

// 分享导入预检（检查配额和重复情况）—— 使用 /check/:shareId 避免与 /:shareId 通配冲突
router.get('/check/:shareId', authenticate, async (req: AuthenticatedRequest, res) => {
  const { shareId } = req.params
  const userId = req.user.id

  try {
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: { shareItems: true },
    })

    if (!share || !share.isActive) {
      return errorResponse(res, 404, PublicErrorCodes.PUBLIC_SHARE_NOT_FOUND)
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      return errorResponse(res, 410, PublicErrorCodes.PUBLIC_SHARE_EXPIRED)
    }

    // 如果有密码，验证密码（预检时从 query 接受 password）
    if (share.password) {
      const { password } = req.query as { password?: string }
      if (!password) {
        return res.status(200).json({
          needPassword: true,
          canImport: false,
          reason: 'password_required',
        })
      }
      const valid = await bcrypt.compare(password, share.password)
      if (!valid) {
        return errorResponse(res, 401, PublicErrorCodes.PUBLIC_SHARE_PASSWORD_INCORRECT)
      }
    }

    // 检查是否已导入过
    const existingList = await prisma.list.findFirst({
      where: { userId, sourceShareId: shareId },
    })
    if (existingList) {
      return res.status(200).json({
        alreadyImported: true,
        canImport: false,
        reason: 'already_imported',
        existingListName: existingList.name,
      })
    }

    // 检查用户已有 URL（排除回收站中的）
    const existingUrls = new Set(
      (await prisma.collection.findMany({
        where: { userId, deletedAt: null },
        select: { url: true },
      })).map(c => c.url)
    )

    const shareItemCount = share.shareItems.length
    let duplicateCount = 0
    for (const item of share.shareItems) {
      if (existingUrls.has(item.url)) duplicateCount++
    }
    const newCount = shareItemCount - duplicateCount

    // 获取当前配额
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userTier: true },
    })
    const tier = (user?.userTier as 'medium' | 'heavy' | 'super') || 'medium'
    const { getQuotaConfig } = await import('../services/tierConfig')
    const limits = await getQuotaConfig(tier)
    const currentListCount = await prisma.list.count({ where: { userId } })

    const listNeeded = 1
    const listLimitReached = currentListCount + listNeeded > limits.lists
    const collectionLimitReached = newCount > 0 && (await prisma.collection.count({ where: { userId, deletedAt: null } })) + newCount > limits.collections

    return res.status(200).json({
      totalCount: shareItemCount,
      newCount,
      duplicateCount,
      currentListCount,
      listLimit: limits.lists,
      collectionLimit: limits.collections,
      listLimitReached,
      collectionLimitReached,
      alreadyImported: false,
      canImport: !listLimitReached && !collectionLimitReached,
      reason: listLimitReached ? 'list_limit_reached' : collectionLimitReached ? 'collection_limit_reached' : null,
    })
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '[GET /s/:shareId/check] error')
    return errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 公开分享页面数据
router.get('/:shareId', async (req, res) => {
  const startTime = Date.now()
  const { shareId } = req.params

  // 如果是浏览器直接访问（Accept 包含 text/html 且不包含 application/json，且不是 AJAX 请求），重定向到 Web 前端分享页面
  const accept = req.headers.accept || ''
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' || req.query.format === 'json'
  if (!isAjax && accept.includes('text/html') && !accept.includes('application/json')) {
    return res.redirect(302, `${WEB_BASE_URL}/s/${shareId}`)
  }

  // Redis 缓存：公开分享数据 60 秒缓存（不包含用户相关状态如 isOwner/needsPassword）
  const redis = getRedisClient()
  const cacheKey = `share:${shareId}`
  let cacheHit = false
  let redisGetMs = 0
  if (redis) {
    const redisGetStart = Date.now()
    try {
      const cached = await redis.get(cacheKey)
      redisGetMs = Date.now() - redisGetStart
      if (cached) {
        cacheHit = true
        const cachedData = JSON.parse(cached)
        // 合并用户相关状态（isOwner / needsPassword / alreadyRetrieved）后返回
        const mergeStart = Date.now()
        const result = await mergeUserStates(shareId, cachedData, req.headers.authorization)
        const mergeMs = Date.now() - mergeStart
        logger.info({ shareId, totalMs: Date.now() - startTime, redisGetMs, mergeMs, cache: 'hit' }, '分享页请求')
        recordShareCacheHit(shareId).catch(() => {})
        recordSharePageRequest(Date.now() - startTime).catch(() => {})
        recordShareView(true)
        return res.json(result)
      }
    } catch {
      redisGetMs = Date.now() - redisGetStart
      // 缓存读取失败，降级走数据库
    }
  }

  try {
    const dbStart = Date.now()
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: {
        shareItems: true, // 直接读取快照数据，不再 include collection
      },
    })
    const dbMs = Date.now() - dbStart

    if (!share || !share.isActive) {
      logger.info({ shareId, totalMs: Date.now() - startTime, dbMs, cache: 'miss', result: 'not_found' }, '分享页请求')
      return errorResponse(res, 404, PublicErrorCodes.PUBLIC_SHARE_NOT_FOUND)
    }

    // 过期检查
    if (share.expiresAt && new Date() > share.expiresAt) {
      logger.info({ shareId, totalMs: Date.now() - startTime, dbMs, cache: 'miss', result: 'expired' }, '分享页请求')
      return errorResponse(res, 410, PublicErrorCodes.PUBLIC_SHARE_EXPIRED)
    }

    // 批量查询原始收藏的 lists 信息（用于展示分组）
    const collectionIds = share.shareItems
      .map(item => item.collectionId)
      .filter((id): id is string => !!id)

    const collectionsWithLists = collectionIds.length > 0
      ? await prisma.collection.findMany({
          where: { id: { in: collectionIds } },
          select: {
            id: true,
            lists: { select: { id: true, name: true } },
          },
        })
      : []

    const listMap = new Map<string, { id: string; name: string }[]>()
    for (const c of collectionsWithLists) {
      listMap.set(c.id, c.lists.map(l => ({ id: l.id, name: l.name })))
    }

    // 从 ShareItem 快照字段读取收藏数据
    const collections = share.shareItems.map(item => ({
      id: item.collectionId || item.id,
      title: item.title,
      coverImage: ensureHttps(item.coverImage),
      coverStrategy: item.coverStrategy || 'brand', // 默认 brand 兼容历史未迁移数据
      platform: item.platform,
      url: item.url,
      rating: item.rating != null ? Number(item.rating) : null,
      tags: (item.tags as { nameCn?: string; nameEn?: string }[] | null) || [],
      lists: item.collectionId ? (listMap.get(item.collectionId) || []) : [],
    }))

    const baseResult = {
      id: share.id,
      userId: share.userId,
      title: share.title,
      createdAt: share.createdAt,
      description: share.description,
      hasPassword: !!share.password,
      shareUrl: `${SHARE_BASE_URL}/s/${share.id}`,
      expiresAt: share.expiresAt,
      viewCount: share.viewCount,
      collections,
    }

    // 检查当前用户是否是分享创建者（如果有认证信息）
    let isOwner = false
    if (req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
        isOwner = share.userId === decoded.userId
      } catch {
        // token 无效，忽略
      }
    }

    // 构建公开数据（不包含用户状态，有密码时默认隐藏 url）
    // 如果用户是创建者，则不需要密码
    const needsPassword = !!share.password && !isOwner
    const publicCollections = needsPassword
      ? collections.map((c: any) => { const { url: _, ...rest } = c; return rest; })
      : collections

    const publicResult = {
      ...baseResult,
      needsPassword,
      collections: publicCollections,
    }

    // 写入 Redis 缓存（TTL 7 天，分享数据创建后基本不变）
    let redisSetMs = 0
    if (redis) {
      const redisSetStart = Date.now()
      try {
        await redis.setex(cacheKey, SHARE_CACHE_TTL_SECONDS, JSON.stringify(publicResult))
      } catch {
        // 缓存写入失败，不影响主流程
      }
      redisSetMs = Date.now() - redisSetStart
    }

    // 分享页缓存头 - 浏览器缓存1小时，CDN/代理缓存24小时（快照数据不变）
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400')
    if (!cacheHit) {
      recordShareCacheMiss(shareId).catch(() => {})
    }
    const totalMs = Date.now() - startTime
    logger.info({ shareId, totalMs, redisGetMs, dbMs, redisSetMs, cache: 'miss', items: collections.length }, '分享页请求')
    recordSharePageRequest(totalMs).catch(() => {})
    recordShareView(false)
    res.json(publicResult)
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error), shareId, totalMs: Date.now() - startTime }, '获取分享数据错误')
    errorResponse(res, 500, PublicErrorCodes.PUBLIC_SHARE_VERIFY_FAILED)
  }
})

// 获取当前用户与分享的关系状态（isOwner / alreadyRetrieved）
router.get('/:shareId/me', authenticate, async (req: AuthenticatedRequest, res) => {
  const { shareId } = req.params
  const userId = req.user.id

  try {
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      select: { userId: true, isActive: true, passwordPlain: true },
    })

    if (!share || !share.isActive) {
      return errorResponse(res, 404, PublicErrorCodes.PUBLIC_SHARE_NOT_FOUND)
    }

    const isOwner = share.userId === userId

    // 检查该分享是否已被当前用户保存/导入过
    const savedShare = await prisma.list.findFirst({
      where: { userId, sourceShareId: shareId },
    })
    const alreadyRetrieved = !!savedShare

    res.json({ isOwner, alreadyRetrieved, needsPassword: false, password: isOwner ? share.passwordPlain || null : null })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error), shareId, userId }, '获取分享用户状态错误')
    errorResponse(res, 500, PublicErrorCodes.PUBLIC_SHARE_VERIFY_FAILED)
  }
})

// 密码验证
router.post('/:shareId/verify', [
  body('password').isLength({ min: 4, max: 20 }).withMessage('请输入4-20位密码'),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { shareId } = req.params
  const { password } = req.body

  try {
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: {
        shareItems: true, // 直接读取快照数据
      },
    })

    if (!share || !share.isActive) {
      return errorResponse(res, 404, PublicErrorCodes.PUBLIC_SHARE_NOT_FOUND)
    }

    // 过期检查
    if (share.expiresAt && new Date() > share.expiresAt) {
      return errorResponse(res, 410, PublicErrorCodes.PUBLIC_SHARE_EXPIRED)
    }

    if (!share.password) {
      return errorResponse(res, 400, PublicErrorCodes.PUBLIC_SHARE_NO_PASSWORD_NEEDED)
    }

    const valid = await bcrypt.compare(password, share.password)
    if (!valid) {
      return errorResponse(res, 401, PublicErrorCodes.PUBLIC_SHARE_PASSWORD_INCORRECT)
    }

    // 批量查询原始收藏的 lists 信息
    const collectionIds = share.shareItems
      .map(item => item.collectionId)
      .filter((id): id is string => !!id)

    const collectionsWithLists = collectionIds.length > 0
      ? await prisma.collection.findMany({
          where: { id: { in: collectionIds } },
          select: {
            id: true,
            lists: { select: { id: true, name: true } },
          },
        })
      : []

    const listMap = new Map<string, { id: string; name: string }[]>()
    for (const c of collectionsWithLists) {
      listMap.set(c.id, c.lists.map(l => ({ id: l.id, name: l.name })))
    }

    // 验证通过，从快照返回数据
    const collections = share.shareItems.map(item => ({
      id: item.collectionId || item.id,
      title: item.title,
      coverImage: ensureHttps(item.coverImage),
      platform: item.platform,
      url: item.url,
      rating: item.rating != null ? Number(item.rating) : null,
      tags: (item.tags as { nameCn?: string; nameEn?: string }[] | null) || [],
      lists: item.collectionId ? (listMap.get(item.collectionId) || []) : [],
    }))
    res.json({
      id: share.id,
      title: share.title,
      createdAt: share.createdAt,
      description: share.description,
      hasPassword: true,
      isOwner: false,
      collections,
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '验证分享密码错误')
    errorResponse(res, 500, PublicErrorCodes.PUBLIC_SHARE_VERIFY_FAILED)
  }
})

// 一键保存分享内容到自己的收藏（兼容旧路径）
router.post('/:shareId/save', authenticate, async (req: AuthenticatedRequest, res) => {
  const { shareId } = req.params
  const userId = req.user.id

  try {
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: { shareItems: true },
    })

    if (!share || !share.isActive) {
      return errorResponse(res, 404, PublicErrorCodes.PUBLIC_SHARE_NOT_FOUND)
    }

    // 过期检查
    if (share.expiresAt && new Date() > share.expiresAt) {
      return errorResponse(res, 410, PublicErrorCodes.PUBLIC_SHARE_EXPIRED)
    }

    // 如果有密码，需要验证密码
    if (share.password) {
      const { password } = req.body
      if (!password) {
        return errorResponse(res, 403, PublicErrorCodes.PUBLIC_SHARE_PASSWORD_INCORRECT, { needPassword: true })
      }
      const valid = await bcrypt.compare(password, share.password)
      if (!valid) {
        return errorResponse(res, 401, PublicErrorCodes.PUBLIC_SHARE_PASSWORD_INCORRECT)
      }
    }

    // 每日导入配额检查
    const dailyError = await checkDailyQuota(userId)
    if (dailyError) {
      return errorResponse(res, 403, dailyError)
    }

    // 检查是否已通过 sourceShareId 保存/导入/订阅过
    const existingList = await prisma.list.findFirst({
      where: { userId, sourceShareId: shareId },
    })
    if (existingList) {
      return res.status(200).json({
        alreadyImported: true,
        existingListName: existingList.name,
      })
    }

    // 获取分享者用户名
    const shareUser = await prisma.user.findUnique({
      where: { id: share.userId },
      select: { username: true },
    })
    const shareUserName = shareUser?.username || '未知用户'

    // 预查用户已有 URL（用于估算新增数量，排除回收站中的）
    const existingUrls = new Set(
      (await prisma.collection.findMany({
        where: { userId, deletedAt: null },
        select: { url: true },
      })).map(c => c.url)
    )
    const estimatedNewCollections = share.shareItems.filter(
      item => !existingUrls.has(item.url)
    ).length

    // 数量上限检查，防止超大事务
    if (share.shareItems.length > 500) {
      return errorResponse(res, 400, CollectionErrorCodes.COLLECTION_IMPORT_TOO_MANY)
    }

    // 提前拒绝明显超限的请求（减少事务开销）
    const preCheckError = await checkQuotaBatch(userId, {
      lists: 1,
      collections: estimatedNewCollections,
    })
    if (preCheckError) {
      return errorResponse(res, 403, preCheckError)
    }

    // 在事务内执行配额重检 + 创建，消除 TOCTOU 竞态
    const result = await prisma.$transaction(async (tx) => {
      // 事务内重新精确检查配额
      const quotaError = await checkQuotaBatch(userId, {
        lists: 1,
        collections: estimatedNewCollections,
      }, tx)
      if (quotaError) {
        throw Object.assign(new Error(quotaError), { statusCode: 403 })
      }

      // 分组命名（事务内查询避免并发冲突）
      const baseName = `来自${shareUserName}的${share.title}`
      let listName = baseName
      let suffix = 0
      while (await tx.list.findFirst({ where: { userId, name: listName } })) {
        suffix++
        listName = `${baseName} (${suffix})`
      }

      // 创建分组（使用 sourceShareId 追踪来源）
      const targetList = await tx.list.create({
        data: {
          userId,
          name: listName,
          sourceShareId: share.id,
          sourceType: 'import',
        },
      })

      // 预分类：已存在的 URL 和需要新创建的（避免循环内逐条查询的 N+1 问题）
      const existingUrlsInShare = new Set<string>()
      const newItems: typeof share.shareItems = []
      for (const item of share.shareItems) {
        if (existingUrls.has(item.url)) {
          existingUrlsInShare.add(item.url)
        } else {
          newItems.push(item)
        }
      }

      // 一次性查询所有已存在的收藏（消除 N+1，排除回收站中的）
      const existingCollections = existingUrlsInShare.size > 0
        ? await tx.collection.findMany({
            where: { userId, deletedAt: null, url: { in: Array.from(existingUrlsInShare) } },
            include: { lists: { select: { id: true } } },
          })
        : []

      // 批量更新已存在的收藏（使用 set 替换分组，保持单分组语义）
      for (const existing of existingCollections) {
        const updateData: Prisma.CollectionUpdateInput = {}
        // 产品逻辑：一个收藏只能属于一个分组，使用 set 替换
        updateData.lists = { set: [{ id: targetList.id }] }
        if (!existing.note?.includes('[分享保存]')) {
          updateData.note = `[分享保存] ${existing.note || ''}`.trim()
        }
        await tx.collection.update({ where: { id: existing.id }, data: updateData })
      }

      // 批量创建新收藏
      for (const item of newItems) {
        await tx.collection.create({
          data: {
            userId,
            url: item.url,
            title: item.title,
            coverImage: item.coverImage,
            platform: item.platform,
            note: '[分享保存]',
            rating: item.rating != null ? new Prisma.Decimal(item.rating.toString()) : null,
            lists: { connect: [{ id: targetList.id }] },
          },
        })
      }

      const savedCount = newItems.length
      const skippedCount = existingCollections.length

      // 如果分组没有关联任何收藏，删除空分组
      const listCollections = await tx.collection.findMany({
        where: { userId, deletedAt: null, lists: { some: { id: targetList.id } } },
        take: 1,
      })
      if (listCollections.length === 0) {
        await tx.list.delete({ where: { id: targetList.id } })
      }

      const totalInList = listCollections.length > 0
        ? await tx.collection.count({ where: { userId, deletedAt: null, lists: { some: { id: targetList.id } } } })
        : 0

      return {
        targetList,
        listCollections,
        savedCount,
        skippedCount,
        totalInList,
      }
    }, {
      maxWait: 10000,
      timeout: 15000,
    })

    const { targetList, listCollections, savedCount, skippedCount, totalInList } = result

    await incrementDailyQuota(userId)

    res.status(201).json({
      message: savedCount > 0
        ? `保存成功，新增 ${savedCount} 个收藏`
        : skippedCount > 0
          ? `所有收藏已存在（${skippedCount} 个），已关联到分组`
          : '没有可保存的收藏',
      data: {
        listId: listCollections.length > 0 ? targetList.id : null,
        listName: listCollections.length > 0 ? targetList.name : null,
        savedCount,
        skippedCount,
        totalInList,
      },
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string }
    logger.error({ err: err?.message }, '保存分享内容错误')
    if (err?.statusCode === 403) {
      return errorResponse(res, 403, err.message as QuotaErrorCode)
    }
    return errorResponse(res, 500, PublicErrorCodes.PUBLIC_SHARE_SAVE_FAILED)
  }
})

export default router
