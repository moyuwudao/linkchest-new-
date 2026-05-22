/**
 * Firebase Analytics 封装
 * 条件初始化：如果未配置 google-services.json 则静默跳过
 */

let analyticsModule: any = null

export async function initAnalytics() {
  try {
    // 先验证 Firebase App 是否已初始化（防止无 google-services.json 时崩溃）
    const { default: firebaseApp } = await import('@react-native-firebase/app')
    const app = firebaseApp()
    if (!app || !app.options) {
      console.log('[Analytics] Firebase app not initialized, skipping analytics')
      return
    }
    const { default: analytics } = await import('@react-native-firebase/analytics')
    analyticsModule = analytics()
    console.log('[Analytics] Firebase Analytics initialized')
  } catch (err) {
    console.log('[Analytics] Firebase not configured, skipping:', (err as Error).message)
  }
}

export async function logEvent(name: string, params?: Record<string, any>) {
  if (!analyticsModule) return
  try {
    await analyticsModule.logEvent(name, params || {})
  } catch (err) {
    console.log('[Analytics] logEvent failed:', (err as Error).message)
  }
}

export async function logScreenView(screenName: string, screenClass?: string) {
  if (!analyticsModule) return
  try {
    await analyticsModule.logScreenView({ screen_name: screenName, screen_class: screenClass || screenName })
  } catch (err) {
    console.log('[Analytics] logScreenView failed:', (err as Error).message)
  }
}

export async function setUserId(userId: string) {
  if (!analyticsModule) return
  try {
    await analyticsModule.setUserId(userId)
  } catch (err) {
    console.log('[Analytics] setUserId failed:', (err as Error).message)
  }
}

export async function setUserProperties(properties: Record<string, string>) {
  if (!analyticsModule) return
  try {
    for (const [key, value] of Object.entries(properties)) {
      await analyticsModule.setUserProperty(key, value)
    }
  } catch (err) {
    console.log('[Analytics] setUserProperties failed:', (err as Error).message)
  }
}
