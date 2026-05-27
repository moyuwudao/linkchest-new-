import Constants from 'expo-constants';

/**
 * 判断当前是否为国内版市场
 * 使用多重回退策略确保可靠性：
 * 1. Constants.expoConfig.extra.market（构建时注入）
 * 2. Constants.expoConfig.android.package（包名判断）
 * 3. 默认 global
 */
export function isChinaMarket(): boolean {
  try {
    const market = Constants.expoConfig?.extra?.market as string | undefined;
    if (market === 'china') return true;
    if (market === 'global') return false;

    const androidPackage = Constants.expoConfig?.android?.package || '';
    if (androidPackage === 'cn.linkchest.app') return true;
    if (androidPackage === 'com.linkchest.app') return false;

    // 兜底：如果都检测不到，通过应用名称判断
    const appName = Constants.expoConfig?.name || '';
    if (appName === '链藏') return true;
    if (appName === 'LinkChest') return false;

    return false;
  } catch {
    return false;
  }
}

/**
 * 获取当前市场标识
 */
export function getMarket(): 'china' | 'global' {
  return isChinaMarket() ? 'china' : 'global';
}
