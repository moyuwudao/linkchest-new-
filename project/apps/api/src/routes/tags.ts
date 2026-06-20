import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { TagErrorCodes, CommonErrorCodes, errorResponse } from '../lib/errorCodes'
import { sanitizeCollection } from '../lib/utils'
import { checkQuota, invalidateQuotaCache } from '../services/quota'

const router = Router()

// 获取所有标签
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    // 获取用户的语言偏好
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lang: true }
    })
    const userLang = user?.lang || 'zh'

    const tags = await prisma.tag.findMany({
      where: { userId },
      include: {
        collections: {
          where: { deletedAt: null },
        }
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    res.json({
      data: tags.map(tag => ({
        ...tag,
        // 根据用户语言返回显示名称
        name: userLang === 'en' && tag.nameEn ? tag.nameEn : (tag.nameCn || tag.name),
        collectionCount: tag.collections.length,
        collections: undefined,
      }))
    })
  } catch (error) {
    errorResponse(res, 500, TagErrorCodes.TAG_FETCH_FAILED)
  }
})

// 排序标签（必须在 /:id 之前注册）
router.post('/reorder', authenticate, [
  body('items').isArray({ min: 1 }).withMessage('请提供排序数据'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { items } = req.body
  const userId = req.user.id

  try {
    await prisma.$transaction(
      items.map((item: { id: string; sortOrder: number }) =>
        prisma.tag.updateMany({
          where: { id: item.id, userId },
          data: { sortOrder: item.sortOrder },
        })
      )
    )
    res.json({ message: '排序已更新' })
  } catch (error) {
    errorResponse(res, 500, TagErrorCodes.TAG_REORDER_FAILED)
  }
})

// 获取单个标签详情
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    // 获取用户的语言偏好
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lang: true }
    })
    const userLang = user?.lang || 'zh'

    const tag = await prisma.tag.findFirst({
      where: { id, userId },
      include: {
        collections: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            coverImage: true,
            platform: true,
            url: true,
            note: true,
            createdAt: true,
            tags: { select: { id: true, name: true } },
            lists: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }
      }
    })

    if (!tag) {
      return errorResponse(res, 404, TagErrorCodes.TAG_NOT_FOUND)
    }

    // 根据语言返回显示名称
    const displayName = userLang === 'en' && tag.nameEn ? tag.nameEn : (tag.nameCn || tag.name)

    res.json({
      data: {
        ...tag,
        name: displayName,
        collections: tag.collections?.map(sanitizeCollection),
      }
    })
  } catch (error) {
    errorResponse(res, 500, TagErrorCodes.TAG_FETCH_FAILED)
  }
})

// 创建标签
router.post('/', authenticate, [
  body('name').isLength({ min: 1, max: 20 }).withMessage('标签名1-20字符'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  let { name, nameCn, nameEn } = req.body
  const userId = req.user.id

  // 配额预检：创建标签超过上限时拒绝（防御性检查，未来若调整 medium 限额自动生效）
  const quotaError = await checkQuota(userId, 'tags')
  if (quotaError) {
    return errorResponse(res, 403, quotaError)
  }

  try {
    // 获取用户的语言偏好
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lang: true }
    })
    const userLang = user?.lang || 'zh'

    // 如果没有提供中英文名称，用 name 填充
    const finalNameCn = nameCn || name
    const finalNameEn = nameEn || name
    const displayName = userLang === 'en' ? finalNameEn : finalNameCn

    // 检查名称是否重复（根据语言检查对应的名称字段）
    const whereClause = userLang === 'en'
      ? { userId, nameEn: finalNameEn }
      : { userId, nameCn: finalNameCn }

    const existingTag = await prisma.tag.findFirst({ where: whereClause })
    if (existingTag) {
      // 查找同名的最大编号
      const nameField = userLang === 'en' ? 'nameEn' : 'nameCn'
      const sameNameTags = await prisma.tag.findMany({
        where: { userId, [nameField]: { startsWith: userLang === 'en' ? finalNameEn : finalNameCn } },
        select: { [nameField]: true },
      })
      let maxNum = 0
      const baseNamePattern = new RegExp(`^${(userLang === 'en' ? finalNameEn : finalNameCn).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\((\\d+)\\))?$`)
      for (const t of sameNameTags) {
        const tagName = (t as Record<string, unknown>)[nameField] as string
        const match = tagName.match(baseNamePattern)
        if (match) {
          const num = match[1] ? parseInt(match[1]) : 0
          if (num > maxNum) maxNum = num
        }
      }
      // 更新显示名称
      const newDisplayName = userLang === 'en'
        ? `${finalNameEn}(${maxNum + 1})`
        : `${finalNameCn}(${maxNum + 1})`
      // 同时更新中英文名称
      if (userLang === 'en') {
        return errorResponse(res, 400, TagErrorCodes.TAG_NAME_EXISTS, { renamed: true, originalName: name, newName: newDisplayName })
      } else {
        return errorResponse(res, 400, TagErrorCodes.TAG_NAME_EXISTS, { renamed: true, originalName: name, newName: newDisplayName })
      }
    }

    const tag = await prisma.tag.create({
      data: {
        userId,
        name: displayName,
        nameCn: finalNameCn,
        nameEn: finalNameEn,
      },
    })

    invalidateQuotaCache(userId).catch(() => {})

    res.status(201).json({
      ...tag,
      name: displayName,
      renamed: false,
    })
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code
    if (errCode === 'P2002') {
      return errorResponse(res, 400, TagErrorCodes.TAG_NAME_EXISTS)
    }
    errorResponse(res, 500, TagErrorCodes.TAG_CREATE_FAILED)
  }
})

// 更新标签
router.put('/:id', authenticate, [
  body('name').isLength({ min: 1, max: 20 }),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { id } = req.params
  const { name, nameCn, nameEn } = req.body
  const userId = req.user.id

  try {
    // 获取用户的语言偏好
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lang: true }
    })
    const userLang = user?.lang || 'zh'

    // 获取当前标签
    const currentTag = await prisma.tag.findFirst({ where: { id, userId } })
    if (!currentTag) {
      return errorResponse(res, 404, TagErrorCodes.TAG_NOT_FOUND)
    }

    // 更新标签数据
    const updateData: Prisma.TagUpdateInput = {}
    if (nameCn) updateData.nameCn = nameCn
    if (nameEn) updateData.nameEn = nameEn

    // 更新显示名称
    const finalNameCn = nameCn || currentTag.nameCn || currentTag.name
    const finalNameEn = nameEn || currentTag.nameEn || currentTag.name
    updateData.name = userLang === 'en' ? finalNameEn : finalNameCn

    const tag = await prisma.tag.updateMany({
      where: { id, userId },
      data: updateData,
    })

    if (tag.count === 0) {
      return errorResponse(res, 404, TagErrorCodes.TAG_NOT_FOUND)
    }

    // 返回更新后的完整数据
    const updatedTag = await prisma.tag.findFirst({
      where: { id, userId },
      include: { _count: { select: { collections: true } } },
    })

    res.json({
      data: {
        ...updatedTag,
        name: userLang === 'en' ? (updatedTag?.nameEn || updatedTag?.name) : (updatedTag?.nameCn || updatedTag?.name),
        collectionCount: updatedTag?._count.collections || 0,
        _count: undefined,
      },
    })
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code
    if (errCode === 'P2002') {
      return errorResponse(res, 400, TagErrorCodes.TAG_NAME_EXISTS)
    }
    errorResponse(res, 500, TagErrorCodes.TAG_UPDATE_FAILED)
  }
})

// 删除标签
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    await prisma.tag.deleteMany({
      where: { id, userId },
    })

    invalidateQuotaCache(userId).catch(() => {})

    res.json({ message: '删除成功' })
  } catch (error) {
    errorResponse(res, 500, TagErrorCodes.TAG_DELETE_FAILED)
  }
})

export default router
