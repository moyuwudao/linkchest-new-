/**
 * 轻量级类型安全事件总线
 * 用于解耦核心业务事件与后续操作（通知、缓存清理、指标等）
 * - 基于 Node.js EventEmitter，零外部依赖
 * - 处理器异步执行，失败不阻塞主流程
 * - 支持事件审计日志（可选持久化到数据库）
 */
import { EventEmitter } from 'events'
import logger from './logger'

// ===== 事件类型定义 =====

export interface EventMap {
  'payment:success': {
    userId: string
    tier: string
    billingCycle: string
    source: string
    transactionId: string
    priceCny: number
    priceUsd: number
    expiresAt: Date
  }
  'subscription:expired': {
    userId: string
    oldTier: string
    subscriptionId: string
  }
  'share:created': {
    shareId: string
    userId: string
    itemCount: number
    hasPassword: boolean
  }
  'collection:imported': {
    userId: string
    count: number
    format: string
  }
}

export type EventName = keyof EventMap

// ===== 事件总线实现 =====

class TypedEventBus {
  private emitter = new EventEmitter()

  /**
   * 发布事件
   * 处理器异步执行，失败不抛出
   */
  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    // 立即返回，处理器在后台执行
    setImmediate(() => {
      this.emitter.emit(event, payload)
    })
  }

  /**
   * 订阅事件
   * @param event 事件名
   * @param handler 处理器（可异步）
   * @returns 取消订阅函数
   */
  on<K extends EventName>(
    event: K,
    handler: (payload: EventMap[K]) => Promise<void> | void
  ): () => void {
    const wrappedHandler = async (payload: EventMap[K]) => {
      try {
        await handler(payload)
      } catch (err) {
        logger.error(
          { event, err: err instanceof Error ? err.message : String(err), payload },
          '事件处理器失败'
        )
      }
    }

    this.emitter.on(event, wrappedHandler)

    // 返回取消订阅函数
    return () => {
      this.emitter.off(event, wrappedHandler)
    }
  }

  /**
   * 一次性订阅（处理一次后自动取消）
   */
  once<K extends EventName>(
    event: K,
    handler: (payload: EventMap[K]) => Promise<void> | void
  ): void {
    const wrappedHandler = async (payload: EventMap[K]) => {
      try {
        await handler(payload)
      } catch (err) {
        logger.error(
          { event, err: err instanceof Error ? err.message : String(err), payload },
          '事件处理器失败'
        )
      }
    }

    this.emitter.once(event, wrappedHandler)
  }

  /** 获取当前监听的事件列表（调试用） */
  eventNames(): EventName[] {
    return this.emitter.eventNames() as EventName[]
  }

  /** 获取某个事件的监听器数量 */
  listenerCount<K extends EventName>(event: K): number {
    return this.emitter.listenerCount(event)
  }
}

export const eventBus = new TypedEventBus()

// ===== 便捷导出 =====

/** 发布事件 */
export function emitEvent<K extends EventName>(event: K, payload: EventMap[K]): void {
  eventBus.emit(event, payload)
}

/** 订阅事件 */
export function onEvent<K extends EventName>(
  event: K,
  handler: (payload: EventMap[K]) => Promise<void> | void
): () => void {
  return eventBus.on(event, handler)
}
