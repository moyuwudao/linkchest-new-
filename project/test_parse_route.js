const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(30000);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function test() {
  console.log('=== 测试 /parse 路由 ===');
  
  const resp = await fetch('http://localhost:3001/api/collections/parse', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.douyin.com/jingxuan?modal_id=7634431557901618475' })
  });
  console.log('状态:', resp.status);
  console.log('响应:', resp.body);
}

test().catch(e => console.error(e));
