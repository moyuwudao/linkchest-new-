// 清空小红书缓存
const { createClient } = require('redis')

;(async () => {
  const r = createClient({ url: 'redis://127.0.0.1:6379' })
  r.on('error', e => console.log('ERR', e.message))
  await r.connect()
  const keys = await r.keys('md:*xiaohongshu*')
  console.log('Found keys:', keys)
  for (const k of keys) {
    await r.del(k)
    console.log('Deleted:', k.substring(0, 100))
  }
  console.log('All cleared')
  await r.quit()
})()
