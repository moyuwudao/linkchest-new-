import fetch from 'node-fetch'

const url = 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'
const cookie = 'web_session=040069b7f8a87a5d571685391f384b14e7e635; a1=19df698c641kvinowx8mlb57q0zq0ic6e1hakmjgc50000262701'

;(async () => {
  // Test 1: minimal headers
  console.log('=== Test 1: minimal ===')
  const r1 = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Cookie': cookie,
    },
    redirect: 'follow',
  })
  const html1 = await r1.text()
  const title1 = html1.match(/<title[^>]*>([^<]+)<\/title>/i)
  console.log('  status:', r1.status, 'size:', html1.length, 'title:', title1?.[1]?.substring(0, 50))
  console.log('  has noteId:', html1.includes('6a274ceb000000000803f157'))
  console.log('  has 404:', html1.includes('error_code=300031'))

  // Test 2: with Accept */*
  console.log('=== Test 2: Accept */* ===')
  const r2 = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Accept': '*/*',
    },
    redirect: 'follow',
  })
  const html2 = await r2.text()
  const title2 = html2.match(/<title[^>]*>([^<]+)<\/title>/i)
  console.log('  status:', r2.status, 'size:', html2.length, 'title:', title2?.[1]?.substring(0, 50))
  console.log('  has noteId:', html2.includes('6a274ceb000000000803f157'))

  // Test 3: full
  console.log('=== Test 3: full ===')
  const r3 = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cookie': cookie,
      'Referer': 'https://www.xiaohongshu.com/',
      'sec-ch-ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
    redirect: 'follow',
  })
  const html3 = await r3.text()
  const title3 = html3.match(/<title[^>]*>([^<]+)<\/title>/i)
  console.log('  status:', r3.status, 'size:', html3.length, 'title:', title3?.[1]?.substring(0, 50))
  console.log('  has noteId:', html3.includes('6a274ceb000000000803f157'))

  process.exit(0)
})().catch(e => { console.error('err:', e); process.exit(1) })
