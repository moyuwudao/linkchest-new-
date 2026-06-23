/**
 * 隐私政策同意状态管理
 *
 * 合规要求：
 * 1. 用户首次启动 APP 时必须弹窗明示隐私政策
 * 2. 用户同意前，禁止初始化任何会收集个人信息的 SDK（极光、Firebase、Expo Notifications 权限请求等）
 * 3. 同意状态持久化到 AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const PRIVACY_CONSENT_KEY = 'linkchest_privacy_consent'
const PRIVACY_VERSION = '2026-06-22' // 隐私政策版本号，更新政策时递增

export interface PrivacyConsent {
  agreed: boolean
  version: string
  agreedAt: number // 时间戳
}

/**
 * 读取隐私同意状态
 */
export async function getPrivacyConsent(): Promise<PrivacyConsent | null> {
  try {
    const raw = await AsyncStorage.getItem(PRIVACY_CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PrivacyConsent
    // 政策版本变化时需重新同意
    if (parsed.version !== PRIVACY_VERSION) return null
    return parsed
  } catch (err) {
    console.log('[Privacy] getPrivacyConsent error:', err)
    return null
  }
}

/**
 * 用户是否已同意当前版本的隐私政策
 */
export async function isPrivacyAgreed(): Promise<boolean> {
  const consent = await getPrivacyConsent()
  return !!consent?.agreed
}

/**
 * 写入用户同意
 */
export async function setPrivacyAgreed(): Promise<void> {
  const data: PrivacyConsent = {
    agreed: true,
    version: PRIVACY_VERSION,
    agreedAt: Date.now(),
  }
  await AsyncStorage.setItem(PRIVACY_CONSENT_KEY, JSON.stringify(data))
}

/**
 * 撤回同意（账号设置中提供）
 * 撤回后下次启动应用会重新弹出隐私政策弹窗
 */
export async function revokePrivacyConsent(): Promise<void> {
  await AsyncStorage.removeItem(PRIVACY_CONSENT_KEY)
}

/**
 * 获取同意时间戳（用于在 UI 中展示）
 */
export async function getPrivacyAgreedAt(): Promise<number | null> {
  const consent = await getPrivacyConsent()
  return consent?.agreedAt ?? null
}

export { PRIVACY_VERSION }
