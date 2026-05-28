import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../lib/prisma'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { CommonErrorCodes, AuthErrorCodes, errorResponse } from '../lib/errorCodes'
import logger from '../lib/logger'
import { isCosConfigured, uploadToCos } from '../services/cos'

const router = Router()

// 可配置的显示字段
export const DISPLAY_FIELD_KEYS = [
  'cover',
  'title',
  'platform',
  'rating',
  'pageType',
  'tags',
  'lists',
  'note',
  'createdAt',
] as const

export type DisplayFieldKey = typeof DISPLAY_FIELD_KEYS[number]

export interface DisplayField {
  key: DisplayFieldKey
  enabled: boolean
  order: number
}

export interface ViewModeConfig {
  fields: DisplayField[]
}

export interface CollectionViews {
  webGrid: ViewModeConfig
  webList: ViewModeConfig
  mobileGrid: ViewModeConfig
  mobileList: ViewModeConfig
}

// 默认字段配置
export function getDefaultFields(): DisplayField[] {
  return [
    { key: 'cover', enabled: true, order: 1 },
    { key: 'title', enabled: true, order: 2 },
    { key: 'platform', enabled: true, order: 3 },
    { key: 'rating', enabled: true, order: 4 },
    { key: 'pageType', enabled: false, order: 5 },
    { key: 'tags', enabled: true, order: 6 },
    { key: 'lists', enabled: true, order: 7 },
    { key: 'note', enabled: true, order: 8 },
    { key: 'createdAt', enabled: false, order: 9 },
  ]
}

export function getDefaultCollectionViews(): CollectionViews {
  return {
    webGrid: { fields: getDefaultFields().map(f => ({ ...f })) },
    webList: { fields: getDefaultFields().map(f => ({ ...f })) },
    mobileGrid: { fields: getDefaultFields().map(f => ({ ...f })) },
    mobileList: { fields: getDefaultFields().map(f => ({ ...f })) },
  }
}

// 默认用户设置
const DEFAULT_SETTINGS = {
  shareMode: 'off' as 'off' | 'quickPopup' | 'quickSave',
  autoDetectLinkMode: 'none' as 'none' | 'openQuickAdd' | 'autoSave',
  coverStrategyOrder: ['url', 'brand', 'ai'] as string[],
  defaultListId: undefined as string | undefined,
  defaultTagIds: [] as string[],
  backupFrequency: 'off' as 'off' | 'weekly' | 'monthly',
  backupFormat: 'csv' as 'csv' | 'html' | 'json',
}

interface UserSettings {
  shareMode?: 'off' | 'quickPopup' | 'quickSave'
  autoDetectLinkMode?: 'none' | 'openQuickAdd' | 'autoSave'
  coverStrategyOrder?: string[]
  defaultListId?: string
  defaultTagIds?: string[]
  backupFrequency?: 'off' | 'weekly' | 'monthly'
  backupFormat?: 'csv' | 'html' | 'json'
  backupLastSent?: string
  onboardingCompleted?: boolean
  collectionViews?: CollectionViews
}

// 获取当前用户设置
router.get('/settings', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    })

    if (!user) {
      return errorResponse(res, 404, CommonErrorCodes.NOT_FOUND)
    }

    const settings: UserSettings = (user.settings as UserSettings) || {}

    // 合并默认值
    const merged = {
      shareMode: settings.shareMode || DEFAULT_SETTINGS.shareMode,
      autoDetectLinkMode: settings.autoDetectLinkMode || DEFAULT_SETTINGS.autoDetectLinkMode,
      coverStrategyOrder: settings.coverStrategyOrder || DEFAULT_SETTINGS.coverStrategyOrder,
      defaultListId: settings.defaultListId || null,
      defaultTagIds: settings.defaultTagIds || [],
      backupFrequency: settings.backupFrequency || DEFAULT_SETTINGS.backupFrequency,
      backupFormat: settings.backupFormat || DEFAULT_SETTINGS.backupFormat,
      backupLastSent: settings.backupLastSent || null,
      onboardingCompleted: settings.onboardingCompleted || false,
      collectionViews: settings.collectionViews || getDefaultCollectionViews(),
    }

    res.json({ data: merged })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取用户设置失败')
    errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 验证 collectionViews 结构
function validateCollectionViews(views: any): CollectionViews | null {
  if (!views || typeof views !== 'object') return null
  const modes = ['webGrid', 'webList', 'mobileGrid', 'mobileList']
  const result: any = {}
  for (const mode of modes) {
    if (!views[mode] || !Array.isArray(views[mode].fields)) return null
    const fields = views[mode].fields
    if (!fields.every((f: any) =>
      typeof f === 'object' &&
      typeof f.key === 'string' &&
      DISPLAY_FIELD_KEYS.includes(f.key) &&
      typeof f.enabled === 'boolean' &&
      typeof f.order === 'number'
    )) return null
    result[mode] = { fields }
  }
  return result as CollectionViews
}

// 更新用户设置
router.put('/settings', authenticate, [
  body('shareMode').optional().isIn(['off', 'quickPopup', 'quickSave']),
  body('autoDetectLinkMode').optional().isIn(['none', 'openQuickAdd', 'autoSave']),
  body('coverStrategyOrder').optional().isArray(),
  body('coverStrategyOrder.*').optional().isIn(['url', 'brand', 'ai']),
  body('defaultListId').optional().custom((value) => value === null || typeof value === 'string'),
  body('defaultTagIds').optional().isArray(),
  body('defaultTagIds.*').optional().isString(),
  body('backupFrequency').optional().isIn(['off', 'weekly', 'monthly']),
  body('backupFormat').optional().isIn(['csv', 'html', 'json']),
  body('collectionViews').optional().isObject(),
], async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED)
  }

  const { shareMode, autoDetectLinkMode, coverStrategyOrder, defaultListId, defaultTagIds, backupFrequency, backupFormat, collectionViews } = req.body

  try {
    // 读取现有设置
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    })

    const current: UserSettings = (user?.settings as UserSettings) || {}

    // 验证并处理 collectionViews
    let validatedViews: CollectionViews | undefined = undefined
    if (collectionViews !== undefined) {
      const validated = validateCollectionViews(collectionViews)
      if (validated) {
        validatedViews = validated
      } else {
        return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, 'collectionViews 格式无效')
      }
    }

    const updated: UserSettings = {
      shareMode: shareMode ?? current.shareMode,
      autoDetectLinkMode: autoDetectLinkMode ?? current.autoDetectLinkMode,
      coverStrategyOrder: coverStrategyOrder ?? current.coverStrategyOrder,
      defaultListId: defaultListId !== undefined ? defaultListId : current.defaultListId,
      defaultTagIds: defaultTagIds !== undefined ? defaultTagIds : current.defaultTagIds,
      backupFrequency: backupFrequency ?? current.backupFrequency,
      backupFormat: backupFormat ?? current.backupFormat,
      backupLastSent: current.backupLastSent,
      onboardingCompleted: current.onboardingCompleted,
      collectionViews: validatedViews !== undefined ? validatedViews : current.collectionViews,
    }

    await prisma.user.update({
      where: { id: userId },
      data: { settings: updated as any },
    })

    res.json({ data: updated })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '更新用户设置失败')
    errorResponse(res, 500, AuthErrorCodes.SERVER_ERROR)
  }
})

// 立即备份到云端
router.post('/backup', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    // 检查COS是否配置
    if (!isCosConfigured()) {
      return errorResponse(res, 503, CommonErrorCodes.SERVER_ERROR, '云端存储暂不可用')
    }

    // 获取用户数据
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, nickname: true },
    })

    const collections = await prisma.collection.findMany({
      where: { userId, deletedAt: null },
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const lists = await prisma.list.findMany({
      where: { userId },
      select: { id: true, name: true, description: true, parentId: true, createdAt: true },
    })

    const tags = await prisma.tag.findMany({
      where: { userId },
      select: { id: true, name: true, createdAt: true },
    })

    // 生成备份数据
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        username: user?.username,
        nickname: user?.nickname,
      },
      stats: {
        collections: collections.length,
        lists: lists.length,
        tags: tags.length,
      },
      collections,
      lists,
      tags,
    }

    const content = JSON.stringify(backupData, null, 2)
    const buffer = Buffer.from(content, 'utf-8')
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const key = `backups/${userId}/${date}/linkchest-backup-${Date.now()}.json`

    // 上传到COS
    await uploadToCos(key, buffer, 'application/json')

    // 更新最后备份时间
    const currentSettings = (await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    }))?.settings as Record<string, unknown> || {}

    await prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...currentSettings,
          backupLastSent: new Date().toISOString(),
        },
      },
    })

    logger.info({ userId, key, count: collections.length }, '✅ 用户立即备份成功')
    res.json({
      data: {
        success: true,
        message: '备份成功',
        count: collections.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error), userId }, '❌ 用户立即备份失败')
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '备份失败，请稍后重试')
  }
})

// 注册/更新推送 Token
router.post('/push-token', authenticate, [
  body('platform').isIn(['jpush', 'fcm', 'expo']).withMessage('平台类型无效'),
  body('token').notEmpty().withMessage('Token 不能为空'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array()[0].msg)
  }

  const userId = req.user!.id
  const { platform, token } = req.body

  try {
    await prisma.pushToken.upsert({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
      update: {
        token,
        updatedAt: new Date(),
      },
      create: {
        userId,
        platform,
        token,
      },
    })

    logger.info({ userId, platform }, '✅ 推送 Token 更新成功')
    res.json({ data: { success: true } })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error), userId }, '❌ 推送 Token 更新失败')
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '更新失败')
  }
})

// 删除推送 Token
router.delete('/push-token', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const { platform } = req.query

  try {
    await prisma.pushToken.deleteMany({
      where: {
        userId,
        platform: platform as string | undefined,
      },
    })

    res.json({ data: { success: true } })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error), userId }, '❌ 推送 Token 删除失败')
    errorResponse(res, 500, CommonErrorCodes.SERVER_ERROR, '删除失败')
  }
})

export default router
