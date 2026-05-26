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
      res.on('end', () => resolve({ html: data, status: res.statusCode, headers: res.headers }));
    }).on('error', reject);
  });
}

fetchHtml('https://www.xiaohongshu.com/explore/6a0fc3b40000000035033ae5').then(({ html, status, headers }) => {
  console.log('Status:', status);
  console.log('HTML length:', html.length);
  console.log('Has __INITIAL_STATE__:', html.includes('__INITIAL_STATE__'));
  console.log('First 500 chars:');
  console.log(html.substring(0, 500));
  console.log('\n--- Last 500 chars ---');
  console.log(html.substring(html.length - 500));
  process.exit(0);
}).catch(err => {
  console.log('ERROR:', err.message);
  process.exit(1);
});
