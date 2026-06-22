import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.china') })
puppeteer.use(StealthPlugin())

const XHS_COOKIE = process.env.XHS_COOKIE || ''

;(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  const page = await browser.newPage()

  if (XHS_COOKIE) {
    const cookies = XHS_COOKIE.split(';').map(c => {
      const [name, ...rest] = c.trim().split('=')
      return { name: name.trim(), value: rest.join('='), domain: '.xiaohongshu.com', path: '/' }
    })
    await page.setCookie(...cookies)
  }

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  await page.setViewport({ width: 1440, height: 900 })

  // 抓所有 XHS API 响应
  const apiResponses: Record<string, any> = {}
  page.on('response', async r => {
    const url = r.url()
    if (url.includes('edith.xiaohongshu.com/api/sns/web') || url.includes('/api/sns/web') || url.includes('/api/store/note') || url.includes('/api/sns/v1/note/user')) {
      try {
        const text = await r.text()
        if (text.length > 200) {
          apiResponses[url.substring(0, 150)] = text
        }
      } catch {}
    }
  })

  const url = 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(r => setTimeout(r, 8000))

  // 滚动一下触发懒加载
  await page.evaluate(() => window.scrollTo(0, 500))
  await new Promise(r => setTimeout(r, 3000))

  // 直接在浏览器里用 fetch 调用笔记 API
  const noteId = '6a274ceb000000000803f157'
  const directApi = await page.evaluate(async (noteId) => {
    const results: any = {}
    // 笔记详情 API
    try {
      const r1 = await fetch(`https://edith.xiaohongshu.com/api/sns/web/v1/feed?source=note_detail&num=1&cursor=&image_formats=jpg,webp,avif&note_id=${noteId}`, { credentials: 'include' })
      results.feed = { status: r1.status, body: (await r1.text()).substring(0, 3000) }
    } catch (e: any) { results.feed = { error: e.message } }
    return results
  }, noteId)

  console.log('\n=== Direct Feed API ===')
  console.log(JSON.stringify(directApi, null, 2))

  console.log('\n=== Captured XHS API responses (large ones) ===')
  for (const [u, body] of Object.entries(apiResponses)) {
    if (body.length > 500) {
      console.log(`\n--- ${u} ---`)
      try {
        const j = JSON.parse(body as string)
        console.log(JSON.stringify(j, null, 2).substring(0, 2500))
      } catch { console.log((body as string).substring(0, 1000)) }
    }
  }

  await browser.close()
})()
