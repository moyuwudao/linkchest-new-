import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.china') })
puppeteer.use(StealthPlugin())

const XHS_COOKIE = process.env.XHS_COOKIE || ''
console.log('XHS_COOKIE present:', XHS_COOKIE.length > 0, 'len:', XHS_COOKIE.length)

;(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  })
  const page = await browser.newPage()

  // 解析 Cookie 并设置
  if (XHS_COOKIE) {
    const cookies = XHS_COOKIE.split(';').map(c => {
      const [name, ...rest] = c.trim().split('=')
      return { name: name.trim(), value: rest.join('='), domain: '.xiaohongshu.com', path: '/' }
    })
    await page.setCookie(...cookies)
    console.log('Set cookies:', cookies.map(c => c.name).join(', '))
  }

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  await page.setViewport({ width: 1440, height: 900 })

  const url = 'https://www.xiaohongshu.com/explore/6a2a36ee0000000007011145'
  console.log('\n=== Testing:', url, '===')
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
  console.log('Status:', resp?.status())
  console.log('Final URL:', page.url().substring(0, 150))

  await new Promise(r => setTimeout(r, 6000))

  const result = await page.evaluate(() => {
    const r: any = {}
    r.title = document.title
    r.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')?.substring(0, 120) || null
    r.ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null
    r.ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.substring(0, 200) || null
    r.hasNote = !!document.querySelector('#noteContainer, .note-content, [class*="noteItem"]')
    r.bodyText = document.body?.innerText?.substring(0, 300) || ''
    return r
  })
  console.log('\n=== Result ===')
  console.log(JSON.stringify(result, null, 2))

  await browser.close()
})()
