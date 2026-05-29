const fs = require('fs');
const path = require('path');

// 从环境变量或 .env.market 文件读取 MARKET 值
// 优先顺序:
//   1. process.env.MARKET（构建脚本设置）
//   2. /tmp/.env.market.{WSL_DISTRO_NAME}（实例隔离文件）
//   3. .env.market.{flavor}（flavor 特定文件）
//   4. .env.market（共享文件）
//   5. 'global'（默认值）
let marketValue = 'global';

// 1. 优先使用环境变量（构建脚本设置）
if (process.env.MARKET) {
  marketValue = process.env.MARKET;
} else {
  // 2. 尝试读取实例隔离的 .env.market 文件（关键：避免并行构建竞争）
  const wslDistroName = process.env.WSL_DISTRO_NAME || '';
  const envMarketIsolatedPath = wslDistroName
    ? `/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market.${wslDistroName}`
    : null;

  // 3. 尝试检测当前构建的 flavor（从 Gradle 任务）
  const gradleTask = process.env.GRADLE_TASK || '';
  const detectedFlavor = gradleTask.includes('China') ? 'china' :
                         gradleTask.includes('Global') ? 'global' : '';

  // 4. 使用 flavor 特定的文件
  const envMarketFlavorPath = detectedFlavor
    ? path.join(__dirname, `.env.market.${detectedFlavor}`)
    : null;
  const envMarketPath = path.join(__dirname, '.env.market');

  try {
    // 优先读取实例隔离文件（并行构建时最安全）
    if (envMarketIsolatedPath && fs.existsSync(envMarketIsolatedPath)) {
      marketValue = fs.readFileSync(envMarketIsolatedPath, 'utf8').trim() || 'global';
    }
    // 其次读取 flavor 特定文件
    else if (envMarketFlavorPath && fs.existsSync(envMarketFlavorPath)) {
      marketValue = fs.readFileSync(envMarketFlavorPath, 'utf8').trim() || 'global';
    }
    // 最后读取共享文件
    else if (fs.existsSync(envMarketPath)) {
      marketValue = fs.readFileSync(envMarketPath, 'utf8').trim() || 'global';
    }
  } catch (e) {
    // 文件读取失败，使用默认值
  }
}

// 最终校验：如果检测到 WSL 实例名与 market 值冲突，发出警告
const wslName = process.env.WSL_DISTRO_NAME || '';
if (wslName === 'linkchest-cn' && marketValue !== 'china') {
  console.warn(`[app.config.js] 警告: WSL 实例为 linkchest-cn，但 MARKET=${marketValue}，强制修正为 china`);
  marketValue = 'china';
}
if (wslName === 'linkchest-global' && marketValue !== 'global') {
  console.warn(`[app.config.js] 警告: WSL 实例为 linkchest-global，但 MARKET=${marketValue}，强制修正为 global`);
  marketValue = 'global';
}

// 调试日志：确认最终使用的 market 值
console.log(`[app.config.js] 最终 marketValue: "${marketValue}"`);
console.log(`[app.config.js] 环境变量 MARKET: "${process.env.MARKET || '未设置'}"`);
console.log(`[app.config.js] WSL_DISTRO_NAME: "${process.env.WSL_DISTRO_NAME || '未设置'}"`);

module.exports = {
  expo: {
    name: marketValue === 'china' ? '链藏' : 'LinkChest',
    slug: 'collecthub',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#F7F5F0',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: marketValue === 'china'
        ? 'cn.linkchest.app'
        : 'com.linkchest.app',
    },
    android: {
      package: marketValue === 'china'
        ? 'cn.linkchest.app'
        : 'com.linkchest.app',
      // 国内服务器已启用HTTPS，无需明文流量
      usesCleartextTraffic: false,
      permissions: [],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1E2E48',
      },
      intentFilters: [
        {
          action: 'SEND',
          category: ['DEFAULT'],
          mimeType: 'text/plain',
        },
      ],
      queries: [
        {
          intent: [
            {
              action: ['android.intent.action.VIEW'],
              data: [
                { scheme: 'snssdk1128' },
                { scheme: 'douyin' },
                { scheme: 'kwai' },
                { scheme: 'bilibili' },
                { scheme: 'snssdk1112' },
                { scheme: 'tenvideo2' },
                { scheme: 'youku' },
                { scheme: 'iqiyi' },
                { scheme: 'mgtv' },
                { scheme: 'sohuvideo' },
                { scheme: 'pipix' },
                { scheme: 'sinaweibo' },
                { scheme: 'xhsdiscover' },
                { scheme: 'zhihu' },
                { scheme: 'com.baidu.tieba' },
                { scheme: 'douban' },
                { scheme: 'hupu' },
                { scheme: 'jike' },
                { scheme: 'weixin' },
                { scheme: 'snssdk141' },
                { scheme: 'orpheus' },
                { scheme: 'qqmusic' },
                { scheme: 'kugou' },
                { scheme: 'kuwo' },
                { scheme: 'ximalaya' },
                { scheme: 'taobao' },
                { scheme: 'openapp.jdmobile' },
                { scheme: 'pinduoduo' },
                { scheme: 'vipshop' },
                { scheme: 'dewu' },
                { scheme: 'dianping' },
                { scheme: 'imeituan' },
                { scheme: 'mafengwo' },
                { scheme: 'xueqiu' },
              ],
            },
          ],
        },
      ],
      googleServicesFile: marketValue === 'global' ? './google-services.json' : undefined,
    },
    scheme: 'com.linkchest.app',
    extra: {
      eas: {
        projectId: '0e21d7b3-d4f6-4cb3-b123-0baf43fcaa00',
      },
      googleClientId: marketValue === 'global'
        ? '76720591248-m75hgr8256hut3m5j835qhgmirr9bnuh.apps.googleusercontent.com'
        : undefined,
      googleClientIdAndroid: marketValue === 'global'
        ? '76720591248-ght8qghfrjiq6bsrjhe5dpv2pmtcu8df.apps.googleusercontent.com'
        : undefined,
      market: marketValue || 'global',
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            // 国内版允许 HTTP 明文流量，海外版禁止
            usesCleartextTraffic: marketValue === 'china',
          },
        },
      ],
    ],
  },
};
