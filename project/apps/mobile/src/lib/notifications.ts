/**
 * 推送通知封装 (FCM + Expo Notifications)
 * 条件初始化：如果未配置 FCM 则回退到 Expo Notifications 本地通知
 *
 * 合规说明：
 * - setNotificationHandler 仅设置展示规则，不收集任何个人信息（属于安全行为）
 * - initNotifications() 内的权限请求和 Firebase 加载，必须在用户同意隐私政策后才调用
 */

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

let messagingModule: any = null

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function initNotifications() {
  try {
    // 先验证 Firebase App 是否已初始化（防止无 google-services.json 时崩溃）
    const { default: firebaseApp } = await import('@react-native-firebase/app')
    const app = firebaseApp()
    if (!app || !app.options) {
      console.log('[Notifications] Firebase app not initialized, using Expo Notifications only')
      throw new Error('Firebase not configured')
    }
    // 尝试加载 FCM
    const { default: messaging } = await import('@react-native-firebase/messaging')
    messagingModule = messaging()
    console.log('[Notifications] FCM initialized')
  } catch (err) {
    console.log('[Notifications] FCM not available, using Expo Notifications:', (err as Error).message)
  }

  // 请求本地通知权限
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    console.log('[Notifications] Permission status:', finalStatus)
  }
}

export async function getPushToken(): Promise<string | null> {
  if (messagingModule) {
    try {
      return await messagingModule.getToken()
    } catch (err) {
      console.log('[Notifications] getFCMToken failed:', (err as Error).message)
    }
  }
  // 回退到 Expo Push Token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    return tokenData.data
  } catch (err) {
    console.log('[Notifications] getExpoPushToken failed:', (err as Error).message)
    return null
  }
}

export async function onMessage(handler: (message: any) => void) {
  if (messagingModule) {
    return messagingModule.onMessage(handler)
  }
  // Expo Notifications 回退
  return Notifications.addNotificationReceivedListener(handler)
}

export async function onNotificationOpenedApp(handler: (message: any) => void) {
  if (messagingModule) {
    return messagingModule.onNotificationOpenedApp(handler)
  }
  return Notifications.addNotificationResponseReceivedListener(handler)
}

export async function scheduleLocalNotification(title: string, body: string, data?: Record<string, any>) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {} },
      trigger: null, // 立即发送
    })
  } catch (err) {
    console.log('[Notifications] scheduleLocalNotification failed:', (err as Error).message)
  }
}
