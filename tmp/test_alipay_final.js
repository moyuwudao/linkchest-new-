require('dotenv').config();
const crypto = require('crypto');

const sandboxPub = process.env.ALIPAY_SANDBOX_PUBLIC_KEY;
const sandboxPriv = process.env.ALIPAY_SANDBOX_PRIVATE_KEY;

console.log('=== 沙箱支付宝公钥（验签用）===');
console.log('startsWith:', sandboxPub && sandboxPub.substring(0, 30));
console.log('endsWith:', sandboxPub && sandboxPub.substring(sandboxPub.length - 30));
console.log('length:', sandboxPub && sandboxPub.length);
console.log('contains real LF:', sandboxPub && sandboxPub.includes('\n'));

try {
  const keyObj = crypto.createPublicKey(sandboxPub);
  console.log('valid PEM:', keyObj.asymmetricKeyType);
} catch (e) {
  console.log('parse error:', e.message);
}

console.log();
console.log('=== 沙箱用户私钥（签名用）===');
console.log('startsWith:', sandboxPriv && sandboxPriv.substring(0, 30));
console.log('endsWith:', sandboxPriv && sandboxPriv.substring(sandboxPriv.length - 30));
console.log('length:', sandboxPriv && sandboxPriv.length);

try {
  const keyObj = crypto.createPrivateKey(sandboxPriv);
  console.log('valid PEM:', keyObj.asymmetricKeyType);
} catch (e) {
  console.log('parse error:', e.message);
}

console.log();
console.log('=== 配置完整性 ===');
console.log('SANDBOX:', process.env.ALIPAY_SANDBOX);
console.log('APP_ID:', process.env.ALIPAY_SANDBOX_APP_ID);
console.log('isConfigured:', !!(process.env.ALIPAY_SANDBOX && process.env.ALIPAY_SANDBOX_APP_ID && sandboxPriv && sandboxPub));
