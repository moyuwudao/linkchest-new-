const fs = require('fs');
const path = require('path');

// 从 .env.market 文件读取 MARKET 值（构建脚本在构建前写入）
// 如果文件不存在，回退到 process.env.MARKET，再回退到 'global'
let marketValue = 'global';
const envMarketPath = path.join(__dirname, '.env.market');
try {
  if (fs.existsSync(envMarketPath)) {
    marketValue = fs.readFileSync(envMarketPath, 'utf8').trim() || 'global';
  } else if (process.env.MARKET) {
    marketValue = process.env.MARKET;
  }
} catch (e) {
  // 文件读取失败，使用默认值
  if (process.env.MARKET) {
    marketValue = process.env.MARKET;
  }
}

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
      // 国内版需要允许 HTTP 明文流量（国内服务器无 HTTPS）
      usesCleartextTraffic: marketValue === 'china',
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
      googleServicesFile: './google-services.json',
    },
    scheme: 'com.linkchest.app',
    extra: {
      eas: {
        projectId: '0e21d7b3-d4f6-4cb3-b123-0baf43fcaa00',
      },
      googleClientId: '320062761256-ij1tcnvnpp93oqtraof0uadu7fu6hkun.apps.googleusercontent.com',
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
