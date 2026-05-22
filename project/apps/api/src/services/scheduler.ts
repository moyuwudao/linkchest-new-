import cron from 'node-cron'
import prisma from '../lib/prisma'
import { cleanupOrphanedCovers } from './cover'
import { expireSubscriptions } from './subscription'
import { processPendingBackups } from './backup'
import logger from '../lib/logger'
import { withDistributedLock } from '../lib/redlock'
import { updateUserDistributionMetrics, updateDauMetrics } from './prom-metrics'
import {
  SHARE_ITEM_RETENTION_DAYS,
  SHARE_ITEM_ACTIVE_RETENTION_DAYS,
  ERROR_EVENT_RETENTION_DAYS,
  TRASH_RETENTION_DAYS,
  IMPORT_BATCH_SIZE,
} from '../lib/constants'

/**
 * ShareItem 差异化清理策略（DB-02）
 * - 活跃分享关联的快照：保留 SHARE_ITEM_ACTIVE_RETENTION_DAYS 天
 * - 非活跃/孤立快照：保留 SHARE_ITEM_RETENTION_DAYS 天
 * - 关联收藏已删除的快照：按上述规则处理
 */
async function cleanupOrphanedShareItems(): Promise<void> {
  const activeCutoff = new Date()
  activeCutoff.setDate(activeCutoff.getDate() - SHARE_ITEM_ACTIVE_RETENTION_DAYS)

  const inactiveCutoff = new Date()
  inactiveCutoff.setDate(inactiveCutoff.getDate() - SHARE_ITEM_RETENTION_DAYS)

  try {
    // 1. 清理非活跃分享关联的孤立快照（ SHARE_ITEM_RETENTION_DAYS 天）
    const inactiveResult = await prisma.shareItem.deleteMany({
      where: {
        collectionId: null,
        share: { isActive: false },
        createdAt: { lte: inactiveCutoff },
      },
    })

    // 2. 清理活跃分享关联的孤立快照（ SHARE_ITEM_ACTIVE_RETENTION_DAYS 天，更宽松）
    const activeResult = await prisma.shareItem.deleteMany({
      where: {
        collectionId: null,
        share: { isActive: true },
        createdAt: { lte: activeCutoff },
      },
    })

    const totalDeleted = inactiveResult.count + activeResult.count
    if (totalDeleted > 0) {
      logger.info(
        { deleted: totalDeleted, inactive: inactiveResult.count, active: activeResult.count },
        '🗑️ ShareItem 差异化清理完成'
      )
    }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '❌ ShareItem 差异化清理失败')
  }
}

// ErrorEvent 表自动清理：删除 ERROR_EVENT_RETENTION_DAYS 天前已处理（confirmed/ignored/fixed）的错误记录
async function cleanupResolvedErrorEvents(): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - ERROR_EVENT_RETENTION_DAYS)

  try {
    const result = await prisma.errorEvent.deleteMany({
      where: {
        status: { in: ['confirmed', 'ignored', 'fixed'] },
        lastAt: { lte: cutoffDate },
      },
    })
    if (result.count > 0) {
      logger.info({ deleted: result.count }, '🗑️ ErrorEvent 历史记录清理完成')
    }
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '❌ ErrorEvent 历史记录清理失败')
  }
}

let isInitialized = false

// 回收站自动清理：删除 deletedAt 超过 TRASH_RETENTION_DAYS 天的收藏
async function cleanupExpiredTrash(): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - TRASH_RETENTION_DAYS)

  try {
    // 先查找要删除的收藏 ID（用于清理关联的封面）
    const expiredCollections = await prisma.collection.findMany({
      where: {
        deletedAt: { not: null, lte: cutoffDate },
      },
      select: { id: true },
    })

    if (expiredCollections.length === 0) return

    const ids = expiredCollections.map(c => c.id)

    // 批量物理删除，每批 IMPORT_BATCH_SIZE 条
    let deleted = 0
    for (let i = 0; i < ids.length; i += IMPORT_BATCH_SIZE) {
      const batch = ids.slice(i, i + IMPORT_BATCH_SIZE)
      const result = await prisma.collection.deleteMany({
        where: { id: { in: batch } },
      })
      deleted += result.count
    }

    logger.info({ deleted, total: ids.length }, '🗑️ 回收站过期收藏清理完成')
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '❌ 回收站过期收藏清理失败')
  }
}

/**
 * 注册所有定时任务
 * 应在应用启动时调用一次
 */
export function initScheduler(): void {
  if (isInitialized) return
  isInitialized = true

  // 每日凌晨 3:00 清理未关联的过期封面（北京时间）
  cron.schedule('0 3 * * *', async () => {
    await withDistributedLock('cleanup-covers', 600_000, async () => {
      logger.info('🕐 开始执行封面清理任务...')
      try {
        const result = await cleanupOrphanedCovers()
        logger.info({ deleted: result.deleted, errors: result.errors }, '✅ 封面清理完成')
      } catch (err) {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, '❌ 封面清理任务失败')
      }
    })
  }, { timezone: 'Asia/Shanghai' })

  // 每小时整点检查过期订阅并回退
  cron.schedule('0 * * * *', async () => {
    await withDistributedLock('expire-subscriptions', 300_000, async () => {
      try {
        const count = await expireSubscriptions()
        if (count > 0) {
          logger.info({ count }, '✅ 订阅到期回退完成')
        }
      } catch (err) {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, '❌ 订阅到期检查任务失败')
      }
    })
  })

  // 每日凌晨 4:00 清理回收站中超过 30 天的收藏（北京时间）
  cron.schedule('0 4 * * *', async () => {
    await withDistributedLock('cleanup-trash', 600_000, async () => {
      logger.info('🕐 开始执行回收站过期清理任务...')
      await cleanupExpiredTrash()
    })
  }, { timezone: 'Asia/Shanghai' })

  // 每周日凌晨 5:00 执行用户自动备份（北京时间）
  cron.schedule('0 5 * * 0', async () => {
    await withDistributedLock('user-backup', 1_800_000, async () => {
      logger.info('🕐 开始执行用户自动备份任务...')
      try {
        const result = await processPendingBackups()
        logger.info({ result }, '✅ 用户自动备份任务完成')
      } catch (err) {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, '❌ 用户自动备份任务失败')
      }
    })
  }, { timezone: 'Asia/Shanghai' })

  // 每周日凌晨 6:00 清理孤立 ShareItem 快照（超过 180 天且关联收藏已删除）
  cron.schedule('0 6 * * 0', async () => {
    await withDistributedLock('cleanup-share-items', 300_000, async () => {
      logger.info('🕐 开始执行 ShareItem 孤立快照清理任务...')
      await cleanupOrphanedShareItems()
    })
  }, { timezone: 'Asia/Shanghai' })

  // 每日凌晨 5:30 清理 30 天前已处理的 ErrorEvent
  cron.schedule('30 5 * * *', async () => {
    await withDistributedLock('cleanup-error-events', 300_000, async () => {
      logger.info('🕐 开始执行 ErrorEvent 历史记录清理任务...')
      await cleanupResolvedErrorEvents()
    })
  }, { timezone: 'Asia/Shanghai' })

  // 每 10 分钟更新 Prometheus 用户分布指标
  cron.schedule('*/10 * * * *', async () => {
    await withDistributedLock('update-user-metrics', 120_000, async () => {
      await updateUserDistributionMetrics(prisma)
    })
  })

  // 每日凌晨 0:10 更新 DAU 指标
  cron.schedule('10 0 * * *', async () => {
    await withDistributedLock('update-dau', 120_000, async () => {
      await updateDauMetrics(prisma)
    })
  }, { timezone: 'Asia/Shanghai' })

  console.log('✅ 定时任务已注册')
}
