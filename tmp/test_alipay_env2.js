require('dotenv').config();

const p = process.env.ALIPAY_SANDBOX_PRIVATE_KEY;
const a = process.env.ALIPAY_SANDBOX_PUBLIC_KEY;
const crypto = require('crypto');

// 检查私钥的字节内容
const buf = Buffer.from(p);
console.log('PRIV buffer length:', buf.length);
console.log('First 50 bytes (hex):', buf.slice(0, 50).toString('hex'));
console.log('First 50 bytes (ascii):', JSON.stringify(buf.slice(0, 50).toString('ascii')));
console.log('Last 50 bytes (hex):', buf.slice(-50).toString('hex'));

// 直接用文件方式加载试试
const fs = require('fs');
fs.writeFileSync('/tmp/test_priv.pem', p);
fs.writeFileSync('/tmp/test_pub.pem', a);

try {
  const keyObj = crypto.createPrivateKey('/tmp/test_priv.pem');
  console.log('PRIV KEY valid PEM (from file):', keyObj.asymmetricKeyType);
} catch (e) {
  console.log('PRIV from file error:', e.message);
}

try {
  const pubObj = crypto.createPublicKey('/tmp/test_pub.pem');
  console.log('PUB KEY valid PEM (from file):', pubObj.asymmetricKeyType);
} catch (e) {
  console.log('PUB from file error:', e.message);
}
