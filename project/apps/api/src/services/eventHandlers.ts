/**
 * 核心业务事件处理器注册
 * 在应用启动时调用一次，订阅所有业务事件
 * 处理器异步执行，失败不阻塞主流程
 */
import { onEvent } from '../lib/eventBus'
import logger from '../lib/logger'
import { invalidateQuotaCache } from './quota'

/**
 * 注册所有事件处理器
 * 应在应用启动时调用一次
 */
export function initEventHandlers(): void {
  // ===== 支付成功事件 =====
  onEvent('payment:success', async (payload) => {
    logger.info(
      { userId: payload.userId, tier: payload.tier, source: payload.source, transactionId: payload.transactionId },
      '事件：支付成功'
    )

    // 清除用户配额缓存（ tier 已变更）
    invalidateQuotaCache(payload.userId).catch(() => {})

    // TODO: 发送支付成功邮件通知
    // TODO: 记录到审计日志表
  })

  // ===== 订阅过期事件 =====
  onEvent('subscription:expired', async (payload) => {
    logger.info(
      { userId: payload.userId, oldTier: payload.oldTier, subscriptionId: payload.subscriptionId },
      '事件：订阅过期'
    )

    // 清除用户配额缓存（ tier 已回退）
    invalidateQuotaCache(payload.userId).catch(() => {})

    // TODO: 发送订阅到期提醒邮件
  })

  // ===== 分享创建事件 =====
  onEvent('share:created', async (payload) => {
    logger.info(
      { shareId: payload.shareId, userId: payload.userId, itemCount: payload.itemCount, hasPassword: payload.hasPassword },
      '事件：分享创建'
    )

    // TODO: 分享到广场（如果开启）
    // TODO: 记录分享创建统计
  })

  // ===== 收藏导入事件 =====
  onEvent('collection:imported', async (payload) => {
    logger.info(
      { userId: payload.userId, count: payload.count, format: payload.format },
      '事件：收藏导入'
    )

    // TODO: 发送导入完成通知
    // TODO: 触发批量元数据抓取
  })

  logger.info('✅ 事件处理器已注册')
}
