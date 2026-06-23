/**
 * 极光推送封装
 * 国内版使用极光推送替代 FCM
 * 支持：系统推送、本地提醒
 */

import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { api } from './api'
import { setJiguangAuth } from './privacyAuth'

let JPushModule: any = null
let isJPushAvailable = false

// 动态导入 jpush-react-native（避免 Expo Go 崩溃）
async function loadJPush() {
  if (JPushModule) return JPushModule
  try {
    const module = await import('jpush-react-native')
    JPushModule = module.default || module
    isJPushAvailable = true
    return JPushModule
  } catch (err) {
    console.log('[JPush] SDK not available:', (err as Error).message)
    isJPushAvailable = false
    return null
  }
}

/**
 * 初始化极光推送
 */
export async function initJPush() {
  const JPush = await loadJPush()
  if (!JPush) {
    console.log('[JPush] Using Expo Notifications fallback')
    return
  }

  try {
    // 合规：先开启极光（JCore）数据收集授权，再初始化推送
    await setJiguangAuth(true)
    // 初始化（合规：production 根据 __DEV__ 自动判断，发布构建自动切换为正式环境）
    JPush.init({
      appKey: process.env.EXPO_PUBLIC_JPUSH_APPKEY || '',
      channel: 'default',
      production: !__DEV__,
    })

    // 获取 Registration ID 并上报
    JPush.getRegistrationID(async (id: string) => {
      console.log('[JPush] RegistrationID:', id)
      if (id) {
        try {
          await api.post('/users/push-token', {
            platform: 'jpush',
            token: id,
          })
        } catch (err) {
          console.log('[JPush] Failed to register token:', err)
        }
      }
    })

    // 监听通知点击
    JPush.addNotificationListener((result: any) => {
      console.log('[JPush] Notification received:', result)
      handleNotificationOpen(result)
    })

    // 监听通知打开
    JPush.addLocalNotificationListener((result: any) => {
      console.log('[JPush] Local notification:', result)
      handleNotificationOpen(result)
    })

    console.log('[JPush] Initialized successfully')
  } catch (err) {
    console.error('[JPush] Init failed:', err)
  }
}

/**
 * 处理通知点击
 */
function handleNotificationOpen(result: any) {
  // TODO: 根据通知类型跳转到对应页面
  const { extras } = result || {}
  if (extras?.screen) {
    // 导航到指定页面
    console.log('[JPush] Navigate to:', extras.screen)
  }
}

/**
 * 发送本地通知（收藏成功等）
 * 优先使用极光本地通知，回退到 Expo Notifications
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const JPush = await loadJPush()

  if (JPush && isJPushAvailable) {
    try {
      JPush.addLocalNotification({
        messageID: Date.now().toString(),
        title,
        content: body,
        extras: data || {},
      })
      return
    } catch (err) {
      console.log('[JPush] Local notification failed, fallback to Expo:', err)
    }
  }

  // 回退到 Expo Notifications
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {} },
      trigger: null,
    })
  } catch (err) {
    console.log('[Notifications] schedule failed:', err)
  }
}

/**
 * 收藏成功提醒
 */
export async function notifyCollectionSuccess(title: string) {
  await sendLocalNotification(
    '收藏成功',
    `已保存「${title.substring(0, 30)}${title.length > 30 ? '...' : ''}」`,
    { screen: 'Collections', type: 'collection_success' }
  )
}

/**
 * 系统公告推送（来自服务端）
 * 由后端调用极光 API 发送
 */
export async function handleSystemNotification(title: string, body: string, data?: any) {
  // 系统推送由服务端通过极光 API 发送
  // 此处处理接收到的系统推送
  console.log('[JPush] System notification:', { title, body, data })
}

/**
 * 清除所有通知
 */
export async function clearAllNotifications() {
  const JPush = await loadJPush()
  if (JPush && isJPushAvailable) {
    JPush.clearAllNotifications()
  }
  await Notifications.dismissAllNotificationsAsync()
}

/**
 * 设置别名（用于用户维度推送）
 */
export async function setJPushAlias(userId: string) {
  const JPush = await loadJPush()
  if (JPush && isJPushAvailable) {
    JPush.setAlias({ sequence: 1, alias: userId })
  }
}

/**
 * 删除别名
 */
export async function deleteJPushAlias() {
  const JPush = await loadJPush()
  if (JPush && isJPushAvailable) {
    JPush.deleteAlias({ sequence: 2 })
  }
}
