/**
 * 直接调用 fetchXiaohongshuHttp 测试
 */
import { fetchUrlMetadata } from './services/metadata'

const url = 'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed'

;(async () => {
  console.log('Calling fetchUrlMetadata...')
  const start = Date.now()
  const meta = await fetchUrlMetadata(url)
  console.log(`[${Date.now() - start}ms]`)
  console.log('  title:', meta.title)
  console.log('  coverImage:', (meta.coverImage || '').substring(0, 150) || 'null')
  console.log('  description:', (meta.description || '').substring(0, 100) || 'null')
  process.exit(0)
})()
