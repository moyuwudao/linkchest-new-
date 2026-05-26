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
  console.log('=== 国内服务器代理方案测试 ===\n');
  
  // 测试登录
  console.log('1. 登录获取 token...');
  const loginResp = await fetch('http://localhost:3001/api/auth/login-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@linkchest.cn', password: 'password' })
  });
  console.log('   状态:', loginResp.status);
  if (loginResp.status !== 200) {
    console.log('   登录失败:', loginResp.body);
    return;
  }
  const token = JSON.parse(loginResp.body).token;
  console.log('   Token 获取成功');
  
  // 测试抖音精选页
  console.log('\n2. 测试抖音精选页...');
  const douyinResp = await fetch('http://localhost:3001/api/collections/parse-url', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.douyin.com/jingxuan?modal_id=7634431557901618475' })
  });
  console.log('   状态:', douyinResp.status);
  try {
    const data = JSON.parse(douyinResp.body);
    console.log('   标题:', data.data?.title?.substring(0, 50) || '未获取到');
    console.log('   封面:', data.data?.coverImage ? '已获取' : '未获取到');
  } catch (e) {
    console.log('   响应:', douyinResp.body.substring(0, 200));
  }
  
  // 测试小红书
  console.log('\n3. 测试小红书...');
  const xhsResp = await fetch('http://localhost:3001/api/collections/parse-url', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.xiaohongshu.com/explore/6a0fc3b40000000035033ae5' })
  });
  console.log('   状态:', xhsResp.status);
  try {
    const data = JSON.parse(xhsResp.body);
    console.log('   标题:', data.data?.title?.substring(0, 50) || '未获取到');
    console.log('   封面:', data.data?.coverImage ? '已获取' : '未获取到');
  } catch (e) {
    console.log('   响应:', xhsResp.body.substring(0, 200));
  }
  
  // 测试抖音用户页
  console.log('\n4. 测试抖音用户页...');
  const userResp = await fetch('http://localhost:3001/api/collections/parse-url', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://www.douyin.com/user/MS4wLjABAAAAz4g52Q02PnA' })
  });
  console.log('   状态:', userResp.status);
  try {
    const data = JSON.parse(userResp.body);
    console.log('   标题:', data.data?.title?.substring(0, 50) || '未获取到');
    console.log('   封面:', data.data?.coverImage ? '已获取' : '未获取到');
  } catch (e) {
    console.log('   响应:', userResp.body.substring(0, 200));
  }
  
  console.log('\n=== 测试结束 ===');
}

test().catch(e => console.error('测试异常:', e));
