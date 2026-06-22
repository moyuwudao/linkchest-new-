// 通过 API 端点测试小红书抓取
const http = require('http')

const urls = [
  'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed',
  'https://www.xiaohongshu.com/explore/6a1a90d50000000035022684?xsec_token=ABcVkkW4d9egCfTWOkZDbyT44XyrEmDarZxxM1GaXqqKw=&xsec_source=pc_feed',
  'https://www.xiaohongshu.com/explore/6a27d536000000002202e62a?xsec_token=ABsDPhAna68SUr3vg1v5jVAzvnREgfCf329YC7khlvWxM=&xsec_source=pc_feed',
]

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(url)
    const req = http.request({
      method: 'POST',
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 60000,
    }, res => {
      let chunks = ''
      res.on('data', c => chunks += c)
      res.on('end', () => resolve({ status: res.statusCode, body: chunks }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

;(async () => {
  for (const url of urls) {
    console.log('\n=== ' + url.substring(0, 80) + ' ===')
    const start = Date.now()
    try {
      const r = await postJson('http://43.157.240.68:3001/api/metadata/fetch', { url })
      console.log('[' + (Date.now() - start) + 'ms] status=' + r.status)
      try {
        const obj = JSON.parse(r.body)
        console.log('title:', obj.title || obj.data?.title)
        console.log('coverImage:', (obj.coverImage || obj.data?.coverImage || '').substring(0, 120))
        console.log('description:', (obj.description || obj.data?.description || '').substring(0, 100))
        if (obj.error) console.log('error:', obj.error)
      } catch {
        console.log('raw:', r.body.substring(0, 300))
      }
    } catch (e) {
      console.log('[' + (Date.now() - start) + 'ms] ERROR:', e.message)
    }
  }
})()
