import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { CommonErrorCodes, errorResponse } from '../lib/errorCodes'
import logger from '../lib/logger'
import {
  listUserBackups,
  getBackupDownloadUrl,
  deleteBackup,
  executeBackup,
} from '../services/backup'

const router = Router()

/**
 * GET /api/backups
 * 列出当前用户的所有备份（按时间倒序）
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  try {
    const list = await listUserBackups(userId, 50)
    res.json({
      data: list.map((b) => ({
        id: b.id,
        source: b.source, // auto | manual
        format: b.format,
        filename: b.filename,
        size: b.size,
        count: b.count,
        createdAt: b.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), userId },
      '列出备份失败'
    )
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '获取备份列表失败')
  }
})

/**
 * GET /api/backups/:id/download
 * 返回备份的临时下载链接（COS 签名 URL，1小时有效）
 */
router.get('/:id/download', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  const backupId = req.params.id

  try {
    const result = await getBackupDownloadUrl(backupId, userId)
    if (!result.ok) {
      if (result.reason === 'NOT_FOUND') {
        return errorResponse(res, 404, CommonErrorCodes.NOT_FOUND, '备份不存在')
      }
      return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '生成下载链接失败')
    }
    res.json({
      data: {
        url: result.url,
        filename: result.filename,
        expiresIn: 3600,
      },
    })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), userId, backupId },
      '获取备份下载链接失败'
    )
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '生成下载链接失败')
  }
})

/**
 * DELETE /api/backups/:id
 * 删除单条备份（DB + COS）
 */
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  const backupId = req.params.id

  try {
    const ok = await deleteBackup(backupId, userId)
    if (!ok) {
      return errorResponse(res, 404, CommonErrorCodes.NOT_FOUND, '备份不存在')
    }
    res.json({ data: { success: true } })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), userId, backupId },
      '删除备份失败'
    )
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '删除失败')
  }
})

/**
 * POST /api/backups/trigger
 * 手动触发一次备份（保留兼容，未来可废弃，统一调 POST /api/users/backup）
 */
router.post('/trigger', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  try {
    const result = await executeBackup(userId, 'manual')
    if (!result.ok) {
      if (result.reason === 'COS_NOT_CONFIGURED') {
        return errorResponse(res, 503, CommonErrorCodes.SERVER_ERROR, '云端存储暂不可用')
      }
      return errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '备份失败，请稍后重试')
    }
    const r = result.record!
    res.json({
      data: {
        success: true,
        message: '备份成功',
        count: r.count,
        timestamp: r.createdAt.toISOString(),
        id: r.id,
        filename: r.filename,
      },
    })
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), userId },
      '手动备份失败'
    )
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '备份失败，请稍后重试')
  }
})

export default router
