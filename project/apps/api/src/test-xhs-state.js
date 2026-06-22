/**
 * 调试：直接 Puppeteer 访问小红书，看 SSR 数据
 */
const { getBrowserPool } = require('./services/browser-pool')

;(async () => {
  const pool = getBrowserPool()
  let page = null
  try {
    page = await pool.acquireTab()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

    const cookies = [
      { name: 'web_session', value: '030037ad1924c5545171fd36522d4a9b69bf19', domain: '.xiaohongshu.com', path: '/' },
      { name: 'a1', value: '19df698c641kvinowx8mlb57q0zq0ic6e1hakmjgc50000262701', domain: '.xiaohongshu.com', path: '/' },
    ]
    await page.goto('https://www.xiaohongshu.com', { waitUntil: 'domcontentloaded', timeout: 10000 })
    await new Promise(r => setTimeout(r, 800))
    const cookieObjs = cookies.map(c => ({ name: c.name, value: c.value, url: 'https://xiaohongshu.com', path: c.path, sameSite: 'Lax' }))
    await page.setCookie(...cookieObjs)

    // 测试直接 fetch（不走 Puppeteer）
    const directResult = await page.evaluate(`(async () => {
      try {
        const resp = await fetch('https://www.xiaohongshu.com/api/sns/web/v1/feed/6a274ceb000000000803f157', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        })
        const text = await resp.text()
        return { status: resp.status, len: text.length, sample: text.substring(0, 500) }
      } catch (e) { return { error: e.message } }
    })()`)
    console.log('=== direct fetch (no token) ===')
    console.log(JSON.stringify(directResult, null, 2))

    // 提取 INITIAL_STATE 看完整数据
    const state = await page.evaluate(`(() => {
      const scripts = Array.from(document.querySelectorAll('script'))
      const ssrScript = scripts.find(s => (s.textContent || '').includes('__INITIAL_STATE__'))
      if (!ssrScript) return 'no __INITIAL_STATE__ found'
      const text = ssrScript.textContent || ''
      const start = text.indexOf('__INITIAL_STATE__')
      const eq = text.indexOf('=', start)
      const jsonStart = text.indexOf('{', eq)
      let depth = 0, jsonEnd = -1
      for (let i = jsonStart; i < text.length; i++) {
        if (text[i] === '{') depth++
        else if (text[i] === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break } }
      }
      if (jsonEnd === -1) return 'json parse failed'
      const jsonStr = text.substring(jsonStart, jsonEnd)
      const stateObj = JSON.parse(jsonStr)
      return {
        keys: Object.keys(stateObj),
        hasNote: !!stateObj.note,
        noteKeys: stateObj.note ? Object.keys(stateObj.note) : null,
        userInfo: stateObj.user ? Object.keys(stateObj.user) : null,
        loginInfo: stateObj.login ? stateObj.login : null,
        errorInfo: stateObj.error || null,
        sample: jsonStr.substring(0, 1000)
      }
    })()`)
    console.log('\n=== __INITIAL_STATE__ (login page) ===')
    console.log(JSON.stringify(state, null, 2))
  } catch (e) {
    console.log('ERROR:', e.message)
  } finally {
    if (page) await pool.releaseTab(page).catch(() => {})
  }
  process.exit(0)
})()
