require('dotenv').config({ path: '/opt/linkchest/api/project/apps/api/.env' })
const c = require('crypto')
const priv = process.env.ALIPAY_SANDBOX_PRIVATE_KEY || process.env.ALIPAY_PRIVATE_KEY
const pub = process.env.ALIPAY_SANDBOX_PUBLIC_KEY
console.log('dotenv loaded. SANDBOX:', process.env.ALIPAY_SANDBOX)
console.log('APP_ID:', process.env.ALIPAY_SANDBOX_APP_ID)
console.log('PRIV present:', !!priv, 'len:', priv && priv.length)
console.log('PUB present:', !!pub, 'len:', pub && pub.length)
if (priv) {
  try {
    const k = c.createSign('RSA-SHA256')
    k.update('test')
    const sig = k.sign(priv, 'base64')
    console.log('PRIV sign OK, sig len:', sig.length)
  } catch (e) { console.log('PRIV sign FAIL:', e.message) }
}
if (pub) {
  try {
    const v = c.createVerify('RSA-SHA256')
    v.update('test')
    const ok = v.verify(pub, 'invalid', 'base64')
    console.log('PUB verify parses OK (expected false):', ok)
  } catch (e) { console.log('PUB verify parse FAIL:', e.message) }
}
