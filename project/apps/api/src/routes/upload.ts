import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { processAndUploadCover, processAndUploadAvatar, processAvatarFromCoverUrl, deleteAvatar, getUserCovers, getSystemCovers } from '../services/cover'
import { COVER_CONFIG, AVATAR_CONFIG } from '../lib/config'
import { UploadErrorCodes, QuotaErrorCodes, errorResponse } from '../lib/errorCodes'
import type { QuotaErrorCode } from '../lib/errorCodes'
import { isCosConfigured } from '../services/cos'
import logger from '../lib/logger'

const router = Router()

// 检查 COS 是否配置
function checkCosConfig(res: Parameters<typeof errorResponse>[0]) {
  if (!isCosConfigured()) {
    errorResponse(res, 503, UploadErrorCodes.UPLOAD_COS_NOT_CONFIGURED)
    return false
  }
  return true
}

// 封面上传接口
router.post('/cover', authenticate, async (req: AuthenticatedRequest, res) => {
  if (!checkCosConfig(res)) return
  const userId = req.user.id

  try {
    // 检查是否有文件数据
    if (!req.body || !req.body.imageData) {
      return errorResponse(res, 400, UploadErrorCodes.UPLOAD_MISSING_IMAGE_DATA)
    }

    const { imageData, originalName = 'cover.jpg' } = req.body

    // 解析 base64 数据
    let buffer: Buffer
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      const base64Match = imageData.match(/base64,(.+)/)
      const base64Data = base64Match ? base64Match[1] : ''
      if (!base64Data) {
        return errorResponse(res, 400, UploadErrorCodes.UPLOAD_INVALID_IMAGE_DATA)
      }
      buffer = Buffer.from(base64Data, 'base64')
    } else if (typeof imageData === 'string') {
      buffer = Buffer.from(imageData, 'base64')
    } else {
      return errorResponse(res, 400, UploadErrorCodes.UPLOAD_INVALID_IMAGE_FORMAT)
    }

    // 文件大小检查
    if (buffer.length > COVER_CONFIG.maxUploadSize) {
      return errorResponse(res, 413, UploadErrorCodes.UPLOAD_FILE_TOO_LARGE, {
        detail: `文件大小 ${(buffer.length / 1024 / 1024).toFixed(2)}MB 超过限制 ${COVER_CONFIG.maxUploadSize / 1024 / 1024}MB`,
      })
    }

    // 处理上传（压缩 + COS 上传 + 创建记录）
    const result = await processAndUploadCover(userId, buffer, originalName)

    res.status(201).json({
      data: {
        coverImageId: result.coverImageId,
        url: result.cosUrl,
        size: result.size,
        width: result.width,
        height: result.height,
      },
    })
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message || String(error)
    const stack = (error as { stack?: string })?.stack
    logger.error({ err: message, stack }, '封面上传错误')
    if (message && Object.values(QuotaErrorCodes).includes(message as QuotaErrorCode)) {
      return errorResponse(res, 403, message as QuotaErrorCode)
    }
    // 图片格式错误返回 400，避免前端显示"服务器繁忙"
    if (message.includes('无效的图片文件') || message.includes('无法识别图片格式')) {
      return errorResponse(res, 400, UploadErrorCodes.UPLOAD_INVALID_IMAGE_FORMAT, { detail: message })
    }
    errorResponse(res, 500, UploadErrorCodes.UPLOAD_COVER_FAILED, { detail: message })
  }
})

// 从封面 URL 设置头像
router.post('/avatar-from-cover', authenticate, async (req: AuthenticatedRequest, res) => {
  if (!checkCosConfig(res)) return
  const userId = req.user.id
  try {
    const { coverUrl } = req.body
    if (!coverUrl || typeof coverUrl !== 'string') {
      return errorResponse(res, 400, UploadErrorCodes.UPLOAD_MISSING_IMAGE_DATA)
    }
    const result = await processAvatarFromCoverUrl(userId, coverUrl)
    res.json({ data: { url: result.url } })
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message || String(error)
    logger.error({ err: message }, '从封面设置头像错误')
    errorResponse(res, 500, UploadErrorCodes.UPLOAD_AVATAR_FAILED, { detail: message })
  }
})

// 头像上传接口
router.post('/avatar', authenticate, async (req: AuthenticatedRequest, res) => {
  if (!checkCosConfig(res)) return
  const userId = req.user.id

  try {
    if (!req.body || !req.body.imageData) {
      return errorResponse(res, 400, UploadErrorCodes.UPLOAD_MISSING_IMAGE_DATA)
    }

    const { imageData } = req.body

    // 解析 base64 数据
    let buffer: Buffer
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      const base64Match = imageData.match(/base64,(.+)/)
      const base64Data = base64Match ? base64Match[1] : ''
      if (!base64Data) {
        return errorResponse(res, 400, UploadErrorCodes.UPLOAD_INVALID_IMAGE_DATA)
      }
      buffer = Buffer.from(base64Data, 'base64')
    } else if (typeof imageData === 'string') {
      buffer = Buffer.from(imageData, 'base64')
    } else {
      return errorResponse(res, 400, UploadErrorCodes.UPLOAD_INVALID_IMAGE_FORMAT)
    }

    // 文件大小检查
    if (buffer.length > AVATAR_CONFIG.maxUploadSize) {
      return errorResponse(res, 413, UploadErrorCodes.UPLOAD_FILE_TOO_LARGE, {
        detail: `文件大小 ${(buffer.length / 1024 / 1024).toFixed(2)}MB 超过限制 ${AVATAR_CONFIG.maxUploadSize / 1024 / 1024}MB`,
      })
    }

    // 处理上传（压缩 + COS 上传 + 更新 User.avatar）
    const result = await processAndUploadAvatar(userId, buffer)

    res.json({
      data: {
        url: result.url,
      },
    })
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message || String(error)
    const stack = (error as { stack?: string })?.stack
    logger.error({ err: message, stack }, '头像上传错误')
    // 图片格式错误返回 400，避免前端显示"服务器繁忙"
    if (message.includes('无效的图片文件') || message.includes('无法识别图片格式')) {
      return errorResponse(res, 400, UploadErrorCodes.UPLOAD_INVALID_IMAGE_FORMAT, { detail: message })
    }
    errorResponse(res, 500, UploadErrorCodes.UPLOAD_AVATAR_FAILED, { detail: message })
  }
})

// 删除头像接口
router.delete('/avatar', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    await deleteAvatar(userId)
    res.json({ message: 'avatarDeleted' })
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message
    logger.error({ err: message }, '头像删除错误')
    errorResponse(res, 500, UploadErrorCodes.UPLOAD_AVATAR_DELETE_FAILED)
  }
})

// 获取封面库列表
router.get('/covers', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  const page = parseInt(req.query.page as string) || 1
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  try {
    const result = await getUserCovers(userId, page, limit)
    res.json({
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    })
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message
    logger.error({ err: message }, '获取封面库错误')
    errorResponse(res, 500, UploadErrorCodes.UPLOAD_COVER_LIBRARY_FETCH_FAILED)
  }
})

// 获取系统封面库列表
router.get('/system-covers', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await getSystemCovers()
    res.json({
      data: result.data,
    })
  } catch (error: unknown) {
    const message = (error as { message?: string })?.message
    logger.error({ err: message }, '获取系统封面库错误')
    errorResponse(res, 500, UploadErrorCodes.UPLOAD_COVER_LIBRARY_FETCH_FAILED)
  }
})

export default router
