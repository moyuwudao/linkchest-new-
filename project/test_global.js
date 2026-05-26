const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      timeout: 15000,
      rejectUnauthorized: false
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ html: data, status: res.statusCode }));
    }).on('error', reject);
  });
}

(async () => {
  console.log('Testing from this machine...');
  const douyin = await fetchHtml('https://www.douyin.com/user/MS4wLjABAAAA7r3nFeL4x8mRiaH-4R2N1p5n5n5n5n5n5n5n5n5n5n5n?modal_id=7632279378365815909');
  console.log('Douyin status:', douyin.status, 'length:', douyin.html.length);
  console.log('Has SSR:', douyin.html.includes('_SSR_HYDRATED_DATA'));
  console.log('Has jsvmprt:', douyin.html.includes('_$jsvmprt'));

  const xhs = await fetchHtml('https://www.xiaohongshu.com/explore/6a0fc3b40000000035033ae5');
  console.log('\nXHS status:', xhs.status, 'length:', xhs.html.length);
  console.log('Has INITIAL_STATE:', xhs.html.includes('__INITIAL_STATE__'));
  console.log('Has sec:', xhs.html.includes('xhs_sec'));
})();
