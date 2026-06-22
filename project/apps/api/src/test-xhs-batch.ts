import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.china') })
puppeteer.use(StealthPlugin())

const XHS_COOKIE = process.env.XHS_COOKIE || ''

const urls = [
  'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157',
  'https://www.xiaohongshu.com/explore/6a1a90d50000000035022684',
  'https://www.xiaohongshu.com/explore/6a27d536000000002202e62a',
]

;(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })

  // 先访问主页让小红书下发基础 Cookie
  console.log('[warmup] visiting xiaohongshu.com homepage...')
  const warmupPage = await browser.newPage()
  await warmupPage.goto('https://www.xiaohongshu.com', { waitUntil: 'domcontentloaded', timeout: 25000 })
  await new Promise(r => setTimeout(r, 2000))
  await warmupPage.close()
  console.log('[warmup] done')

  for (const url of urls) {
    const page = await browser.newPage()

    if (XHS_COOKIE) {
      const cookies = XHS_COOKIE.split(';').map(c => {
        const [name, ...rest] = c.trim().split('=')
        return { name: name.trim(), value: rest.join('='), domain: '.xiaohongshu.com', path: '/' }
      })
      await page.setCookie(...cookies)
      const ckNames = cookies.map(c => c.name).join(',')
      console.log(`\n[cookie injected: ${ckNames}]`)
    }

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1440, height: 900 })

    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 8000))

    const finalUrl = page.url()
    const isBlocked = finalUrl.includes('error_code=300031') || finalUrl.includes('/404?')

    const result = await page.evaluate(() => {
      const r: any = {}
      r.title = document.title
      r.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
      r.ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null
      r.ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null
      r.hasNote = !!document.querySelector('#noteContainer, .note-content, [class*="noteItem"]')
      // 找 INITIAL_STATE 里的笔记数据
      try {
        const scripts = document.querySelectorAll('script')
        for (const s of scripts) {
          const t = s.textContent || ''
          if (t.includes('"noteData"')) { r.hasNoteData = true; break }
        }
      } catch {}
      return r
    })

    const status = isBlocked ? '🚫 BLOCKED' : (result.ogImage ? '✅ OK' : '⚠️ NO_OG')
    console.log(`\n[${status}] ${url}`)
    console.log(`  Final: ${finalUrl.substring(0, 100)}`)
    console.log(`  Title: ${result.title}`)
    console.log(`  ogTitle: ${result.ogTitle}`)
    console.log(`  ogImage: ${result.ogImage ? result.ogImage.substring(0, 80) : 'null'}`)
    console.log(`  hasNote: ${result.hasNote}, hasNoteData: ${!!result.hasNoteData}`)

    await page.close()
  }

  await browser.close()
})()
