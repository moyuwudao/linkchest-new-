/**
 * 直接 fetch 小红书 URL，看 SSR 数据
 */
const https = require('https')
const http = require('http')

const urls = [
  'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157',
  'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed',
]

const cookies = 'web_session=030037ad1924c5545171fd36522d4a9b69bf19; a1=19df698c641kvinowx8mlb57q0zq0ic6e1hakmjgc50000262701'

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cookie': cookies,
      },
      timeout: 10000,
    }, res => {
      let chunks = ''
      res.on('data', c => chunks += c)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: chunks }))
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy())
  })
}

;(async () => {
  for (const url of urls) {
    console.log('\n========================================')
    console.log('URL:', url)
    console.log('========================================')
    try {
      const r = await fetchUrl(url)
      console.log('Status:', r.status)
      console.log('Location:', r.headers.location)
      console.log('Content-Length:', r.body.length)
      console.log('Body (first 2000):')
      console.log(r.body.substring(0, 2000))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
  }
})()
