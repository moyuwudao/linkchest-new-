import prisma from '../lib/prisma'
import { uploadToCos, isCosConfigured, getSignedUrl, deleteFromCos, downloadFromCos } from './cos'
import { sendPushToUser } from './push'
import logger from '../lib/logger'

// 备份频率配置
export type BackupFrequency = 'weekly' | 'monthly' | 'off'
export type BackupFormat = 'csv' | 'html' | 'json'
export type BackupSource = 'auto' | 'manual'

// 备份目录：COS 对象键前缀
const BACKUP_COS_PREFIX = 'backups'

// 备份文件最大保留数量（每个用户）
const BACKUP_KEEP_MAX = 4

export interface BackupRecord {
  id: string
  userId: string
  source: BackupSource
  format: BackupFormat
  filename: string
  cosKey: string
  size: number
  count: number
  createdAt: Date
}

/**
 * 构造备份内容（collections + lists + tags）
 */
async function buildBackupPayload(userId: string): Promise<{
  content: string
  filename: string
  mimeType: string
  count: number
  size: number
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, nickname: true, lang: true },
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
  const buf = Buffer.from(content, 'utf-8')

  const ts = new Date()
  const dateStr = ts.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = ts.toISOString().slice(11, 19).replace(/:/g, '')
  const filename = `linkchest-backup-${dateStr}-${timeStr}.json`

  return {
    content,
    filename,
    mimeType: 'application/json',
    count: collections.length,
    size: buf.byteLength,
  }
}

/**
 * 上传 buffer 到 COS 并返回对象键
 */
function makeCosKey(userId: string, filename: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${BACKUP_COS_PREFIX}/${userId}/${date}/${Date.now()}-${filename}`
}

/**
 * 核心：执行一次备份（用户/管理员/自动任务都调此函数）
 * - 上传 COS
 * - 写 Backup 表
 * - 自动触发 JPush 推送
 * - 自动清理超过保留数量的旧备份
 */
export async function executeBackup(
  userId: string,
  source: BackupSource
): Promise<{ ok: boolean; record?: BackupRecord; reason?: string }> {
  try {
    if (!isCosConfigured()) {
      logger.warn({ userId }, '备份失败：COS 未配置')
      return { ok: false, reason: 'COS_NOT_CONFIGURED' }
    }

    const payload = await buildBackupPayload(userId)

    if (payload.count === 0 && source === 'auto') {
      logger.info({ userId }, '自动备份跳过：无收藏数据')
      return { ok: false, reason: 'NO_DATA' }
    }

    const cosKey = makeCosKey(userId, payload.filename)
    const buffer = Buffer.from(payload.content, 'utf-8')
    await uploadToCos(cosKey, buffer, payload.mimeType)

    // 写 Backup 表
    const record = await prisma.backup.create({
      data: {
        userId,
        source,
        format: 'json',
        filename: payload.filename,
        cosKey,
        size: payload.size,
        count: payload.count,
      },
    })

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

    // 清理超出保留数量的旧备份（DB + COS）
    await pruneOldBackups(userId, BACKUP_KEEP_MAX)

    // 触发 JPush 推送通知
    await notifyBackupComplete(userId, source, record.count, record.filename).catch((err) => {
      logger.warn({ err: err?.message, userId }, '备份推送通知失败（非阻塞）')
    })

    logger.info({ userId, source, count: record.count, key: cosKey }, '✅ 备份完成')
    return { ok: true, record: record as BackupRecord }
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error), userId, source },
      '❌ 备份失败'
    )
    return { ok: false, reason: 'INTERNAL_ERROR' }
  }
}

/**
 * 推送通知：备份完成
 */
async function notifyBackupComplete(
  userId: string,
  source: BackupSource,
  count: number,
  filename: string
): Promise<void> {
  // 取用户语言偏好，决定推送文案
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lang: true, nickname: true, username: true },
  })
  const isZh = (user?.lang || 'zh') === 'zh'
  const displayName = user?.nickname || user?.username || ''

  const title = isZh ? '链藏 · 备份完成' : 'LinkChest · Backup complete'
  const content =
    source === 'auto'
      ? isZh
        ? `${displayName ? displayName + '，' : ''}你的定期备份已完成，共 ${count} 条收藏`
        : `${displayName ? displayName + ', ' : ''}your periodic backup is done, ${count} bookmarks`
      : isZh
        ? `已成功备份 ${count} 条收藏`
        : `Successfully backed up ${count} bookmarks`

  await sendPushToUser(userId, title, content, {
    screen: 'AutoBackup',
    type: 'backup_complete',
    source,
    filename,
    count,
  })
}

/**
 * 清理用户的旧备份（仅保留最新的 N 条）
 */
async function pruneOldBackups(userId: string, keepMax: number): Promise<void> {
  const backups = await prisma.backup.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, cosKey: true },
  })

  if (backups.length <= keepMax) return

  const toDelete = backups.slice(keepMax)
  const cosKeys = toDelete.map((b) => b.cosKey)

  try {
    const { batchDeleteFromCos } = await import('./cos')
    await batchDeleteFromCos(cosKeys).catch(() => {})
  } catch {
    // COS 批量删除失败不阻塞流程
  }

  await prisma.backup.deleteMany({
    where: { id: { in: toDelete.map((b) => b.id) } },
  })
}

/**
 * 批量执行到期备份（定时任务调用）
 */
export async function processPendingBackups(): Promise<{ processed: number; success: number; failed: number }> {
  const now = new Date()
  let processed = 0
  let success = 0
  let failed = 0

  const users = await prisma.user.findMany({
    where: {
      userTier: { in: ['heavy', 'super'] },
      status: 'active',
    },
    select: { id: true, settings: true },
  })

  for (const user of users) {
    const settings = (user.settings as Record<string, unknown>) || {}
    const frequency = settings.backupFrequency as BackupFrequency || 'off'
    const lastSent = settings.backupLastSent as string | undefined

    if (frequency === 'off') continue

    const lastSentDate = lastSent ? new Date(lastSent) : new Date(0)
    const daysSinceLastBackup = (now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24)

    const shouldBackup =
      (frequency === 'weekly' && daysSinceLastBackup >= 7) ||
      (frequency === 'monthly' && daysSinceLastBackup >= 30)

    if (!shouldBackup) continue

    processed++
    const result = await executeBackup(user.id, 'auto')
    if (result.ok) success++
    else failed++
  }

  return { processed, success, failed }
}

/**
 * 列出用户的所有备份
 */
export async function listUserBackups(userId: string, limit = 50): Promise<BackupRecord[]> {
  return prisma.backup.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * 获取备份的临时下载链接（COS 签名 URL）
 */
export async function getBackupDownloadUrl(backupId: string, userId: string): Promise<{
  ok: boolean
  url?: string
  filename?: string
  reason?: string
}> {
  const backup = await prisma.backup.findFirst({
    where: { id: backupId, userId },
  })

  if (!backup) return { ok: false, reason: 'NOT_FOUND' }

  try {
    const url = await getSignedUrl(backup.cosKey, 3600)
    return { ok: true, url, filename: backup.filename }
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err), backupId },
      '生成备份下载链接失败'
    )
    return { ok: false, reason: 'SIGN_URL_FAILED' }
  }
}

/**
 * 删除单条备份（DB + COS）
 */
export async function deleteBackup(backupId: string, userId: string): Promise<boolean> {
  const backup = await prisma.backup.findFirst({
    where: { id: backupId, userId },
  })
  if (!backup) return false

  try {
    await deleteFromCos(backup.cosKey)
  } catch {
    // COS 删除失败不影响 DB 删除（避免卡住）
  }
  await prisma.backup.delete({ where: { id: backup.id } })
  return true
}

/**
 * 从备份恢复数据到当前账户
 *
 * 关键约束：只增不删 — 不删除任何现有数据
 * - 标签（Tag）：按 name 去重，已存在则跳过
 * - 分组（List）：按 name 去重，已存在则跳过
 * - 收藏（Collection）：按 url 去重，已存在则跳过
 *
 * @returns 恢复统计：新增/跳过的数量
 */
export async function restoreBackup(backupId: string, userId: string): Promise<{
  ok: boolean
  reason?: string
  stats?: {
    tagsCreated: number
    listsCreated: number
    collectionsCreated: number
    collectionsSkipped: number
  }
}> {
  const backup = await prisma.backup.findFirst({
    where: { id: backupId, userId },
  })
  if (!backup) return { ok: false, reason: 'NOT_FOUND' }

  if (backup.format !== 'json') {
    return { ok: false, reason: 'UNSUPPORTED_FORMAT' }
  }

  // 从 COS 下载
  let buffer: Buffer
  try {
    buffer = await downloadFromCos(backup.cosKey)
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err), backupId },
      '❌ 备份恢复：COS 下载失败'
    )
    return { ok: false, reason: 'COS_DOWNLOAD_FAILED' }
  }

  // 解析 JSON
  let payload: any
  try {
    payload = JSON.parse(buffer.toString('utf-8'))
  } catch {
    return { ok: false, reason: 'INVALID_JSON' }
  }

  if (!payload || !Array.isArray(payload.collections)) {
    return { ok: false, reason: 'INVALID_PAYLOAD' }
  }

  // 在事务中恢复（一致性 + 失败回滚）
  try {
    const stats = await prisma.$transaction(async (tx) => {
      let tagsCreated = 0
      let listsCreated = 0
      let collectionsCreated = 0
      let collectionsSkipped = 0

      // 1) 加载已有 tag/list（用于按 name 匹配）
      const tagNameToId = new Map<string, string>()
      const existingTags = await tx.tag.findMany({
        where: { userId },
        select: { id: true, nameCn: true },
      })
      existingTags.forEach((t) => tagNameToId.set(t.nameCn, t.id))

      const listNameToId = new Map<string, string>()
      const existingLists = await tx.list.findMany({
        where: { userId },
        select: { id: true, name: true },
      })
      existingLists.forEach((l) => listNameToId.set(l.name, l.id))

      // 2) 恢复 tags（按 name 去重）
      if (Array.isArray(payload.tags)) {
        for (const t of payload.tags) {
          if (!t || typeof t.name !== 'string' || !t.name.trim()) continue
          const name = t.name.trim()
          if (tagNameToId.has(name)) continue
          const created = await tx.tag.create({
            data: { userId, nameCn: name, nameEn: name },
            select: { id: true, nameCn: true },
          })
          tagNameToId.set(created.nameCn, created.id)
          tagsCreated++
        }
      }

      // 3) 恢复 lists（按 name 去重）
      if (Array.isArray(payload.lists)) {
        for (const l of payload.lists) {
          if (!l || typeof l.name !== 'string' || !l.name.trim()) continue
          const name = l.name.trim()
          if (listNameToId.has(name)) continue
          const created = await tx.list.create({
            data: {
              userId,
              name,
              description: typeof l.description === 'string' ? l.description : null,
            },
            select: { id: true, name: true },
          })
          listNameToId.set(created.name, created.id)
          listsCreated++
        }
      }

      // 4) 恢复 collections（按 url 去重 + 关联已有 tag/list）
      for (const c of payload.collections) {
        if (!c || typeof c.url !== 'string' || !c.url.trim()) continue
        const url = c.url.trim()

        const existing = await tx.collection.findFirst({
          where: { userId, url, deletedAt: null },
          select: { id: true },
        })
        if (existing) {
          collectionsSkipped++
          continue
        }

        // 准备 tag 关联
        const tagConnect: { id: string }[] = []
        if (Array.isArray(c.tags)) {
          for (const t of c.tags) {
            if (!t || typeof t.nameCn !== 'string') continue
            const id = tagNameToId.get(t.nameCn.trim())
            if (id) tagConnect.push({ id })
          }
        }

        // 准备 list 关联
        const listConnect: { id: string }[] = []
        if (Array.isArray(c.lists)) {
          for (const l of c.lists) {
            if (!l || typeof l.name !== 'string') continue
            const id = listNameToId.get(l.name.trim())
            if (id) listConnect.push({ id })
          }
        }

        await tx.collection.create({
          data: {
            userId,
            url,
            title: typeof c.title === 'string' && c.title.trim() ? c.title.trim() : url,
            note: typeof c.note === 'string' ? c.note : (typeof c.description === 'string' ? c.description : null),
            platform: typeof c.platform === 'string' ? c.platform : null,
            coverImage: typeof c.coverImage === 'string' ? c.coverImage : null,
            coverStrategy:
              typeof c.coverStrategy === 'string' ? c.coverStrategy : 'auto',
            pageType: typeof c.pageType === 'string' ? c.pageType : 'detail',
            tags: { connect: tagConnect },
            lists: { connect: listConnect },
          },
        })
        collectionsCreated++
      }

      return { tagsCreated, listsCreated, collectionsCreated, collectionsSkipped }
    })

    logger.info(
      { userId, backupId, ...stats },
      '✅ 备份恢复完成（只增不删）'
    )
    return { ok: true, stats }
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err), userId, backupId },
      '❌ 备份恢复失败'
    )
    return { ok: false, reason: 'INTERNAL_ERROR' }
  }
}

// 保留兼容：旧接口 processPendingBackups 仍在使用
export { executeBackup as executeUserBackup }
