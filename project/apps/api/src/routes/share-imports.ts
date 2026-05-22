import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import logger from '../lib/logger'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import prisma from '../lib/prisma'
import { importShare } from '../services/share-sync'
import { checkQuotaBatch, checkDailyQuota, incrementDailyQuota } from '../services/quota'
import { SubscriptionErrorCodes, CommonErrorCodes, UploadErrorCodes, errorResponse } from '../lib/errorCodes'
import type { QuotaErrorCode } from '../lib/errorCodes'

const router = Router()

// [DISABLED] 订阅相关路由已下线（GET /, POST /, DELETE /:id, POST /:id/sync）
// 保留一键导入功能

// 一键导入分享（非订阅方式）
router.post('/import', authenticate, [
  body('shareId').isString().withMessage('shareId 不能为空'),
  body('syncTags').optional().isBoolean(),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { shareId, syncTags = false } = req.body
  const userId = req.user.id

  try {
    // 每日导入配额检查
    const dailyError = await checkDailyQuota(userId)
    if (dailyError) {
      return errorResponse(res, 403, dailyError)
    }

    // 配额检查：分享条目数即为可能新增的 collections 上限
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      select: { shareItems: { select: { url: true } } },
    })
    const existingUrls = new Set(
      (await prisma.collection.findMany({
        where: { userId, deletedAt: null },
        select: { url: true },
      })).map(c => c.url)
    )
    const estimatedNewCollections = (share?.shareItems || []).filter(
      item => !existingUrls.has(item.url)
    ).length

    const preCheckError = await checkQuotaBatch(userId, {
      lists: 1,
      collections: estimatedNewCollections,
    })
    if (preCheckError) {
      return errorResponse(res, 403, preCheckError)
    }

    // 事务内重检配额
    try {
      await prisma.$transaction(async (tx) => {
        const quotaError = await checkQuotaBatch(
          userId,
          { lists: 1, collections: estimatedNewCollections },
          tx
        )
        if (quotaError) {
          throw Object.assign(new Error(quotaError), { statusCode: 403 })
        }
      }, { maxWait: 5000, timeout: 10000 })
    } catch (txError: unknown) {
      const te = txError as { statusCode?: number; message?: string }
      if (te?.statusCode === 403) {
        return errorResponse(res, 403, te.message as QuotaErrorCode)
      }
      throw txError
    }

    const result = await importShare(shareId, userId, { syncTags })
    await incrementDailyQuota(userId)
    res.status(201).json({ data: result })
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message
    logger.error({ err: message || String(error) }, '导入分享错误')
    if (message === 'SHARE_NOT_FOUND') {
      return errorResponse(res, 404, SubscriptionErrorCodes.SUBSCRIPTION_SHARE_NOT_FOUND)
    }
    if (message === 'ALREADY_IMPORTED') {
      return errorResponse(res, 400, SubscriptionErrorCodes.SUBSCRIPTION_ALREADY_IMPORTED)
    }
    const statusCode = (error as { statusCode?: number })?.statusCode
    if (statusCode === 403) {
      return errorResponse(res, 403, message as QuotaErrorCode)
    }
    errorResponse(res, 500, SubscriptionErrorCodes.SUBSCRIPTION_IMPORT_FAILED)
  }
})

// 批量同步分享封面到用户收藏
router.post('/:shareId/sync-covers', authenticate, async (req: AuthenticatedRequest, res) => {
  const { shareId } = req.params
  const userId = req.user.id

  try {
    // 验证分享存在且用户有订阅关系
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: {
        shareItems: {
          select: {
            id: true,
            collectionId: true,
            coverImage: true,
            url: true,
          },
        },
      },
    })

    if (!share) {
      return errorResponse(res, 404, SubscriptionErrorCodes.SUBSCRIPTION_SHARE_NOT_FOUND)
    }

    // 检查用户是否有订阅关系（或用户是分享创建者）或已导入
    if (share.userId !== userId) {
      const subscription = await prisma.shareSubscription.findUnique({
        where: { userId_shareId: { userId, shareId } },
      })
      if (!subscription) {
        // 额外检查：是否通过 importShare 导入
        const importedList = await prisma.list.findFirst({
          where: { userId, sourceShareId: shareId, sourceType: 'import' },
        })
        if (!importedList) {
          return errorResponse(res, 403, CommonErrorCodes.VALIDATION_FAILED)
        }
      }
    }

    let synced = 0
    let skipped = 0
    let failed = 0

    for (const item of share.shareItems) {
      try {
        // 只处理有封面且有对应收藏的 ShareItem
        if (!item.coverImage || !item.collectionId) {
          skipped++
          continue
        }

        // 验证收藏属于当前用户
        const collection = await prisma.collection.findFirst({
          where: { id: item.collectionId, userId },
          select: { id: true, coverImage: true },
        })

        if (!collection) {
          skipped++
          continue
        }

        // 封面相同则跳过
        if (collection.coverImage === item.coverImage) {
          skipped++
          continue
        }

        // 更新封面
        await prisma.collection.update({
          where: { id: collection.id },
          data: { coverImage: item.coverImage },
        })
        synced++
      } catch {
        failed++
      }
    }

    res.json({
      data: { synced, skipped, failed },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '批量同步封面错误')
    errorResponse(res, 500, UploadErrorCodes.COVER_SYNC_FAILED)
  }
})

export default router
