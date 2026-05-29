/**
 * 认证 Provider 懒加载入口
 * 根据当前市场配置，动态加载可用的认证 Provider
 */

import type { AuthProvider, AuthSource } from './types'
import { isAuthProviderEnabled, assertProviderEnabled } from '../../lib/market'

// Provider 懒加载映射表
const providerLoaders: Record<AuthSource, () => Promise<AuthProvider>> = {
  email: async () => {
    const { EmailAuthProvider } = await import('./email')
    return new EmailAuthProvider()
  },
  google: async () => {
    const { GoogleAuthProvider } = await import('./google')
    return new GoogleAuthProvider()
  },
  apple: async () => {
    const { AppleAuthProvider } = await import('./apple')
    return new AppleAuthProvider()
  },
  wechat: async () => {
    const { WechatAuthProvider } = await import('./wechat')
    return new WechatAuthProvider()
  },
}

// Provider 实例缓存
const providerCache = new Map<AuthSource, AuthProvider>()

/**
 * 获取指定认证 Provider
 * 如果当前市场未启用该 Provider，抛出 MarketGuardError
 */
export async function getAuthProvider(source: AuthSource): Promise<AuthProvider> {
  assertProviderEnabled('auth', source)

  const cached = providerCache.get(source)
  if (cached) return cached

  const loader = providerLoaders[source]
  if (!loader) {
    throw new Error(`Unknown auth provider: ${source}`)
  }

  const provider = await loader()
  providerCache.set(source, provider)
  return provider
}

/**
 * 获取当前市场所有已启用的认证 Provider
 */
export async function getEnabledAuthProviders(): Promise<AuthProvider[]> {
  const sources = Object.entries(providerLoaders)
    .filter(([source]) => isAuthProviderEnabled(source as AuthSource))
    .map(([source]) => source as AuthSource)

  return Promise.all(sources.map((s) => getAuthProvider(s)))
}

/**
 * 获取当前市场已启用的认证 Provider 名称列表
 */
export function getEnabledAuthProviderNames(): AuthSource[] {
  return (Object.keys(providerLoaders) as AuthSource[]).filter((source) =>
    isAuthProviderEnabled(source)
  )
}

/**
 * 清除 Provider 缓存（主要用于测试）
 */
export function clearAuthProviderCache(): void {
  providerCache.clear()
}
