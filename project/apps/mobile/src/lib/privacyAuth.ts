/**
 * 合规模块：控制极光 SDK（JCore）的数据收集授权
 *
 * 对应 Android Native Module: PrivacyAuthModule (com.linkchest.app.privacy)
 *
 * 调用时机：
 * - App 启动时：MainApplication.onCreate() 已自动调用 JCollectionAuth.setAuth(false)
 * - 用户同意隐私政策后：调用 setJiguangAuth(true) 允许极光收集
 * - 用户撤回同意后：调用 setJiguangAuth(false) 禁止极光收集
 */

import { NativeModules, Platform } from 'react-native'

const { PrivacyAuth } = NativeModules

/**
 * 设置极光数据收集授权
 * @param enabled true=允许收集, false=禁止收集
 */
export async function setJiguangAuth(enabled: boolean): Promise<boolean> {
  if (Platform.OS !== 'android' || !PrivacyAuth) {
    // iOS 或无此模块时不报错
    return false
  }
  try {
    return await PrivacyAuth.setJiguangAuth(enabled)
  } catch (e) {
    console.warn('[PrivacyAuth] setJiguangAuth 失败:', e)
    return false
  }
}

/**
 * 查询当前极光数据收集授权状态
 */
export async function isJiguangAuthorized(): Promise<boolean> {
  if (Platform.OS !== 'android' || !PrivacyAuth) {
    return false
  }
  try {
    return await PrivacyAuth.isJiguangAuthorized()
  } catch (e) {
    return false
  }
}