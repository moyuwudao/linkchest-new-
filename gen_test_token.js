// 生成测试 JWT token
const jwt = require('jsonwebtoken')

const payload = {
  userId: 'test-user-id',
  email: 'test@linkchest.net',
  tier: 'super',
}
const secret = '020b5955764c96f5d025883dc2f4ee3d6c3c5156b03c10b19b3d829e6c0d065a'
const token = jwt.sign(payload, secret, { expiresIn: '1h' })
console.log(token)
