/**
 * 小红书抓取测试脚本 - 服务器端运行
 */
import { fetchUrlMetadata } from './services/metadata'

const urls = [
  'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed',
  'https://www.xiaohongshu.com/explore/6a1a90d50000000035022684?xsec_token=ABcVkkW4d9egCfTWOkZDbyT44XyrEmDarZxxM1GaXqqKw=&xsec_source=pc_feed',
  'https://www.xiaohongshu.com/explore/6a27d536000000002202e62a?xsec_token=ABsDPhAna68SUr3vg1v5jVAzvnREgfCf329YC7khlvWxM=&xsec_source=pc_feed',
]

;(async () => {
  for (const url of urls) {
    console.log(`\n=== ${url.substring(0, 80)} ===`)
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
  }
  process.exit(0)
})()
