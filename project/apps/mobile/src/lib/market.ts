import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

let _cachedMarket: 'china' | 'global' | null = null;

function _detectMarket(): 'china' | 'global' {
  if (_cachedMarket) return _cachedMarket;

  // 调试：打印 Constants 内容（仅开发时可见）
  const expoConfig = Constants.expoConfig;
  const androidConfig = expoConfig?.android;
  const extra = (expoConfig as any)?.extra;

  console.log('[market.ts] Constants.expoConfig:', JSON.stringify({
    hasExpoConfig: !!expoConfig,
    hasAndroid: !!androidConfig,
    package: androidConfig?.package,
    extraMarket: extra?.market,
    platform: Platform.OS,
  }));

  // 如果 Constants.expoConfig 还没准备好，返回 global 但不缓存
  // 避免模块加载时（Constants 未就绪）错误缓存为 global
  if (!expoConfig) {
    console.log('[market.ts] Constants.expoConfig 未就绪，返回 global (不缓存)');
    return 'global';
  }

  // 1. 优先检查 Android package name（最可靠，构建时固定）
  const pkg = androidConfig?.package;
  if (pkg === 'cn.linkchest.app') {
    console.log('[market.ts] 检测到国内版 (包名)');
    _cachedMarket = 'china';
    return 'china';
  }
  if (pkg === 'com.linkchest.app') {
    console.log('[market.ts] 检测到海外版 (包名)');
    _cachedMarket = 'global';
    return 'global';
  }

  // 2. 回退到 extra.market
  const market = extra?.market;
  if (market === 'china' || market === 'global') {
    console.log('[market.ts] 检测到市场 (extra.market):', market);
    _cachedMarket = market;
    return market;
  }

  // 3. 尝试从原生模块获取包名（最终回退）
  try {
    const platformConstants = NativeModules.PlatformConstants;
    const nativePackage = platformConstants?.packageName || (NativeModules as any).AppInfo?.packageName;
    if (nativePackage === 'cn.linkchest.app') {
      console.log('[market.ts] 检测到国内版 (原生模块)');
      _cachedMarket = 'china';
      return 'china';
    }
    if (nativePackage === 'com.linkchest.app') {
      console.log('[market.ts] 检测到海外版 (原生模块)');
      _cachedMarket = 'global';
      return 'global';
    }
  } catch (e) {
    // 忽略错误
  }

  console.log('[market.ts] 无法检测市场，默认 global');
  _cachedMarket = 'global';
  return 'global';
}

/** 同步获取市场（国内/海外） */
export function getMarketSync(): 'china' | 'global' {
  return _detectMarket();
}

/** 是否国内版 */
export function isChinaMarket(): boolean {
  return getMarketSync() === 'china';
}

/** 是否海外版 */
export function isGlobalMarket(): boolean {
  return getMarketSync() === 'global';
}
