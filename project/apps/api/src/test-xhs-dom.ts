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

  const url = 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(r => setTimeout(r, 8000))

  // 滚到底
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise(r => setTimeout(r, 2000))
    window.scrollTo(0, 0)
  })
  await new Promise(r => setTimeout(r, 3000))

  // 从 DOM 提取笔记内容
  const data = await page.evaluate(() => {
    const r: any = {}
    r.title = document.title

    // 笔记标题
    const titleEl = document.querySelector('#detail-title, .note-content .title, [class*="noteDetail"] [class*="title"]')
    r.titleH1 = titleEl?.textContent || null

    // 笔记描述/正文
    const descEl = document.querySelector('#detail-desc, .note-content .desc, [class*="noteDetail"] [class*="desc"]')
    r.desc = descEl?.textContent || null

    // 所有 xhscdn 图片
    const imgs = Array.from(document.querySelectorAll('img'))
      .map(img => img.getAttribute('src') || '')
      .filter(s => s.includes('xhscdn') && !s.includes('avatar') && !s.startsWith('data:'))
    r.imageUrls = Array.from(new Set(imgs)).slice(0, 10)

    // video poster
    const video = document.querySelector('video')
    r.videoPoster = video?.getAttribute('poster') || null
    r.videoSrc = video?.getAttribute('src') || null

    // og image
    r.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
    r.ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null
    r.ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null

    // meta description
    r.metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || null

    // tw 链接（小红书网页会注入）
    const tw = document.querySelector('meta[property="og:url"]')?.getAttribute('content') || null
    r.ogUrl = tw

    return r
  })

  console.log(JSON.stringify(data, null, 2))

  await browser.close()
})()
