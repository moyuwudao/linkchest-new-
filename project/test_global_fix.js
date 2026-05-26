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
  console.log('=== 海外服务器测试 ===');
  
  const loginResp = await fetch('http://localhost:3001/api/auth/login-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@linkchest.cn', password: 'password' })
  });
  console.log('登录状态:', loginResp.status);
  if (loginResp.status !== 200) return;
  
  const token = JSON.parse(loginResp.body).token;
  
  const resp = await fetch('http://localhost:3001/api/collections/parse-url', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.douyin.com/jingxuan?modal_id=7634431557901618475' })
  });
  console.log('解析状态:', resp.status);
  console.log('响应:', resp.body.substring(0, 300));
}

test().catch(e => console.error(e));
