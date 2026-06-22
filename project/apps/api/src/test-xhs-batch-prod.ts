import { fetchUrlMetadata } from './services/metadata'

/**
 * 小红书批量抓取测试
 * 用法: npx tsx src/test-xhs-batch.ts
 */

const URLS = [
  // 之前用户测试过的
  'https://www.xiaohongshu.com/explore/6a274ceb000000000803f157?xsec_token=ABsDPhAna68SUr3vg1v5jVA7QMdsE0YOUfzxubAPoR4Tw=&xsec_source=pc_feed',
  // 之前 404 的
  'https://www.xiaohongshu.com/explore/6a1a90d50000000035022684?xsec_token=ABcVkkW4d9egCfTWOkZDbyT44XyrEmDarZxxM1GaXqqKw=&xsec_source=pc_feed',
  'https://www.xiaohongshu.com/explore/6a27d536000000002202e62a?xsec_token=ABsDPhAna68SUr3vg1v5jVAzvnREgfCf329YC7khlvWxM=&xsec_source=pc_feed',
]

;(async () => {
  console.log(`批量测试 ${URLS.length} 个小红书链接`)
  console.log('='.repeat(80))
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < URLS.length; i++) {
    const url = URLS[i]
    const noteId = url.match(/explore\/([a-f0-9]+)/)?.[1] || 'unknown'
    console.log(`\n[${i + 1}/${URLS.length}] noteId=${noteId}`)

    const start = Date.now()
    try {
      const meta = await fetchUrlMetadata(url)
      const elapsed = Date.now() - start
      const hasTitle = !!meta.title
      const hasCover = !!meta.coverImage
      if (hasTitle && hasCover) {
        successCount++
        console.log(`  ✅ [${elapsed}ms] title="${meta.title}"`)
        console.log(`     cover=${meta.coverImage?.substring(0, 100)}...`)
      } else {
        failCount++
        console.log(`  ⚠️ [${elapsed}ms] 部分字段缺失: title=${hasTitle} cover=${hasCover}`)
        if (meta.title) console.log(`     title="${meta.title}"`)
        if (meta.coverImage) console.log(`     cover=${meta.coverImage.substring(0, 100)}`)
      }
    } catch (e: any) {
      failCount++
      console.log(`  ❌ [${Date.now() - start}ms] ERROR: ${e.message}`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(`结果: ${successCount} 成功 / ${failCount} 失败 / ${URLS.length} 总数`)
  process.exit(0)
})()
