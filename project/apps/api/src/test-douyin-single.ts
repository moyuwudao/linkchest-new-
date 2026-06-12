import { fetchUrlMetadata } from './services/metadata'

/**
 * 抖音抓取测试脚本
 * 用法: npx tsx src/test-douyin-single.ts <url>
 */

// 一些公开的抖音测试链接
const DEFAULT_URLS = [
  // 公开测试链接
  'https://www.douyin.com/video/7234567890123456789',
]

const url = process.argv[2] || DEFAULT_URLS[0]

;(async () => {
  console.log(`Testing Douyin: ${url.substring(0, 100)}`)
  console.log('---')
  const start = Date.now()
  try {
    const meta = await fetchUrlMetadata(url)
    const elapsed = Date.now() - start
    console.log(`[${elapsed}ms] Result:`)
    console.log('  title:        ', meta.title || 'null')
    console.log('  coverImage:   ', (meta.coverImage || '').substring(0, 150) || 'null')
    console.log('  description:  ', (meta.description || '').substring(0, 100) || 'null')
    console.log('  favicon:      ', meta.favicon || 'null')
    console.log('  siteName:     ', (meta as any).siteName || 'null')

    if (!meta.title && !meta.coverImage) {
      console.log('\n  ⚠️ 未能提取到 title 或 coverImage，需要排查原因')
    }
  } catch (e: any) {
    console.log(`[${Date.now() - start}ms] ERROR:`, e.message)
  }
  process.exit(0)
})()
