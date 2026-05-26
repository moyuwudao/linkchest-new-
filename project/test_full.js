const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== 测试开始 ===\n');

  // 1. 登录获取 token
  console.log('1. 登录获取 token...');
  let token = null;
  try {
    const resp = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@linkchest.cn', password: 'password' })
    });
    console.log('   状态:', resp.status);
    if (resp.status === 200) {
      const data = JSON.parse(resp.body);
      token = data.token;
      console.log('   Token 获取成功');
    } else {
      console.log('   登录失败:', resp.body);
      return;
    }
  } catch (e) {
    console.log('   登录错误:', e.message);
    return;
  }

  // 2. 测试代理路由
  console.log('\n2. 测试代理路由...');
  try {
    const resp = await fetch(`http://localhost:3001/api/collections/proxy-metadata?url=https://www.baidu.com`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('   状态:', resp.status);
    console.log('   响应:', resp.body.substring(0, 500));
  } catch (e) {
    console.log('   代理错误:', e.message);
  }

  // 3. 测试抖音元数据提取
  console.log('\n3. 测试抖音元数据提取...');
  try {
    const resp = await fetch(`http://localhost:3001/api/collections/parse-url?url=https://www.douyin.com/jingxuan?modal_id=7634431557901618475`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('   状态:', resp.status);
    const data = JSON.parse(resp.body);
    console.log('   标题:', data.data?.title || '未获取到');
    console.log('   封面:', data.data?.coverImage ? '已获取' : '未获取到');
  } catch (e) {
    console.log('   抖音测试错误:', e.message);
  }

  // 4. 测试小红书元数据提取
  console.log('\n4. 测试小红书元数据提取...');
  try {
    const resp = await fetch(`http://localhost:3001/api/collections/parse-url?url=https://www.xiaohongshu.com/explore/6a0fc3b40000000035033ae5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('   状态:', resp.status);
    const data = JSON.parse(resp.body);
    console.log('   标题:', data.data?.title || '未获取到');
    console.log('   封面:', data.data?.coverImage ? '已获取' : '未获取到');
  } catch (e) {
    console.log('   小红书测试错误:', e.message);
  }

  console.log('\n=== 测试结束 ===');
}

runTests();
