/**
 * 调试：直接 Puppeteer 访问小红书链接，看实际页面情况
 */
const { getBrowserPool } = require('./services/browser-pool')

const testUrls = [
  { name: '原始 URL 带 xsec_token', url: 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed' },
  { name: '去掉 xsec 参数', url: 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157' },
  { name: '用 discovery_item 路径', url: 'https://www.xiaohongshu.com/discovery/item/6a274ceb000000000803f157' },
  { name: 'short link 短链', url: 'http://xhslink.com/o/6a274ceb' },
  { name: '首页测试', url: 'https://www.xiaohongshu.com' },
]

;(async () => {
  const pool = getBrowserPool()
  for (const t of testUrls) {
    let page = null
    try {
      page = await pool.acquireTab()
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

      // 注入 cookie
      const cookies = [
        { name: 'web_session', value: '030037ad1924c5545171fd36522d4a9b69bf19', domain: '.xiaohongshu.com', path: '/' },
        { name: 'a1', value: '19df698c641kvinowx8mlb57q0zq0ic6e1hakmjgc50000262701', domain: '.xiaohongshu.com', path: '/' },
      ]
      // 先访问根域建立 context
      await page.goto('https://www.xiaohongshu.com', { waitUntil: 'domcontentloaded', timeout: 10000 })
      await new Promise(r => setTimeout(r, 800))
      const cookieObjs = cookies.map(c => ({ name: c.name, value: c.value, url: 'https://xiaohongshu.com', path: c.path, sameSite: 'Lax' }))
      await page.setCookie(...cookieObjs)

      // 访问目标 URL
      console.log(`\n=== ${t.name} ===`)
      console.log(`URL: ${t.url.substring(0, 100)}`)
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await new Promise(r => setTimeout(r, 3000))

      const status = await page.evaluate(`(() => ({
        finalUrl: window.location.href,
        title: document.title,
        hasDetail: !!document.querySelector('#detail-title, .note-content, [class*="noteContent"]'),
        ogImage: document.querySelector('meta[property="og:image"]') ? document.querySelector('meta[property="og:image"]').getAttribute('content') : null,
        bodySample: (document.body ? document.body.textContent : '').substring(0, 150).replace(/\\s+/g, ' '),
      }))()`)
      console.log(JSON.stringify(status, null, 2))
    } catch (e) {
      console.log('ERROR:', e.message)
    } finally {
      if (page) await pool.releaseTab(page).catch(() => {})
    }
  }
  process.exit(0)
})()
