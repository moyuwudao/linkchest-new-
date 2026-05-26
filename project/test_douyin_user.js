const https = require('https');

// 测试抖音用户页
const douyinUserUrl = 'https://www.douyin.com/user/MS4wLjABAAAAz4g52Q02PnA';
console.log('=== 测试抖音用户页 ===');
console.log('URL:', douyinUserUrl);

https.get(douyinUserUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('响应状态:', res.statusCode);

    // 查找 _SSR_HYDRATED_DATA
    const ssrMatch = data.match(/<script>window\._SSR_HYDRATED_DATA=(.+?)<\/script>/)
      || data.match(/window\._SSR_HYDRATED_DATA\s*=\s*(.+?);\s*<\/script>/);

    if (ssrMatch) {
      console.log('找到 _SSR_HYDRATED_DATA，长度:', ssrMatch[1].length);
      try {
        const state = JSON.parse(ssrMatch[1]);
        console.log('顶层 keys:', Object.keys(state).join(', '));

        const app = state?.app;
        if (app) {
          console.log('app keys:', Object.keys(app).join(', '));

          // 查找用户信息
          const userInfo = app.user?.userInfo || app.author || app.userInfo;
          if (userInfo) {
            console.log('用户昵称:', userInfo.nickname || userInfo.shortId);
            console.log('头像:', userInfo.avatar?.urlList?.[0] || userInfo.avatarUrl);
          }

          // 查找视频列表
          const videoList = app.videoList || app.itemList || [];
          console.log('视频数量:', videoList.length);
          if (videoList.length > 0) {
            console.log('第一个视频标题:', videoList[0].title || videoList[0].desc);
            console.log('第一个视频封面:', videoList[0].cover?.urlList?.[0]);
          }
        }
      } catch (e) {
        console.log('JSON 解析错误:', e.message);
      }
    } else {
      console.log('未找到 _SSR_HYDRATED_DATA');
      console.log('HTML 前500字符:', data.substring(0, 500));
    }
  });
}).on('error', (e) => console.error('请求错误:', e.message));
