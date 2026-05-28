import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { SHARE_BASE_URL } from '../lib/config'
import {
  SHARE_PASSWORD_MIN_LENGTH,
  SHARE_PASSWORD_MAX_LENGTH,
  SHARE_TITLE_MAX_LENGTH,
  SHARE_DESCRIPTION_MAX_LENGTH,
} from '../lib/constants'
import { checkQuota, getQuotaUsage, invalidateQuotaCache } from '../services/quota'
import { getQuotaConfig } from '../services/tierConfig'
import { type UserTier } from '../lib/config'
import { ShareErrorCodes, CommonErrorCodes, QuotaErrorCodes, CollectionErrorCodes, errorResponse } from '../lib/errorCodes'
import { ensureHttps } from '../lib/utils'
import logger from '../lib/logger'
import { emitEvent } from '../lib/eventBus'
import { invalidateShareCache } from '../routes/public'
import { moderateShareTitle, moderateShareDescription } from '../services/contentModeration'
import { getPlatformConfig, generateDefaultCover } from '../services/platforms'

const router = Router()

// 检测分享访问来源
function detectSource(referer: string | null): string {
  if (!referer) return 'direct'
  try {
    const url = new URL(referer)
    const host = url.hostname.toLowerCase()
    if (host.includes('weixin') || host.includes('wechat')) return 'wechat'
    if (host.includes('weibo')) return 'weibo'
    if (host.includes('qq.com')) return 'qq'
    if (host.includes('douyin') || host.includes('tiktok')) return 'douyin'
    if (host.includes('xiaohongshu') || host.includes('xhslink')) return 'xiaohongshu'
    if (host.includes('bilibili')) return 'bilibili'
    if (url.searchParams.has('utm_source')) return url.searchParams.get('utm_source') || 'other'
    return 'other'
  } catch {
    return 'other'
  }
}

// 分享类型归一化：前端可能传入旧版别名，统一映射为标准存储类型
function normalizeShareType(type: string): string {
  const map: Record<string, string> = {
    LIST: 'MULTI_LIST', LISTS: 'MULTI_LIST',
    TAG: 'MULTI_TAG', TAGS: 'MULTI_TAG',
    COLLECTION: 'CUSTOM', COLLECTIONS: 'CUSTOM',
  }
  return map[type] || type
}

// 获取用户的分享链接
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const shares = await prisma.share.findMany({
      where: { userId },
      include: {
        list: { select: { name: true } },
        _count: {
          select: { shareItems: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      data: shares.map(share => ({
        id: share.id,
        userId: share.userId,
        type: share.type,
        listId: share.listId,
        tagId: share.tagId,
        title: share.title,
        description: share.description,
        hasPassword: !!share.password,
        password: share.passwordPlain || null,
        isActive: share.isActive,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        list: share.list,
        itemCount: share._count.shareItems,
        viewCount: share.viewCount,
        shareUrl: `${SHARE_BASE_URL}/s/${share.id}`,
      }))
    })
  } catch (error) {
    errorResponse(res, 500, ShareErrorCodes.SHARE_FETCH_FAILED)
  }
})

// 创建分享链接
router.post('/', authenticate, [
  body('type').isIn(['ALL', 'LIST', 'LISTS', 'TAG', 'TAGS', 'COLLECTION', 'COLLECTIONS', 'MULTI_TAG', 'MULTI_LIST', 'CUSTOM']).withMessage('无效的分享类型'),
  body('listId').optional().isUUID(),
  body('listIds').optional().isArray(),
  body('tagId').optional().isUUID(),
  body('tagIds').optional().isArray(),
  body('collectionIds').optional().isArray(),
  body('title').isLength({ min: 1, max: SHARE_TITLE_MAX_LENGTH }).withMessage(`标题1-${SHARE_TITLE_MAX_LENGTH}字符`),
  body('password').optional().isLength({ min: SHARE_PASSWORD_MIN_LENGTH, max: SHARE_PASSWORD_MAX_LENGTH }).withMessage(`密码${SHARE_PASSWORD_MIN_LENGTH}-${SHARE_PASSWORD_MAX_LENGTH}字符`),
  body('expiresIn').optional().isIn(['1h', '24h', '1w', 'never']).withMessage('无效的有效期'),
  body('description').optional().isLength({ max: SHARE_DESCRIPTION_MAX_LENGTH }).withMessage(`备注不超过${SHARE_DESCRIPTION_MAX_LENGTH}字`),
  body('coverImage').optional().isString().withMessage('封面图URL'),
  body('layout').optional().isIn(['grid', 'list', 'card']).withMessage('无效的布局'),
  body('includeRating').optional().isBoolean({ loose: true }).withMessage('includeRating 必须是布尔值'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { type, listId, listIds, tagId, tagIds, collectionIds, title, password, expiresIn, description, coverImage, layout, includeRating } = req.body
  const userId = req.user.id
  const normalizedType = normalizeShareType(type as string)

  try {
    // 内容安全审核（国内版）
    const titleCheck = await moderateShareTitle(title)
    if (!titleCheck.safe) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, '标题包含违规内容')
    }
    if (description) {
      const descCheck = await moderateShareDescription(description)
      if (!descCheck.safe) {
        return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, '描述包含违规内容')
      }
    }

    // 配额检查
    const quotaError = await checkQuota(userId, 'shares')
    if (quotaError) {
      return errorResponse(res, 403, quotaError)
    }

    // 等级特权检查：密码保护和有效期设置仅限专业版/旗舰版
    const limits = await getQuotaConfig((req.user.userTier || 'medium') as UserTier)
    if (password && !limits.sharePassword) {
      return errorResponse(res, 403, CollectionErrorCodes.COLLECTION_TIER_REQUIRED)
    }
    if (expiresIn && expiresIn !== 'never' && !limits.shareExpiry) {
      return errorResponse(res, 403, CollectionErrorCodes.COLLECTION_TIER_REQUIRED)
    }

    // 分享评分功能仅限专业版及以上
    const canShareRating = limits.shareRating ?? false
    const shouldIncludeRating = includeRating === true && canShareRating

    // 根据分享类型获取要分享的收藏（包含完整元数据 + tags 快照用于分享）
    const collectionSelect = {
      id: true, title: true, coverImage: true, platform: true, url: true, createdAt: true, rating: true,
      tags: { select: { nameCn: true, nameEn: true } },
    } as const
    let collections: {
      id: string; title: string; coverImage: string | null; platform: string; url: string; createdAt: Date; rating: Prisma.Decimal | null;
      tags: { nameCn: string; nameEn: string }[]
    }[] = []

    switch (normalizedType) {
      case 'ALL':
        collections = await prisma.collection.findMany({
          where: { userId, deletedAt: null },
          select: collectionSelect,
        })
        break
      case 'MULTI_LIST':
        if (!listIds || listIds.length === 0) {
          return errorResponse(res, 400, ShareErrorCodes.SHARE_LIST_IDS_REQUIRED)
        }
        collections = await prisma.collection.findMany({
          where: { userId, deletedAt: null, lists: { some: { id: { in: listIds } } } },
          select: collectionSelect,
        })
        break
      case 'MULTI_TAG':
        if (!tagIds || tagIds.length === 0) {
          return errorResponse(res, 400, ShareErrorCodes.SHARE_TAG_IDS_REQUIRED)
        }
        collections = await prisma.collection.findMany({
          where: { userId, deletedAt: null, tags: { some: { id: { in: tagIds } } } },
          select: collectionSelect,
        })
        break
      case 'CUSTOM':
        if (!collectionIds || collectionIds.length === 0) {
          return errorResponse(res, 400, ShareErrorCodes.SHARE_COLLECTION_IDS_REQUIRED)
        }
        collections = await prisma.collection.findMany({
          where: { userId, deletedAt: null, id: { in: collectionIds } },
          select: collectionSelect,
        })
        break
    }

    if (collections.length === 0) {
      return errorResponse(res, 400, ShareErrorCodes.SHARE_NO_COLLECTIONS)
    }

    // 检查单次分享容量上限
    const { limits: quotaLimits } = await getQuotaUsage(userId)
    if (collections.length > quotaLimits.maxItemsPerShare) {
      return errorResponse(res, 400, QuotaErrorCodes.SHARE_ITEMS_PER_SHARE_EXCEEDED, {
        limit: quotaLimits.maxItemsPerShare,
        actual: collections.length,
      })
    }

    // 按 URL 去重，避免违反 share_items 的 @@unique([shareId, url]) 约束
    const seenUrls = new Set<string>()
    const uniqueCollections = collections.filter(c => {
      if (seenUrls.has(c.url)) return false
      seenUrls.add(c.url)
      return true
    })

    // 查询用户上传的自定义封面（需要替换为品牌色封面）
    const uploadedCovers = await prisma.coverImage.findMany({
      where: {
        collectionId: { in: uniqueCollections.map(c => c.id) }
      },
      select: { collectionId: true }
    })
    const uploadedCoverIds = new Set(uploadedCovers.map(c => c.collectionId))

    // 计算过期时间
    let expiresAt: Date | null = null
    if (expiresIn && expiresIn !== 'never') {
      const now = new Date()
      switch (expiresIn) {
        case '1h': expiresAt = new Date(now.getTime() + 60 * 60 * 1000); break
        case '24h': expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); break
        case '1w': expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break
      }
    }

    // 密码哈希
    let passwordHash: string | null = null
    if (password) {
      passwordHash = await bcrypt.hash(password, 10)
    }

    // 创建分享
    const share = await prisma.share.create({
      data: {
        id: nanoid(10),
        userId,
        type: normalizedType,
        listId: normalizedType === 'MULTI_LIST' ? (listIds?.[0] || listId) : null,
        tagId: normalizedType === 'MULTI_TAG' ? (tagIds?.[0] || tagId) : null,
        title,
        password: passwordHash,
        passwordPlain: password || null,
        description: description || null,
        coverImage: coverImage || null,
        layout: layout || 'grid',
        // 已下线字段保留为默认值，兼容旧数据：isPlaza / allowSync / plazaTags
        expiresAt,
        shareItems: {
          create: uniqueCollections.map(c => {
            const isUserUpload = uploadedCoverIds.has(c.id)
            const coverImage = isUserUpload
              ? (() => {
                  const platform = getPlatformConfig(c.platform)
                  return platform ? generateDefaultCover(platform) : ensureHttps(c.coverImage)
                })()
              : ensureHttps(c.coverImage)
            return {
              collectionId: c.id,
              title: c.title,
              coverImage,
              platform: c.platform,
              url: c.url,
              originalCreatedAt: c.createdAt,
              tags: c.tags.map(t => ({ nameCn: t.nameCn, nameEn: t.nameEn })),
              rating: shouldIncludeRating && c.rating != null ? c.rating : null,
            }
          }),
        },
      },
      include: {
        shareItems: {
          include: {
            collection: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                platform: true,
                url: true,
              },
            },
          },
        },
      },
    })

    invalidateQuotaCache(userId).catch(() => {})

    // 发布分享创建事件
    emitEvent('share:created', {
      shareId: share.id,
      userId,
      itemCount: share.shareItems?.length || 0,
      hasPassword: !!passwordHash,
    })

    res.status(201).json({
      id: share.id,
      userId: share.userId,
      type: share.type,
      listId: share.listId,
      tagId: share.tagId,
      title: share.title,
      description: share.description,
      hasPassword: !!passwordHash,
      isActive: share.isActive,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      shareUrl: `${SHARE_BASE_URL}/s/${share.id}`,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.error({ err: errMsg, stack: error instanceof Error ? error.stack : undefined }, '创建分享错误')
    // 将 Prisma/数据库具体错误信息透传给前端，便于排查
    errorResponse(res, 500, ShareErrorCodes.SHARE_CREATE_FAILED, errMsg)
  }
})

// 删除分享链接
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    await prisma.share.deleteMany({
      where: { id, userId },
    })

    // 清除分享页缓存
    await invalidateShareCache(id)

    invalidateQuotaCache(userId).catch(() => {})

    res.json({ message: 'SHARE_DELETE_SUCCESS' })
  } catch (error) {
    errorResponse(res, 500, ShareErrorCodes.SHARE_DELETE_FAILED)
  }
})

// 分享来源分析（旗舰版专享）
router.get('/:id/analytics', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    // 等级检查：旗舰版
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { userTier: true } })
    const tier = (user?.userTier as string) || 'medium'
    if (tier !== 'super') {
      return errorResponse(res, 403, CollectionErrorCodes.COLLECTION_TIER_REQUIRED)
    }

    // 验证分享所有权
    const share = await prisma.share.findFirst({ where: { id, userId } })
    if (!share) {
      return errorResponse(res, 404, ShareErrorCodes.SHARE_NOT_FOUND)
    }

    // 按来源分组统计
    const views = await prisma.shareView.findMany({
      where: { shareId: id },
      select: { source: true, createdAt: true },
    })

    // 来源分布
    const sourceStats: Record<string, number> = {}
    for (const v of views) {
      const source = v.source || 'direct'
      sourceStats[source] = (sourceStats[source] || 0) + 1
    }

    // 按日期统计（最近 30 天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyViews: Record<string, number> = {}
    for (const v of views) {
      if (v.createdAt >= thirtyDaysAgo) {
        const date = v.createdAt.toISOString().slice(0, 10)
        dailyViews[date] = (dailyViews[date] || 0) + 1
      }
    }

    res.json({
      data: {
        totalViews: views.length,
        sourceStats,
        dailyViews,
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取分享分析错误')
    errorResponse(res, 500, ShareErrorCodes.SHARE_FETCH_FAILED)
  }
})

// 切换分享状态
router.put('/:id/toggle', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const share = await prisma.share.findFirst({
      where: { id, userId },
    })

    if (!share) {
      return errorResponse(res, 404, ShareErrorCodes.SHARE_NOT_FOUND)
    }

    const updated = await prisma.share.update({
      where: { id },
      data: { isActive: !share.isActive },
    })

    // 停用分享时清除缓存，重新启用时下次访问会重新写入缓存
    if (!updated.isActive) {
      await invalidateShareCache(id)
    }

    res.json(updated)
  } catch (error) {
    errorResponse(res, 500, ShareErrorCodes.SHARE_TOGGLE_FAILED)
  }
})

// 获取分享明文密码（按需接口，仅创建者可访问）
router.get('/:id/password', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const share = await prisma.share.findFirst({
      where: { id, userId },
      select: { passwordPlain: true },
    })

    if (!share) {
      return errorResponse(res, 404, ShareErrorCodes.SHARE_NOT_FOUND)
    }

    res.json({ password: share.passwordPlain || null })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error), shareId: id }, '获取分享密码错误')
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

// 调整分享有效期
router.put('/:id/expires', authenticate, [
  body('expiresIn').isIn(['1h', '24h', '1w', 'never']).withMessage('无效的有效期'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { id } = req.params
  const { expiresIn } = req.body
  const userId = req.user.id

  try {
    // 等级特权检查
    const limits = await getQuotaConfig((req.user.userTier || 'medium') as UserTier)
    if (expiresIn !== 'never' && !limits.shareExpiry) {
      return errorResponse(res, 403, CollectionErrorCodes.COLLECTION_TIER_REQUIRED)
    }

    const share = await prisma.share.findFirst({
      where: { id, userId },
    })

    if (!share) {
      return errorResponse(res, 404, ShareErrorCodes.SHARE_NOT_FOUND)
    }

    // 计算新的过期时间
    let expiresAt: Date | null = null
    if (expiresIn !== 'never') {
      const now = new Date()
      switch (expiresIn) {
        case '1h': expiresAt = new Date(now.getTime() + 60 * 60 * 1000); break
        case '24h': expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); break
        case '1w': expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break
      }
    }

    const updated = await prisma.share.update({
      where: { id },
      data: { expiresAt },
    })

    // 清除缓存（因为公开数据包含 expiresAt）
    await invalidateShareCache(id)

    res.json({
      id: updated.id,
      expiresAt: updated.expiresAt,
      message: '有效期已更新',
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error), shareId: id }, '更新分享有效期错误')
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR)
  }
})

// ===== 分享广场（已下线） =====
// [DISABLED] 广场功能下线，路由注释保留以备后续恢复
// router.get('/plaza', authenticate, [ ... ])

// 记录分享浏览（UV统计，仅登录用户）
router.post('/:id/view', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    // 检查是否已记录
    const existing = await prisma.shareView.findUnique({
      where: { shareId_userId: { shareId: id, userId } },
    })

    if (!existing) {
      await prisma.$transaction([
        prisma.shareView.create({
          data: {
            shareId: id,
            userId,
            referer: req.headers.referer || null,
            source: detectSource(req.headers.referer || null),
          },
        }),
        prisma.share.update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        }),
      ])
    }

    res.json({ success: true })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '记录浏览错误')
    errorResponse(res, 500, ShareErrorCodes.SHARE_VIEW_RECORD_FAILED)
  }
})

export default router
