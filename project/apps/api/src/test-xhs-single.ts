/**
 * 单个 URL 抓取测试 + 详细日志
 */
import { fetchUrlMetadata } from './services/metadata'

const url = process.argv[2] || 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'

;(async () => {
  console.log(`Testing: ${url.substring(0, 80)}`)
  const start = Date.now()
  try {
    const meta = await fetchUrlMetadata(url)
    console.log(`[${Date.now() - start}ms]`)
    console.log('  title:', meta.title)
    console.log('  coverImage:', (meta.coverImage || '').substring(0, 150) || 'null')
    console.log('  description:', (meta.description || '').substring(0, 100) || 'null')
  } catch (e: any) {
    console.log(`[${Date.now() - start}ms] ERROR:`, e.message)
  }
  process.exit(0)
})()
