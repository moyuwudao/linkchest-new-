// 测试 dotenv 加载 ALIPAY_SANDBOX_* 配置
require('dotenv').config();

const p = process.env.ALIPAY_SANDBOX_PRIVATE_KEY;
const a = process.env.ALIPAY_SANDBOX_PUBLIC_KEY;
const appId = process.env.ALIPAY_SANDBOX_APP_ID;
const sb = process.env.ALIPAY_SANDBOX;

console.log('SANDBOX:', sb);
console.log('APP_ID:', appId);
console.log('PRIV startsWith:', p && p.substring(0, 30));
console.log('PRIV endsWith:', p && p.substring(p.length - 30));
console.log('PRIV length:', p && p.length);
console.log('PUB startsWith:', a && a.substring(0, 30));
console.log('PUB endsWith:', a && a.substring(a.length - 30));
console.log('PUB length:', a && a.length);
console.log('PRIV contains literal \\n (need unescape):', p && p.includes('\\n'));
console.log('PRIV contains real LF after unescape:', p && p.replace(/\\n/g, '\n').includes('\n'));

// 还原后用 openssl 验签（验证 PEM 格式）
const crypto = require('crypto');
try {
  const privPem = p.replace(/\\n/g, '\n');
  const keyObj = crypto.createPrivateKey(privPem);
  console.log('PRIV KEY valid PEM:', keyObj.asymmetricKeyType === 'rsa');
  const pubPem = a.replace(/\\n/g, '\n');
  const pubObj = crypto.createPublicKey(pubPem);
  console.log('PUB KEY valid PEM:', pubObj.asymmetricKeyType === 'rsa');
} catch (e) {
  console.log('PEM parse error:', e.message);
}
