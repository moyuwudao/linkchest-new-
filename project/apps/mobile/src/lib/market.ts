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

  // 1. 优先检查 extra.market（构建时注入，最可靠）
  // 包名统一为 com.linkchest.app 后，无法用包名判断市场
  // 构建脚本会在 .env.market 中写入 china/global，由 app.config.js 注入到 extra.market
  const market = extra?.market;
  if (market === 'china' || market === 'global') {
    console.log('[market.ts] 检测到市场 (extra.market):', market);
    _cachedMarket = market;
    return market;
  }

  // 2. 备用：检查 iOS/Android applicationId（兼容历史逻辑）
  const iosBundleId = (expoConfig as any)?.ios?.bundleIdentifier;
  const androidPackage = androidConfig?.package;
  if (androidPackage === 'com.linkchest.app' || iosBundleId === 'com.linkchest.app') {
    // 包名/bundleId 已统一为 com.linkchest.app，无法单凭此判断市场
    // 继续走下一步判断
  }

  // 3. 备用：从原生模块获取包名 + 应用名判断
  try {
    const platformConstants = NativeModules.PlatformConstants;
    const nativePackage = platformConstants?.packageName || (NativeModules as any).AppInfo?.packageName;
    // 包名统一为 com.linkchest.app 后，单独用包名无法判断
    // 尝试通过 app_name 区分（"链藏"=国内，"LinkChest"=海外）
    const appName = (NativeModules as any).AppInfo?.appName
      || androidConfig?.package  // 兜底
      || '';
    if (appName === '链藏' || (NativeModules as any).LinkChestMarket?.isChina === true) {
      console.log('[market.ts] 检测到国内版 (app_name)');
      _cachedMarket = 'china';
      return 'china';
    }
    if (nativePackage === 'com.linkchest.app') {
      console.log('[market.ts] 检测到包名，默认 global');
      // 不缓存，留给后续判断
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
