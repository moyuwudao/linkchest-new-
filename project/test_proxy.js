const https = require('https');
const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function testProxy() {
  try {
    // 测试代理路由（需要认证，先用错误token测试路由是否存在）
    const resp = await fetch('http://localhost:3001/api/collections/proxy-metadata?url=https://www.baidu.com', {
      headers: { 'Authorization': 'Bearer invalid_token' }
    });
    console.log('STATUS:', resp.status);
    console.log('BODY:', resp.body.substring(0, 200));
  } catch (e) {
    console.log('PROXY ERROR:', e.message);
  }
}

testProxy();
