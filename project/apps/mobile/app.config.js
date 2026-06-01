const fs = require('fs');
const path = require('path');

// 从 .env.market 文件或环境变量读取 MARKET 值
// 优先顺序:
//   1. .env.market 文件（最可靠，构建脚本写入）
//   2. process.env.MARKET（构建脚本设置）
//   3. 'global'（默认值）
let marketValue = 'global';

// 1. 优先读取 .env.market 文件（最可靠）
const envMarketPath = path.join(__dirname, '.env.market');
try {
  if (fs.existsSync(envMarketPath)) {
    marketValue = fs.readFileSync(envMarketPath, 'utf8').trim() || 'global';
  }
} catch (e) {
  // 文件读取失败
}

// 2. 如果 .env.market 不存在，回退到环境变量
if (marketValue === 'global' && process.env.MARKET) {
  marketValue = process.env.MARKET;
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
