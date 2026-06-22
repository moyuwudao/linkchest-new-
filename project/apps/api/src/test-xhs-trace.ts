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

  // 监控所有请求
  const requests: any[] = []
  const responses: any[] = []
  page.on('request', r => requests.push({ url: r.url(), method: r.method(), type: r.resourceType() }))
  page.on('response', async r => {
    const url = r.url()
    if (url.includes('xiaohongshu.com') && r.status() >= 300 && r.status() < 400) {
      responses.push({ url, status: r.status(), location: r.headers()['location'] })
    }
    if (url.includes('/api/sns/web') || url.includes('/api/store/note')) {
      try {
        const text = await r.text()
        responses.push({ url: url.substring(0, 100), status: r.status(), size: text.length, sample: text.substring(0, 300) })
      } catch {}
    }
  })

  const url = 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'
  console.log('Navigating to:', url)
  const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  console.log('Top-level response:', resp?.status(), resp?.headers()['location'] || '')

  await new Promise(r => setTimeout(r, 5000))

  console.log('\n=== Redirects ===')
  responses.filter(r => r.status >= 300 && r.status < 400).forEach(r => console.log(`  ${r.status} ${r.location}`))

  console.log('\n=== XHS API calls ===')
  responses.filter(r => r.url?.includes('/api/sns/web') || r.url?.includes('/api/store/note')).forEach(r => console.log(`  ${r.url}\n  -> ${r.status} (${r.size} bytes)\n  -> ${r.sample}`))

  console.log('\nFinal URL:', page.url())
  console.log('Title:', await page.title())

  await browser.close()
})()
