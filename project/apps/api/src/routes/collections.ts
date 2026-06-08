import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'
import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { DEFAULT_LIST_KEY, DEFAULT_LIST_DESC } from '../lib/config'
import { detectPlatform, getSupportedPlatformList } from '../services/platforms'
import { classifyUrl } from '../services/pageClassifier'
import { fetchUrlMetadata } from '../services/metadata'
import { parseShareInput } from '../services/share-parser'
import { checkQuota, checkQuotaBatch, invalidateQuotaCache } from '../services/quota'
import { enqueueMetadataFetch } from '../services/metadata-queue'
import { recordCollectionCreated } from '../services/prom-metrics'
import { emitEvent } from '../lib/eventBus'
import { moderateCollectionTitle, moderateCollectionNote, moderateCollectionUrl, moderateCollectionTag } from '../services/contentModeration'

import fetch from 'node-fetch'
import { CollectionErrorCodes, ListErrorCodes, CommonErrorCodes, UploadErrorCodes, QuotaErrorCodes, errorResponse } from '../lib/errorCodes'
import { sanitizeCollection, ensureHttps } from '../lib/utils'
import logger from '../lib/logger'
import { isURL } from 'validator'

// ===== HTML 导入/导出辅助函数 =====

/**
 * 解析 Netscape Bookmark Format HTML
 * 返回扁平化的收藏列表，带 listName（超过3层扁平化到第3层）
 */
function parseBookmarkHtml(html: string): { url: string; title: string; listName: string | null; coverImage?: string }[] {
  const results: { url: string; title: string; listName: string | null; coverImage?: string }[] = []
  const folderStack: { name: string; depth: number }[] = []
  let dlDepth = 0

  for (const rawLine of html.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (/<DL>/i.test(line)) {
      dlDepth++
      continue
    }
    if (/<\/DL>/i.test(line)) {
      dlDepth = Math.max(0, dlDepth - 1)
      while (folderStack.length > 0 && folderStack[folderStack.length - 1].depth > dlDepth) {
        folderStack.pop()
      }
      continue
    }

    const h3Match = line.match(/<H3[^>]*>(.*?)<\/H3>/i)
    if (h3Match) {
      const name = h3Match[1].replace(/<[^>]+>/g, '').trim()
      if (!name) continue
      if (folderStack.length >= 3) {
        folderStack[2] = { name, depth: dlDepth }
      } else {
        folderStack.push({ name, depth: dlDepth })
      }
      continue
    }

    const aMatch = line.match(/<A\s+([^>]*)>(.*?)<\/A>/i)
    if (aMatch) {
      const attrs = aMatch[1]
      const title = aMatch[2].replace(/<[^>]+>/g, '').trim()
      
      const hrefMatch = attrs.match(/HREF=["']([^"']+)["']/i)
      const url = hrefMatch ? hrefMatch[1].trim() : ''
      
      const iconMatch = attrs.match(/ICON=["']([^"']+)["']/i)
      const coverImage = iconMatch ? iconMatch[1].trim() : undefined

      if (url && url.startsWith('http')) {
        const listName = folderStack.length > 0 ? folderStack[folderStack.length - 1].name : null
        results.push({ url, title, listName, coverImage })
      }
    }
  }

  return results
}

/**
 * 生成 Netscape Bookmark Format HTML
 */
function generateBookmarkHtml(collections: { id: string; title: string; url: string; coverImage?: string | null; createdAt: Date; lists: { name: string }[] }[], lists: { name: string }[], includeCover: boolean = false): string {
  // 按列表分组
  const byList = new Map<string, typeof collections>()
  const noList: typeof collections = []

  for (const c of collections) {
    if (c.lists && c.lists.length > 0) {
      for (const l of c.lists) {
        if (!byList.has(l.name)) byList.set(l.name, [])
        byList.get(l.name)!.push(c)
      }
    } else {
      noList.push(c)
    }
  }

  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ]

  // 无分组的收藏
  if (noList.length > 0) {
    lines.push('    <DT><H3>Ungrouped</H3>')
    lines.push('    <DL><p>')
    for (const c of noList) {
      const addDate = Math.floor(c.createdAt.getTime() / 1000)
      const coverAttr = (includeCover && c.coverImage) ? ` ICON="${escapeHtml(c.coverImage)}"` : ''
      lines.push(`        <DT><A HREF="${escapeHtml(c.url)}" ADD_DATE="${addDate}"${coverAttr}>${escapeHtml(c.title || 'Untitled')}</A>`)
    }
    lines.push('    </DL><p>')
  }

  // 有分组的收藏
  for (const [listName, items] of byList) {
    lines.push(`    <DT><H3>${escapeHtml(listName)}</H3>`)
    lines.push('    <DL><p>')
    for (const c of items) {
      const addDate = Math.floor(c.createdAt.getTime() / 1000)
      lines.push(`        <DT><A HREF="${escapeHtml(c.url)}" ADD_DATE="${addDate}">${escapeHtml(c.title || '无标题')}</A>`)
    }
    lines.push('    </DL><p>')
  }

  lines.push('</DL><p>')
  return lines.join('\n')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const router = Router()

// 注意：分组筛选只匹配直接关联的收藏，不包含子分组中的收藏
// 每个分组只展示属于该分组自身的收藏

/**
 * 构建收藏查询的 where 条件（复用于 offset 分页和游标分页）
 */
async function buildCollectionWhere(
  userId: string,
  filters: {
    tagId?: string
    listId?: string
    directListId?: string
    platform?: string
    platforms?: string
    search?: string
    hasRating?: string
  }
): Promise<Prisma.CollectionWhereInput> {
  const where: Prisma.CollectionWhereInput = { userId, deletedAt: null }

  if (filters.tagId) {
    where.tags = { some: { id: filters.tagId } }
  }

  if (filters.platform) {
    where.platform = filters.platform
  }

  if (filters.platforms) {
    const platformArray = filters.platforms.split(',').filter(Boolean)
    if (platformArray.length > 0) {
      where.platform = { in: platformArray }
    }
  }

  if (filters.listId) {
    const allLists = await prisma.list.findMany({
      where: { userId },
      select: { id: true, parentId: true },
    })

    const childrenMap = new Map<string, string[]>()
    for (const list of allLists) {
      if (list.parentId) {
        if (!childrenMap.has(list.parentId)) childrenMap.set(list.parentId, [])
        childrenMap.get(list.parentId)!.push(list.id)
      }
    }

    function collectDescendants(id: string): string[] {
      const ids = [id]
      const children = childrenMap.get(id) || []
      for (const childId of children) {
        ids.push(...collectDescendants(childId))
      }
      return ids
    }

    const allListIds = collectDescendants(filters.listId)
    where.lists = { some: { id: { in: allListIds } } }
  }

  if (filters.directListId) {
    where.lists = { some: { id: filters.directListId } }
  }

  if (filters.hasRating === 'true') {
    where.rating = { not: null }
  } else if (filters.hasRating === 'false') {
    where.rating = null
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { note: { contains: filters.search, mode: 'insensitive' } },
      { url: { contains: filters.search, mode: 'insensitive' } },
      { platform: { contains: filters.search, mode: 'insensitive' } },
      { tags: { some: { name: { contains: filters.search, mode: 'insensitive' } } } },
      { lists: { some: { name: { contains: filters.search, mode: 'insensitive' } } } },
    ]
  }

  return where
}

/**
 * 构建排序条件，支持按评分排序且 null 始终在最后
 */
function buildCollectionOrderBy(sortBy: string, sortOrder: string): Prisma.CollectionOrderByWithRelationInput[] {
  const order: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

  if (sortBy === 'rating') {
    // 按评分排序：有评分的按评分值排序，无评分（null）始终在最后
    return [
      { rating: { sort: order, nulls: 'last' } },
      { createdAt: 'desc' },
    ]
  }

  return [{ createdAt: order }]
}

// 获取收藏（Offset 分页 - 兼容旧接口）
router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 2000 }),
  query('tagId').optional().isUUID(),
  query('listId').optional().isUUID(),
  query('directListId').optional().isUUID(),
  query('platform').optional().isString(),
  query('platforms').optional().isString(),
  query('search').optional().isString(),
  query('hasRating').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['createdAt', 'rating']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const q = req.query as { page?: string; limit?: string; tagId?: string; listId?: string; directListId?: string; platform?: string; platforms?: string; search?: string; hasRating?: string; sortBy?: string; sortOrder?: string }
  const page = Number(q.page) || 1
  const limit = Number(q.limit) || 20
  const userId = req.user.id
  const sortBy = q.sortBy || 'createdAt'
  const sortOrder = q.sortOrder || 'desc'

  try {
    const where = await buildCollectionWhere(userId, {
      tagId: q.tagId,
      listId: q.listId,
      directListId: q.directListId,
      platform: q.platform,
      platforms: q.platforms,
      search: q.search,
      hasRating: q.hasRating,
    })

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          tags: { select: { id: true, name: true } },
          lists: { select: { id: true, name: true } },
        },
        orderBy: buildCollectionOrderBy(sortBy, sortOrder),
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.collection.count({ where }),
    ])

    res.json({
      data: collections.map(sanitizeCollection),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取收藏错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_FETCH_FAILED)
  }
})

// 获取收藏 V2（游标分页 - 高性能）
router.get('/v2', authenticate, [
  query('cursor').optional().isUUID().withMessage('cursor 必须是有效的 UUID'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('tagId').optional().isUUID(),
  query('listId').optional().isUUID(),
  query('directListId').optional().isUUID(),
  query('platform').optional().isString(),
  query('platforms').optional().isString(),
  query('search').optional().isString(),
  query('hasRating').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['createdAt', 'rating']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const q = req.query as { cursor?: string; limit?: string; tagId?: string; listId?: string; directListId?: string; platform?: string; platforms?: string; search?: string; hasRating?: string; sortBy?: string; sortOrder?: string }
  const cursor = q.cursor
  const limit = Math.min(Number(q.limit) || 40, 100)
  const userId = req.user.id
  const sortBy = q.sortBy || 'createdAt'
  const sortOrder = q.sortOrder || 'desc'

  try {
    const where = await buildCollectionWhere(userId, {
      tagId: q.tagId,
      listId: q.listId,
      directListId: q.directListId,
      platform: q.platform,
      platforms: q.platforms,
      search: q.search,
      hasRating: q.hasRating,
    })

    // 游标分页：多取一条用于判断 hasMore
    const collections = await prisma.collection.findMany({
      where,
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
      orderBy: buildCollectionOrderBy(sortBy, sortOrder),
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1,
    })

    const hasMore = collections.length > limit
    const data = hasMore ? collections.slice(0, limit) : collections
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined

    res.json({
      data: data.map(sanitizeCollection),
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取收藏 V2 错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_FETCH_FAILED)
  }
})

// 添加收藏
router.post('/', authenticate, [
  body('url').custom((value) => {
    const processed = ensureHttps(value)
    return !!processed && isURL(processed)
  }).withMessage('请输入有效的URL'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('标题不能为空且不超过200字符'),
  body('note').optional().isLength({ max: 100 }).withMessage('备注不超过100字符'),
  body('rating').optional().isFloat({ min: 0.5, max: 5 }).withMessage('评分需在 0.5-5 之间'),
  body('tagIds').optional().isArray(),
  body('listIds').optional().isArray({ max: 1 }).withMessage('一个收藏只能属于一个分组'),
  body('coverStrategy').optional().isIn(['url', 'brand', 'ai']).withMessage('封面策略只能是 url、brand 或 ai'),
  body('pageType').optional().isIn(['home', 'detail', 'list', 'search', 'navigation', 'document', 'download', 'other']).withMessage('页面类型不正确'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { url, title, coverImage, note, rating, tagIds = [], listIds = [], coverStrategy, pageType } = req.body
  const userId = req.user.id
  const platform = detectPlatform(url)

  try {
    // 内容安全审核（国内版）
    const titleCheck = await moderateCollectionTitle(title)
    if (!titleCheck.safe) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, '标题包含违规内容')
    }
    if (note) {
      const noteCheck = await moderateCollectionNote(note)
      if (!noteCheck.safe) {
        return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, '备注包含违规内容')
      }
    }
    // 审核 URL 本身(检查是否含恶意域/违规内容)
    const urlCheck = await moderateCollectionUrl(url)
    if (!urlCheck.safe) {
      return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, '链接包含违规内容')
    }
    // 审核 tagIds 关联的 tag 名称
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      const tagRecords = await prisma.tag.findMany({
        where: { id: { in: tagIds }, userId },
        select: { id: true, name: true },
      })
      for (const tag of tagRecords) {
        const tagCheck = await moderateCollectionTag(tag.name, tag.id)
        if (!tagCheck.safe) {
          return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED,
            `标签 "${tag.name}" 包含违规内容`)
        }
      }
    }

    // 配额检查
    const quotaError = await checkQuota(userId, 'collections')
    if (quotaError) {
      return errorResponse(res, 403, quotaError)
    }

    // 确保用户有默认分组
    // 分组唯一性限制：一个收藏只能属于一个分组，只取第一个 listId
    let defaultListIds = [...listIds]
    if (defaultListIds.length > 1) {
      defaultListIds = [defaultListIds[0]]
    }
    if (defaultListIds.length === 0) {
      let defaultList = await prisma.list.findFirst({
        where: { userId, name: DEFAULT_LIST_KEY },
      })
      if (!defaultList) {
        // 兼容旧数据
        defaultList = await prisma.list.findFirst({
          where: { userId, name: '我的收藏' },
        })
      }
      if (!defaultList) {
        defaultList = await prisma.list.create({
          data: { userId, name: DEFAULT_LIST_KEY, description: DEFAULT_LIST_DESC },
        })
      }
      defaultListIds = [defaultList.id]
    }

    const collection = await prisma.collection.create({
      data: {
        userId,
        url,
        title,
        coverImage,
        coverStrategy: coverStrategy || 'brand',
        platform,
        pageType,
        note,
        rating: rating !== undefined && rating !== null ? new Prisma.Decimal(rating) : null,
        tags: tagIds.length > 0 ? { connect: tagIds.map((id: string) => ({ id })) } : undefined,
        lists: { connect: defaultListIds.map((id: string) => ({ id })) },
      },
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
    })

    // 根据封面策略决定是否触发元数据抓取
    const shouldFetchMetadata = (() => {
      if (!url) return false
      if (coverStrategy === 'brand') return false
      if (coverStrategy === 'ai') return false
      return !title || !coverImage
    })()
    
    if (shouldFetchMetadata) {
      enqueueMetadataFetch({ collectionId: collection.id, url, userId })
    }

    invalidateQuotaCache(userId).catch(() => {})
    recordCollectionCreated(platform)

    res.status(201).json({ data: collection })
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    logger.error({ err: details }, '添加收藏错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_CREATE_FAILED, details)
  }
})

// 批量删除（必须在 /:id 之前注册）
router.post('/batch-delete', authenticate, [
  body('ids').isArray({ min: 1 }).withMessage('请提供要删除的ID'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { ids } = req.body
  const userId = req.user.id

  try {
    // 软删除：批量设置 deletedAt
    await prisma.collection.updateMany({
      where: { id: { in: ids }, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })

    invalidateQuotaCache(userId).catch(() => {})

    res.json({ message: '批量删除成功', count: ids.length })
  } catch (error) {
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_BATCH_DELETE_FAILED)
  }
})

// ===== 回收站 API =====

// 获取回收站列表
router.get('/trash', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 20

  try {
    const where: Prisma.CollectionWhereInput = { userId, deletedAt: { not: null } }

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          tags: { select: { id: true, name: true } },
          lists: { select: { id: true, name: true } },
        },
        orderBy: { deletedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.collection.count({ where }),
    ])

    res.json({
      data: collections.map(sanitizeCollection),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取回收站错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_TRASH_FETCH_FAILED)
  }
})

// 批量恢复收藏
router.post('/trash/restore', authenticate, [
  body('ids').isArray({ min: 1 }).withMessage('请提供要恢复的ID'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { ids } = req.body
  const userId = req.user.id

  try {
    // 验证这些收藏确实在回收站中且属于当前用户
    const inTrash = await prisma.collection.findMany({
      where: { id: { in: ids }, userId, deletedAt: { not: null } },
      select: { id: true },
    })

    if (inTrash.length === 0) {
      return errorResponse(res, 404, CollectionErrorCodes.COLLECTION_NOT_IN_TRASH)
    }

    // 配额检查：恢复的收藏不能超出配额
    const currentCount = await prisma.collection.count({
      where: { userId, deletedAt: null },
    })
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { userTier: true } })
    const tier = (user?.userTier as 'medium' | 'heavy' | 'super') || 'medium'
    const { getQuotaConfig } = await import('../services/tierConfig')
    const limits = await getQuotaConfig(tier)
    const limit = limits.collections

    if (currentCount + inTrash.length > limit) {
      return errorResponse(res, 403, QuotaErrorCodes.QUOTA_COLLECTIONS_EXCEEDED)
    }

    // 恢复：清除 deletedAt
    await prisma.collection.updateMany({
      where: { id: { in: inTrash.map(c => c.id) } },
      data: { deletedAt: null },
    })

    invalidateQuotaCache(userId).catch(() => {})

    res.json({ message: '恢复成功', count: inTrash.length })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '恢复收藏错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_TRASH_RESTORE_FAILED)
  }
})

// 彻底删除（从回收站永久删除）
router.delete('/trash/purge', authenticate, [
  body('ids').isArray({ min: 1 }).withMessage('请提供要彻底删除的ID'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { ids } = req.body
  const userId = req.user.id

  try {
    // 只允许删除在回收站中的收藏
    const inTrash = await prisma.collection.findMany({
      where: { id: { in: ids }, userId, deletedAt: { not: null } },
      select: { id: true },
    })

    if (inTrash.length === 0) {
      return errorResponse(res, 404, CollectionErrorCodes.COLLECTION_NOT_IN_TRASH)
    }

    // 物理删除
    await prisma.collection.deleteMany({
      where: { id: { in: inTrash.map(c => c.id) } },
    })

    invalidateQuotaCache(userId).catch(() => {})

    res.json({ message: '已彻底删除', count: inTrash.length })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '彻底删除错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_TRASH_PURGE_FAILED)
  }
})

// 批量添加标签（必须在 /:id 之前注册）
router.post('/batch-add-tags', authenticate, [
  body('collectionIds').isArray({ min: 1 }),
  body('tagIds').isArray({ min: 1 }),
], async (req: AuthenticatedRequest, res) => {
  const { collectionIds, tagIds } = req.body
  const userId = req.user.id

  try {
    // 校验所有 tagIds 必须属于当前用户
    const ownedTags = await prisma.tag.findMany({
      where: { id: { in: tagIds }, userId },
      select: { id: true },
    })
    const ownedTagIds = new Set(ownedTags.map(t => t.id))
    const unauthorizedTagIds = tagIds.filter((id: string) => !ownedTagIds.has(id))
    if (unauthorizedTagIds.length > 0) {
      return errorResponse(res, 403, CollectionErrorCodes.COLLECTION_UNAUTHORIZED_TAG)
    }

    await prisma.$transaction(
      collectionIds.map((collectionId: string) =>
        prisma.collection.update({
          where: { id: collectionId, userId },
          data: {
            tags: { connect: tagIds.map((id: string) => ({ id })) },
          },
        })
      )
    )

    res.json({ message: '批量添加标签成功' })
  } catch (error) {
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_BATCH_ADD_TAGS_FAILED)
  }
})

// 批量移动收藏到指定分组（必须在 /:id 之前注册）
router.post('/batch-move-lists', authenticate, [
  body('collectionIds').isArray({ min: 1 }).withMessage('请选择收藏'),
  body('listId').isUUID().withMessage('请提供有效的分组ID'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { collectionIds, listId } = req.body
  const userId = req.user.id

  try {
    // 验证目标分组存在且属于当前用户
    const targetList = await prisma.list.findFirst({
      where: { id: listId, userId },
    })
    if (!targetList) {
      return errorResponse(res, 404, ListErrorCodes.LIST_NOT_FOUND)
    }

    // 由于 Prisma updateMany 不支持关系字段，使用 transaction 逐个更新
    await prisma.$transaction(
      collectionIds.map((collectionId: string) =>
        prisma.collection.update({
          where: { id: collectionId, userId },
          data: { lists: { set: [{ id: listId }] } },
        })
      )
    )

    res.json({ message: '批量移动成功', count: collectionIds.length })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '批量移动分组错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_BATCH_UPDATE_FAILED)
  }
})

// 批量更新收藏（必须在 /:id 之前注册）
router.post('/batch-update', authenticate, [
  body('collectionIds').isArray({ min: 1 }).withMessage('请选择收藏'),
  body('tagIds').optional().isArray(),
  body('listId').optional().isUUID(),
  body('rating').optional().isFloat({ min: 0.5, max: 5 }).withMessage('评分需在 0.5-5 之间'),
  body('removeTagIds').optional().isArray(),
  body('removeListId').optional().isBoolean(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { collectionIds, tagIds, listId, rating, removeTagIds, removeListId } = req.body
  const userId = req.user.id

  try {
    // 处理移除标签：先读取当前标签，再移除指定的标签
    if (removeTagIds && removeTagIds.length > 0) {
      for (const collectionId of collectionIds) {
        const collection = await prisma.collection.findFirst({
          where: { id: collectionId, userId },
          select: { tags: { select: { id: true } } },
        })
        if (collection) {
          const remainingTagIds = collection.tags
            .map(t => t.id)
            .filter(id => !removeTagIds.includes(id))
          await prisma.collection.update({
            where: { id: collectionId },
            data: { tags: { set: remainingTagIds.map(id => ({ id })) } },
          })
        }
      }
    }

    // 处理移除分组：先分配到默认分组，再移除
    if (removeListId) {
      let defaultList = await prisma.list.findFirst({ where: { userId, name: DEFAULT_LIST_KEY } })
      if (!defaultList) {
        // 兼容旧数据
        defaultList = await prisma.list.findFirst({ where: { userId, name: '我的收藏' } })
      }
      if (!defaultList) {
        defaultList = await prisma.list.create({ data: { userId, name: DEFAULT_LIST_KEY, description: DEFAULT_LIST_DESC } })
      }
      for (const collectionId of collectionIds) {
        await prisma.collection.update({
          where: { id: collectionId },
          data: { lists: { set: [{ id: defaultList.id }] } },
        })
      }
    }

    // 处理设置标签/分组/评分（非移除操作）
    if (tagIds !== undefined || listId !== undefined || rating !== undefined) {
      await prisma.$transaction(
        collectionIds.map((collectionId: string) => {
          const updateData: Prisma.CollectionUpdateInput = {}
          if (tagIds !== undefined) {
            updateData.tags = { set: tagIds.map((id: string) => ({ id })) }
          }
          if (listId !== undefined) {
            updateData.lists = { set: [{ id: listId }] }
          }
          if (rating !== undefined) {
            updateData.rating = rating === null ? null : new Prisma.Decimal(rating)
          }
          return prisma.collection.update({
            where: { id: collectionId },
            data: updateData,
          })
        })
      )
    }

    invalidateQuotaCache(userId).catch(() => {})

    res.json({ message: '批量更新成功' })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '批量更新错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_BATCH_UPDATE_FAILED)
  }
})

// 页面类型自动分类（必须在 /:id 之前注册）
router.post('/classify', authenticate, [
  body('url').isURL().withMessage('请输入有效的URL'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { url, platform } = req.body
  const result = classifyUrl(url, platform)
  res.json({ data: result })
})

// 智能解析（统一入口，必须在 /:id 之前注册）
// 自动判断输入是标准URL还是分享文本，串联提取→还原→抓取metadata
router.post('/smart-parse', authenticate, [
  body('input').isString().withMessage('请输入链接或分享文本'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { input } = req.body
  const allSteps: { step: string; status: string; detail?: string }[] = []

  try {
    // 1. 解析分享文本/URL
    const parseResult = await parseShareInput(input)
    allSteps.push(...parseResult.steps)

    if (!parseResult.url) {
      return errorResponse(res, 400, CollectionErrorCodes.COLLECTION_SMART_PARSE_FAILED)
    }

    // 2. 用还原后的URL抓取metadata
    allSteps.push({ step: '抓取页面元数据', status: 'success', detail: `开始抓取 ${parseResult.url}` })
    const metadata = await fetchUrlMetadata(parseResult.url)

    // 3. 合并标题：优先使用 OG:title，其次使用从文本提取的标题
    let finalTitle = metadata.title || parseResult.textTitle || ''
    if (metadata.title && parseResult.textTitle && metadata.title !== parseResult.textTitle) {
      // OG标题通常是更完整的标题
      allSteps.push({ step: '标题合并', status: 'success', detail: `OG标题: "${metadata.title}"，文本标题: "${parseResult.textTitle}"，使用OG标题` })
    }

    // 4. 封面：metadata抓取，无封面时返回null（前端使用平台渐变色）
    const coverImage = metadata.coverImage || null
    if (!coverImage) {
      allSteps.push({ step: '封面获取', status: 'info', detail: 'OG:image未获取到，将使用平台渐变色封面' })
    } else {
      allSteps.push({ step: '封面获取', status: 'success', detail: '从页面获取到封面图片' })
    }

    res.json({
      data: {
        url: parseResult.url,
        originalUrl: parseResult.originalUrl,
        title: finalTitle,
        coverImage,
        platform: parseResult.platform,
        favicon: metadata.favicon,
        description: metadata.description,
      },
      steps: allSteps,
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '智能解析错误')
    return errorResponse(res, 500, CollectionErrorCodes.COLLECTION_SMART_PARSE_FAILED)
  }
})



// 解析URL元数据（必须在 /:id 之前注册）
router.post('/parse-url', authenticate, [
  body('url').custom((value) => {
    const processed = ensureHttps(value)
    // 使用更宽松的 URL 验证，支持各种平台链接
    return !!processed && (isURL(processed) || /^https?:\/\/.+/.test(processed))
  }).withMessage('请输入有效的URL'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { url } = req.body
  const platform = detectPlatform(url)

  try {
    const metadata = await fetchUrlMetadata(url)
    res.json({
      data: {
        platform,
        title: metadata.title || '',
        coverImage: metadata.coverImage || null,
        favicon: metadata.favicon || null,
      }
    })
  } catch (error) {
    // 抓取失败仍返回平台信息，前端兜底展示
    res.json({
      data: {
        platform,
        title: '',
        coverImage: null,
        favicon: null,
      }
    })
  }
})

// 兼容旧版本前端调用（/parse -> /parse-url）
router.post('/parse', authenticate, [
  body('url').custom((value) => {
    const processed = ensureHttps(value)
    return !!processed && (isURL(processed) || /^https?:\/\/.+/.test(processed))
  }).withMessage('请输入有效的URL'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { url } = req.body
  const platform = detectPlatform(url)

  try {
    const metadata = await fetchUrlMetadata(url)
    res.json({
      data: {
        platform,
        title: metadata.title || '',
        coverImage: metadata.coverImage || null,
        favicon: metadata.favicon || null,
      }
    })
  } catch (error) {
    res.json({
      data: {
        platform,
        title: '',
        coverImage: null,
        favicon: null,
      }
    })
  }
})

// 直接获取页面内容（用于前端绕过 Cloudflare Worker 失败的情况）
router.post('/fetch-url', authenticate, [
  body('url').custom((value) => {
    const processed = ensureHttps(value)
    return !!processed && (isURL(processed) || /^https?:\/\/.+/.test(processed))
  }).withMessage('请输入有效的URL'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { url } = req.body

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return res.json({ data: { title: '', coverImage: null } })
    }

    const html = await response.text()

    let title = ''
    let coverImage = null

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)
    if (ogTitleMatch) {
      title = ogTitleMatch[1]
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]*?)<\/title>/i)
      if (titleMatch) {
        title = titleMatch[1].trim()
      }
    }

    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)
    if (ogImageMatch) {
      coverImage = ogImageMatch[1]
    }

    res.json({
      data: {
        title: title || '',
        coverImage: coverImage || null,
      }
    })
  } catch (error) {
    res.json({ data: { title: '', coverImage: null } })
  }
})

// 从混合文本中提取URL（必须在 /:id 之前注册）
router.post('/extract-url', authenticate, [
  body('text').isString().withMessage('请输入文本内容'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { text } = req.body

  try {
    // 1. 从文本中提取所有URL（更宽松的正则，匹配各种链接格式）
    const urlRegex = /https?:\/\/[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\uff08\uff09\uff1a\uff1b\uff0c\uff0e\uff1f]+|www\.[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\uff08\uff09\uff1a\uff1b\uff0c\uff0e\uff1f]+/gi
    let urls = text.match(urlRegex) || []
    
    // 也尝试匹配不带前缀的常见域名
    if (urls.length === 0) {
      const domainRegex = /[a-z0-9-]+\.(com|cn|net|org|io|cc|tv|fm|me|app|dev|top|vip|shop)[\/\?][^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]*/gi
      const domainMatches = text.match(domainRegex) || []
      urls = domainMatches.map(d => d.startsWith('http') ? d : `https://${d}`)
    }

    if (urls.length === 0) {
      return errorResponse(res, 400, CollectionErrorCodes.COLLECTION_EXTRACT_URL_FAILED)
    }

    // 2. 取第一个URL，清理尾部特殊字符
    let cleanUrl = urls[0].replace(/[)\]}>.,;:!?'"，。；：！？、」』】〕》"'…—～~]+$/, '')

    // 3. 尝试还原短链（HEAD请求获取302重定向的真实URL）
    const shortLinkDomains = ['v.douyin.com', 'b23.tv', 'xhslink.com', 'm.tb.cn', 't.cn', 'dwz.cn', 'url.cn']
    let resolvedUrl = cleanUrl
    try {
      const urlHost = new URL(cleanUrl).hostname
      if (shortLinkDomains.some(d => urlHost.includes(d))) {
        const response = await fetch(cleanUrl, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(5000),
        })
        if (response.url && response.url !== cleanUrl) {
          resolvedUrl = response.url
        }
      }
    } catch {
      // 短链还原失败，使用原始URL
    }

    // 4. 从文本中提取标题（去除平台模板文字）
    const templatePatterns = [
      /复制打开[\s\S]*?[，,]/g,
      /【[\s\S]*?】/g,
      /点击链接[\s\S]*?[，,]/g,
      /长按复制[\s\S]*?[，,]/g,
      /分享[^\n]*?[到给][^\n]*?[，,]/g,
    ]
    let title = text.replace(urlRegex, '').trim()
    for (const pattern of templatePatterns) {
      title = title.replace(pattern, '').trim()
    }
    title = title.replace(/^[\s\d.:/\\]+/, '').trim()
    if (title.length > 100) title = title.substring(0, 100)

    // 5. 识别平台
    const platform = detectPlatform(resolvedUrl)

    res.json({
      data: {
        url: resolvedUrl,
        originalUrl: cleanUrl !== resolvedUrl ? cleanUrl : undefined,
        title: title || undefined,
        platform,
      }
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '提取URL错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_EXTRACT_URL_FAILED)
  }
})

// 去重检查（必须在 /:id 之前注册）
router.post('/check-duplicate', authenticate, [
  body('url').optional().isURL().withMessage('请输入有效的URL'),
  body('title').optional().isString(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { url, title } = req.body
  const userId = req.user.id

  try {
    const result: { duplicateUrl: boolean; duplicateTitle: boolean; urlCollection: { id: string; title: string; platform: string; createdAt: Date } | null; titleCollection: { id: string; title: string; platform: string; createdAt: Date } | null; duplicate?: boolean; collection?: { id: string; title: string; platform: string; createdAt: Date } | null } = { duplicateUrl: false, duplicateTitle: false, urlCollection: null, titleCollection: null }

    if (url) {
      const existing = await prisma.collection.findFirst({
        where: { userId, url, deletedAt: null },
        select: { id: true, title: true, platform: true, createdAt: true },
      })
      result.duplicateUrl = !!existing
      result.urlCollection = existing
      // 保持向后兼容
      result.duplicate = !!existing
      result.collection = existing
    }

    if (title) {
      const existing = await prisma.collection.findFirst({
        where: { userId, title, deletedAt: null },
        select: { id: true, title: true, platform: true, createdAt: true },
      })
      result.duplicateTitle = !!existing
      result.titleCollection = existing
    }

    res.json({ data: result })
  } catch (error) {
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_CHECK_DUPLICATE_FAILED)
  }
})

// ===== 重复检测（专业版及以上） =====

// Levenshtein 距离计算
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// 扫描重复收藏（专业版及以上）
router.post('/scan-duplicates', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    // 等级检查：专业版及以上
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { userTier: true } })
    const tier = (user?.userTier as string) || 'medium'
    if (tier !== 'heavy' && tier !== 'super') {
      return errorResponse(res, 403, CollectionErrorCodes.COLLECTION_TIER_REQUIRED)
    }

    // 获取用户未删除的收藏（限制 3000 条，避免内存溢出）
    const collections = await prisma.collection.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, url: true, title: true, platform: true, coverImage: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 3000,
    })

    // 按 URL 分组（精确匹配）
    const urlGroups = new Map<string, typeof collections>()
    for (const c of collections) {
      // 标准化 URL：移除尾部斜杠和跟踪参数
      const normalized = c.url.replace(/\/+$/, '').replace(/[?&](utm_[^&]*|ref_[^&]*|source=[^&]*|spm=[^&]*|from=[^&]*)/gi, '')
      if (!urlGroups.has(normalized)) urlGroups.set(normalized, [])
      urlGroups.get(normalized)!.push(c)
    }

    // 收集重复组
    const duplicateGroups: { type: 'url' | 'title'; items: typeof collections; similarity: number }[] = []

    // URL 精确重复
    for (const [, items] of urlGroups) {
      if (items.length > 1) {
        duplicateGroups.push({ type: 'url', items, similarity: 1 })
      }
    }

    // 标题相似度检测（仅对非 URL 重复的收藏进行）
    const urlDupIds = new Set(duplicateGroups.flatMap(g => g.items.map(i => i.id)))
    const nonUrlDupCollections = collections.filter(c => !urlDupIds.has(c.id))

    // 限制检测量，避免 O(N²) 过大
    const maxCheck = Math.min(nonUrlDupCollections.length, 500)
    for (let i = 0; i < maxCheck; i++) {
      for (let j = i + 1; j < maxCheck; j++) {
        const a = nonUrlDupCollections[i]
        const b = nonUrlDupCollections[j]
        const maxLen = Math.max(a.title.length, b.title.length)
        if (maxLen === 0) continue
        const distance = levenshteinDistance(a.title.toLowerCase(), b.title.toLowerCase())
        const similarity = 1 - distance / maxLen
        if (similarity >= 0.85) {
          duplicateGroups.push({ type: 'title', items: [a, b], similarity: Math.round(similarity * 100) / 100 })
        }
      }
    }

    res.json({
      data: duplicateGroups,
      summary: {
        totalCollections: collections.length,
        duplicateGroups: duplicateGroups.length,
        urlDuplicates: duplicateGroups.filter(g => g.type === 'url').length,
        titleDuplicates: duplicateGroups.filter(g => g.type === 'title').length,
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '扫描重复收藏错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_FETCH_FAILED)
  }
})

// 合并重复收藏（专业版及以上）
router.post('/merge-duplicates', authenticate, [
  body('keepId').isString().notEmpty(),
  body('removeIds').isArray({ min: 1 }),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const userId = req.user.id
  const { keepId, removeIds } = req.body

  try {
    // 等级检查
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { userTier: true } })
    const tier = (user?.userTier as string) || 'medium'
    if (tier !== 'heavy' && tier !== 'super') {
      return errorResponse(res, 403, CollectionErrorCodes.COLLECTION_TIER_REQUIRED)
    }

    // 验证保留的收藏存在
    const keepCollection = await prisma.collection.findFirst({
      where: { id: keepId, userId, deletedAt: null },
      include: {
        tags: { select: { id: true } },
        lists: { select: { id: true } },
      },
    })
    if (!keepCollection) {
      return errorResponse(res, 404, CollectionErrorCodes.COLLECTION_NOT_FOUND)
    }

    // 将被删除收藏的标签和分组合并到保留的收藏
    const removeCollections = await prisma.collection.findMany({
      where: { id: { in: removeIds }, userId, deletedAt: null },
      include: {
        tags: { select: { id: true } },
        lists: { select: { id: true } },
      },
    })

    // 收集所有标签和分组 ID
    const tagIds = new Set(keepCollection.tags ? (keepCollection.tags as unknown as { id: string }[]).map(t => t.id) : [])
    const listIds = new Set(keepCollection.lists ? (keepCollection.lists as unknown as { id: string }[]).map(l => l.id) : [])

    for (const rc of removeCollections) {
      for (const tag of rc.tags) tagIds.add(tag.id)
      for (const list of rc.lists) listIds.add(list.id)
    }

    // 更新保留的收藏：合并标签和分组
    await prisma.collection.update({
      where: { id: keepId },
      data: {
        tags: { set: Array.from(tagIds).map(id => ({ id })) },
        lists: { set: Array.from(listIds).map(id => ({ id })) },
      },
    })

    // 软删除重复的收藏
    await prisma.collection.updateMany({
      where: { id: { in: removeIds }, userId },
      data: { deletedAt: new Date() },
    })

    invalidateQuotaCache(userId).catch(() => {})

    res.json({ message: '合并成功', data: { kept: keepId, removed: removeCollections.length } })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '合并重复收藏错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_UPDATE_FAILED)
  }
})

// 导出收藏（必须在 /:id 之前注册）
router.get('/export', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  const format = (req.query.format as string) || 'json'

  try {
    // 检查用户等级：专业版及以上导出包含封面
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { userTier: true } })
    const includeCover = (user?.userTier as string) === 'heavy' || (user?.userTier as string) === 'super'

    const collections = await prisma.collection.findMany({
      where: { userId, deletedAt: null },
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3000,
    })

    if (format === 'csv') {
      const BOM = '\uFEFF'
      const coverHeader = includeCover ? ',封面链接' : ''
      const header = `标题,链接,平台,备注,评分,标签,分组,创建时间${coverHeader}\n`
      const escapeCsv = (val: string) => val.replace(/"/g, '""').replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ')
      const rows = collections.map(c => {
        let row = `"${escapeCsv(c.title || '')}","${escapeCsv(c.url)}","${escapeCsv(c.platform)}","${escapeCsv(c.note || '')}","${c.rating != null ? c.rating.toString() : ''}","${c.tags?.map(t => t.name).join(';') || ''}","${c.lists?.map(l => l.name).join(';') || ''}","${c.createdAt.toISOString()}"`
        if (includeCover) {
          row += `,"${escapeCsv(c.coverImage || '')}"`
        }
        return row
      }).join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename=linkchest-export.csv')
      res.send(Buffer.from(BOM + header + rows, 'utf-8'))
    } else if (format === 'html') {
      const html = generateBookmarkHtml(collections, [], includeCover)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename=linkchest-export.html')
      res.send(html)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename=linkchest-export.json')
      res.json({ version: '1.0', exportedAt: new Date().toISOString(), count: collections.length, data: collections.map(sanitizeCollection) })
    }
  } catch (error) {
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_EXPORT_FAILED)
  }
})

// 导入收藏（必须在 /:id 之前注册）
router.post('/import', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  const { data: importData, format, htmlContent } = req.body

  let itemsToImport: { url: string; title: string; lists?: { name: string }[]; tags?: any[]; coverImage?: string; platform?: string; note?: string; rating?: number | null }[] = []

  // 根据格式解析数据
  if (format === 'html' && htmlContent) {
    const parsed = parseBookmarkHtml(htmlContent)
    itemsToImport = parsed.map(p => ({
      url: p.url,
      title: p.title,
      lists: p.listName ? [{ name: p.listName }] : [],
      coverImage: p.coverImage,
    }))
  } else if (importData && Array.isArray(importData)) {
    itemsToImport = importData
  } else {
    return errorResponse(res, 400, CollectionErrorCodes.COLLECTION_INVALID_IMPORT_DATA)
  }

  if (itemsToImport.length > 2000) {
    return errorResponse(res, 400, CollectionErrorCodes.COLLECTION_IMPORT_TOO_MANY)
  }

  try {
    // 前置配额检查：估算需要的新增收藏数和新标签数
    const uniqueListNames = new Set<string>()
    const uniqueTagNames = new Set<string>()
    let estimatedNewCollections = 0

    for (const item of itemsToImport) {
      if (!item.url) continue
      const cleanUrl = item.url.trim().replace(/\/+$/, '')
      if (!cleanUrl) continue

      // 去重检查（粗略：不查数据库，假设大部分是新数据）
      estimatedNewCollections++

      if (item.lists && Array.isArray(item.lists)) {
        const listName = typeof item.lists[0] === 'string' ? item.lists[0] : item.lists[0]?.name
        if (listName && listName !== DEFAULT_LIST_KEY && listName !== '我的收藏') {
          uniqueListNames.add(listName)
        }
      }
      if (item.tags && Array.isArray(item.tags)) {
        for (const t of item.tags) {
          const tagName = typeof t === 'string' ? t : t.name
          if (tagName) uniqueTagNames.add(tagName)
        }
      }
    }

    // 批量配额检查
    const quotaError = await checkQuotaBatch(userId, {
      collections: estimatedNewCollections,
      tags: uniqueTagNames.size,
      lists: uniqueListNames.size,
    })
    if (quotaError) {
      return errorResponse(res, 403, quotaError)
    }

    // 确保有默认分组
    let defaultList = await prisma.list.findFirst({ where: { userId, name: DEFAULT_LIST_KEY } })
    if (!defaultList) {
      defaultList = await prisma.list.findFirst({ where: { userId, name: '我的收藏' } })
    }
    if (!defaultList) {
      defaultList = await prisma.list.create({ data: { userId, name: DEFAULT_LIST_KEY, description: DEFAULT_LIST_DESC } })
    }

    const result = { success: 0, skipped: 0, error: 0 }

    // 批量预查：一次性获取用户所有收藏、标签、分组，避免 N+1 查询
    const [existingCollections, existingTags, existingLists] = await Promise.all([
      prisma.collection.findMany({
        where: { userId, deletedAt: null },
        select: { url: true },
      }),
      prisma.tag.findMany({ where: { userId }, select: { id: true, name: true } }),
      prisma.list.findMany({ where: { userId }, select: { id: true, name: true } }),
    ])

    // 构建查找映射表
    const existingUrlSet = new Set(existingCollections.map(c => c.url.replace(/\/+$/, '')))
    const tagMap = new Map(existingTags.map(t => [t.name, t.id]))
    const listMap = new Map(existingLists.map(l => [l.name, l.id]))

    for (const item of itemsToImport) {
      try {
        if (!item.url) { result.error++; continue }

        // 清理 URL（去除首尾空格、尾部斜杠）
        const cleanUrl = item.url.trim().replace(/\/+$/, '')
        if (!cleanUrl) { result.error++; continue }

        // 去重检查（内存中判断，避免逐条查库）
        const normalizedUrl = cleanUrl.replace(/\/$/, '')
        if (existingUrlSet.has(normalizedUrl) || existingUrlSet.has(normalizedUrl + '/')) {
          result.skipped++; continue
        }

        // 处理标签（批量查/创建）
        const tagIds: string[] = []
        if (item.tags && Array.isArray(item.tags)) {
          for (const t of item.tags) {
            const tagName = typeof t === 'string' ? t : t.name
            if (!tagName) continue
            let tagId = tagMap.get(tagName)
            if (!tagId) {
              const newTag = await prisma.tag.create({
                data: { userId, name: tagName, nameCn: tagName, nameEn: tagName },
              })
              tagId = newTag.id
              tagMap.set(tagName, tagId)
            }
            tagIds.push(tagId)
          }
        }

        // 处理分组（批量查/创建）
        let targetListId: string = defaultList.id
        if (item.lists && Array.isArray(item.lists) && item.lists.length > 0) {
          const firstList = item.lists[0]
          const listName = typeof firstList === 'string' ? firstList : firstList.name
          if (listName && listName !== DEFAULT_LIST_KEY && listName !== '我的收藏') {
            let listId = listMap.get(listName)
            if (!listId) {
              const newList = await prisma.list.create({
                data: { userId, name: listName },
              })
              listId = newList.id
              listMap.set(listName, listId)
            }
            targetListId = listId
          }
        }

        const collection = await prisma.collection.create({
          data: {
            userId,
            url: cleanUrl,
            title: item.title || '',
            coverImage: item.coverImage || null,
            platform: item.platform || detectPlatform(cleanUrl),
            note: item.note || null,
            rating: item.rating != null ? new Prisma.Decimal(item.rating) : null,
            tags: tagIds.length > 0 ? { connect: tagIds.map(id => ({ id })) } : undefined,
            lists: { connect: [{ id: targetListId }] },
          },
        })

        // 加入已存在集合，防止同一批次内重复导入
        existingUrlSet.add(normalizedUrl)

        // 后台抓取封面和标题（导入时未提供则异步补全）
        if (!item.coverImage || !item.title) {
          enqueueMetadataFetch({ collectionId: collection.id, url: cleanUrl, userId })
        }

        result.success++
        recordCollectionCreated(item.platform || 'unknown')
      } catch (err) {
        logger.error({ url: item.url, err: err instanceof Error ? err.message : String(err) }, '导入单条失败')
        result.error++
      }
    }

    invalidateQuotaCache(userId).catch(() => {})

    // 发布收藏导入事件
    emitEvent('collection:imported', {
      userId,
      count: result.success,
      format: 'html',
    })

    res.json({ data: result })
  } catch (error) {
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_IMPORT_FAILED)
  }
})

// 获取支持的平台（必须在 /:id 之前注册）
router.get('/platforms', (_req, res) => {
  res.json({ data: getSupportedPlatformList() })
})

// 国内专用：Cloudflare Worker 代理路由
// .workers.dev 域名在国内受限，通过国内服务器代理访问
// 海外服务器直接访问 Worker，国内服务器通过此代理路由访问
const WORKER_DIRECT_URL = 'https://linkchest-metadata.lvmeta.workers.dev'

router.get('/proxy-metadata', authenticate, async (req: AuthenticatedRequest, res) => {
  const targetUrl = req.query.url as string
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  try {
    const response = await fetch(`${WORKER_DIRECT_URL}/?url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'User-Agent': 'LinkChest/1.0',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Worker request failed' })
    }

    const data = await response.json()
    res.json(data)
  } catch (err: any) {
    logger.error('[proxy-metadata] Error:', err.message)
    res.status(502).json({ error: 'Proxy failed', detail: err.message })
  }
})

// 获取单个收藏
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const collection = await prisma.collection.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
    })

    if (!collection) {
      return errorResponse(res, 404, CollectionErrorCodes.COLLECTION_NOT_FOUND)
    }

    res.json({ data: sanitizeCollection(collection) })
  } catch (error) {
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_FETCH_FAILED)
  }
})

// 更新收藏
router.put('/:id', authenticate, [
  body('title').optional().isLength({ min: 1, max: 200 }),
  body('url').optional().isURL().withMessage('URL格式不正确'),
  body('platform').optional().isString().isLength({ min: 1, max: 50 }),
  body('note').optional().isLength({ max: 100 }),
  body('rating').optional().isFloat({ min: 0.5, max: 5 }).withMessage('评分需在 0.5-5 之间'),
  body('coverImage').optional().isString().isLength({ max: 2048 }).withMessage('封面图片URL长度不能超过2048字符'),
  body('coverStrategy').optional().isIn(['url', 'brand', 'ai']).withMessage('封面策略只能是 url、brand 或 ai'),
  body('pageType').optional().isIn(['home', 'detail', 'list', 'search', 'navigation', 'document', 'download', 'other']).withMessage('页面类型不正确'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { id } = req.params
  const userId = req.user.id
  const { title, url, platform, coverImage, note, rating, tagIds, listIds, coverStrategy, pageType } = req.body

  try {
    // 验证所有权
    const existing = await prisma.collection.findFirst({
      where: { id, userId, deletedAt: null },
    })

    if (!existing) {
      return errorResponse(res, 404, CollectionErrorCodes.COLLECTION_NOT_FOUND)
    }

    const updateData: Prisma.CollectionUpdateInput = {}
    if (title !== undefined) updateData.title = title
    if (url !== undefined) updateData.url = url
    if (platform !== undefined) updateData.platform = platform
    if (coverImage !== undefined) updateData.coverImage = coverImage
    if (coverStrategy !== undefined) updateData.coverStrategy = coverStrategy
    if (note !== undefined) updateData.note = note
    if (pageType !== undefined) updateData.pageType = pageType
    if (rating !== undefined) {
      updateData.rating = rating === null ? null : new Prisma.Decimal(rating)
    }
    
    // 更新关联
    if (tagIds !== undefined) {
      updateData.tags = { set: tagIds.map((id: string) => ({ id })) }
    }
    if (listIds !== undefined) {
      // 分组唯一性限制：一个收藏只能属于一个分组，只取第一个
      let targetListId = Array.isArray(listIds) && listIds.length > 0 ? listIds[0] : null
      if (!targetListId) {
        // 如果没有指定分组，自动分配到默认分组
        let defaultList = await prisma.list.findFirst({ where: { userId, name: DEFAULT_LIST_KEY } })
        if (!defaultList) {
          // 兼容旧数据
          defaultList = await prisma.list.findFirst({ where: { userId, name: '我的收藏' } })
        }
        if (!defaultList) {
          defaultList = await prisma.list.create({ data: { userId, name: DEFAULT_LIST_KEY, description: DEFAULT_LIST_DESC } })
        }
        targetListId = defaultList.id
      }
      updateData.lists = { set: [{ id: targetListId }] }
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: updateData,
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
    })

    res.json({ data: collection })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '更新收藏错误')
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_UPDATE_FAILED)
  }
})



// 删除收藏（软删除，移入回收站）
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    // 验证所有权
    const existing = await prisma.collection.findFirst({
      where: { id, userId, deletedAt: null },
    })

    if (!existing) {
      return errorResponse(res, 404, CollectionErrorCodes.COLLECTION_NOT_FOUND)
    }

    // 软删除：设置 deletedAt 为当前时间
    await prisma.collection.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    res.json({ message: '已移入回收站' })
  } catch (error) {
    errorResponse(res, 500, CollectionErrorCodes.COLLECTION_DELETE_FAILED)
  }
})

// 从分享源同步单条收藏封面
router.post('/:id/sync-cover', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    // 验证收藏所有权
    const collection = await prisma.collection.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true, coverImage: true, url: true },
    })
    if (!collection) {
      return errorResponse(res, 404, CollectionErrorCodes.COLLECTION_NOT_FOUND)
    }

    // 查找该收藏关联的 ShareItem（通过用户订阅的分享）
    let shareItem = await prisma.shareItem.findFirst({
      where: {
        collectionId: id,
        coverImage: { not: null },
        share: {
          subscriptions: {
            some: { userId },
          },
        },
      },
      select: { coverImage: true, title: true },
    })

    // 如果订阅方式找不到，尝试通过导入关系匹配
    if (!shareItem) {
      const list = await prisma.list.findFirst({
        where: {
          userId,
          collections: { some: { id } },
          sourceShareId: { not: null },
          sourceType: 'import',
        },
        select: { sourceShareId: true },
      })
      if (list?.sourceShareId) {
        shareItem = await prisma.shareItem.findFirst({
          where: {
            shareId: list.sourceShareId,
            url: collection.url,
            coverImage: { not: null },
          },
          select: { coverImage: true, title: true },
        })
      }
    }

    if (!shareItem || !shareItem.coverImage) {
      return errorResponse(res, 404, UploadErrorCodes.COVER_SYNC_NO_SOURCE)
    }

    // 如果封面相同，跳过
    if (shareItem.coverImage === collection.coverImage) {
      return res.json({ data: { synced: false, reason: 'same_cover' } })
    }

    // 更新收藏封面
    await prisma.collection.update({
      where: { id },
      data: { coverImage: shareItem.coverImage },
    })

    res.json({
      data: {
        synced: true,
        coverImage: shareItem.coverImage,
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '同步封面错误')
    errorResponse(res, 500, UploadErrorCodes.COVER_SYNC_FAILED)
  }
})

export default router
