// 小红书抓取深度调试 - JS 版（避免 TS dom lib 问题）
const { fetchUrlMetadata } = require('./services/metadata')
const { getBrowserPool } = require('./services/browser-pool')

const url = 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'

;(async () => {
  const pool = getBrowserPool()
  let page = null
  try {
    page = await pool.acquireTab()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

    const xhsCookieEntry = {
      cookies: [{ name: 'a1', value: '19df698c641kvinowx8mlb57q0zq0ic6e1hakmjgc50000262701', domain: '.xiaohongshu.com', path: '/' }],
    }
    const cookieObjs = xhsCookieEntry.cookies.map(c => ({
      name: c.name, value: c.value, domain: c.domain, path: c.path || '/', sameSite: 'Lax',
    }))
    await page.setCookie(...cookieObjs)
    const allCookies = await page.cookies()
    const xhsCookies = allCookies.filter(c => c.domain.includes('xiaohongshu'))
    console.log('=== cookie 注入验证 ===')
    console.log('requested:', cookieObjs.map(c => `${c.name}=${c.value.substring(0, 20)}...`))
    console.log('injected:', xhsCookies.map(c => `${c.name}=${c.value.substring(0, 20)}... (${c.domain})`))

    console.log('\n=== 访问页面 ===')
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    console.log('loaded URL:', page.url())
    await new Promise(r => setTimeout(r, 3000))

    console.log('\n=== 当前页面状态 ===')
    const status = await page.evaluate(`(() => {
      return {
        url: window.location.href,
        title: document.title,
        htmlLen: document.documentElement.outerHTML.length,
        hasDetailTitle: !!document.querySelector('#detail-title'),
        hasNoteContent: !!document.querySelector('.note-content, [class*="noteContent"]'),
        bodyTextSample: (document.body ? document.body.textContent : '').substring(0, 200).replace(/\\s+/g, ' '),
        ogImage: document.querySelector('meta[property="og:image"]') ? document.querySelector('meta[property="og:image"]').getAttribute('content') : null,
        allMetaImages: Array.from(document.querySelectorAll('meta')).filter(m => (m.getAttribute('property') || '').toLowerCase().includes('image')).map(m => m.getAttribute('content')).filter(Boolean).slice(0, 5),
      }
    })()`)
    console.log(JSON.stringify(status, null, 2))

    console.log('\n=== 查找 INITIAL_STATE 脚本 ===')
    const scripts = await page.evaluate(`(() => {
      return Array.from(document.querySelectorAll('script'))
        .map(s => (s.textContent || '').substring(0, 1500))
        .filter(t => t.indexOf('INITIAL_STATE') !== -1)
        .slice(0, 1)
    })()`)
    console.log('找到 INITIAL_STATE 脚本数:', scripts.length)
    if (scripts.length > 0) {
      console.log('前 1500 字符:')
      console.log(scripts[0].substring(0, 1500))
    } else {
      // 找一下其他可能的 SSR 数据
      const otherScripts = await page.evaluate(`(() => {
        return Array.from(document.querySelectorAll('script'))
          .map(s => (s.textContent || '').substring(0, 200))
          .filter(t => t.length > 100 && (t.indexOf('noteData') !== -1 || t.indexOf('note') !== -1 || t.indexOf('image') !== -1))
          .slice(0, 3)
      })()`)
      console.log('含 note/image 的脚本:')
      otherScripts.forEach((s, i) => console.log(`[${i}]`, s))
    }

    console.log('\n=== 等待 8s 后再查 ===')
    await new Promise(r => setTimeout(r, 8000))
    const status2 = await page.evaluate(`(() => ({
      url: window.location.href,
      title: document.title,
      hasDetailTitle: !!document.querySelector('#detail-title'),
      hasNoteContent: !!document.querySelector('.note-content, [class*="noteContent"]'),
      ogImage: document.querySelector('meta[property="og:image"]') ? document.querySelector('meta[property="og:image"]').getAttribute('content') : null,
      bodyTextSample: (document.body ? document.body.textContent : '').substring(0, 200).replace(/\\s+/g, ' '),
    }))()`)
    console.log(JSON.stringify(status2, null, 2))
  } catch (e) {
    console.log('ERROR:', e.message, e.stack ? e.stack.substring(0, 500) : '')
  } finally {
    if (page) await pool.releaseTab(page).catch(() => {})
  }
  process.exit(0)
})()
