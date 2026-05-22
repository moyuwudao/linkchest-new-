import { fetchUrlMetadata, UrlMetadata } from './metadata'
import { PLATFORM_SAMPLES, PlatformSample } from './platform-samples'
import * as fs from 'fs'
import * as path from 'path'

export interface FieldResult {
  got: string | null
  expected: boolean
  success: boolean
}

export interface PlatformTestResult {
  platformKey: string
  platformName: string
  priority: 'S' | 'A' | 'B' | 'C'
  sampleUrl: string
  success: boolean
  fields: {
    title: FieldResult
    coverImage: FieldResult
    description: FieldResult
    favicon: FieldResult
  }
  strategyUsed: 'oembed' | 'dedicated' | 'html' | 'worker' | 'none' | 'unknown'
  durationMs: number
  error?: string
}

// 并发控制
const CONCURRENCY = 5

/**
 * 判断抓取策略（通过分析结果和平台特性推断）
 */
function inferStrategy(platformKey: string, metadata: UrlMetadata): PlatformTestResult['strategyUsed'] {
  const oEmbedPlatforms = ['youtube', 'spotify', 'tiktok', 'twitch', 'twitter', 'vimeo', 'soundcloud', 'flickr', 'instagram', 'bilibili']
  const dedicatedPlatforms = ['xiaohongshu', 'bilibili', 'douyin', 'kuaishou', 'zhihu', 'weibo', 'tencent-video', 'iqiyi', 'youku', 'mgtv', '36kr']
  const workerPlatforms = ['youtube', 'weibo', 'twitter', 'facebook', 'twitch', 'dianping', 'xueqiu', '36kr', 'toutiao', 'xiaohongshu', 'huxiu', 'thepaper', 'netease-news']

  if (oEmbedPlatforms.includes(platformKey)) return 'oembed'
  if (dedicatedPlatforms.includes(platformKey)) return 'dedicated'
  if (workerPlatforms.includes(platformKey)) return 'worker'
  if (metadata.title || metadata.coverImage) return 'html'
  return 'none'
}

/**
 * 测试单个URL（带独立超时保护）
 */
async function testSingleUrl(sample: PlatformSample, url: string): Promise<PlatformTestResult> {
  console.log(`  [开始] ${sample.key}: ${url}`)
  const start = Date.now()
  let metadata: UrlMetadata = { title: null, coverImage: null, description: null, favicon: null }
  let error: string | undefined

  try {
    const timeoutMs = 12000 // 12秒独立超时
    metadata = await Promise.race([
      fetchUrlMetadata(url),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`REQUEST_TIMEOUT after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  }

  const duration = Date.now() - start
  console.log(`  [结束] ${sample.key}: title=${metadata.title ? 'OK' : 'FAIL'} cover=${metadata.coverImage ? 'OK' : 'FAIL'} (${duration}ms)${error ? ' ERR=' + error : ''}`)

  // 各平台对字段的期望（根据优先级设定）
  const expectations = getFieldExpectations(sample.priority)

  const titleSuccess = !!metadata.title && metadata.title.length > 0
  const coverSuccess = !!metadata.coverImage && metadata.coverImage.length > 0
  const descSuccess = !!metadata.description && metadata.description.length > 0
  const faviconSuccess = !!metadata.favicon && metadata.favicon.length > 0

  const overallSuccess = titleSuccess && (sample.priority === 'C' ? true : coverSuccess)

  return {
    platformKey: sample.key,
    platformName: sample.name,
    priority: sample.priority,
    sampleUrl: url,
    success: overallSuccess,
    fields: {
      title: { got: metadata.title, expected: expectations.title, success: titleSuccess },
      coverImage: { got: metadata.coverImage, expected: expectations.coverImage, success: coverSuccess },
      description: { got: metadata.description, expected: expectations.description, success: descSuccess },
      favicon: { got: metadata.favicon, expected: expectations.favicon, success: faviconSuccess },
    },
    strategyUsed: inferStrategy(sample.key, metadata),
    durationMs: duration,
    error,
  }
}

/**
 * 根据优先级获取字段期望
 */
function getFieldExpectations(priority: 'S' | 'A' | 'B' | 'C') {
  switch (priority) {
    case 'S':
      return { title: true, coverImage: true, description: true, favicon: true }
    case 'A':
      return { title: true, coverImage: true, description: true, favicon: false }
    case 'B':
      return { title: true, coverImage: true, description: false, favicon: false }
    case 'C':
      return { title: true, coverImage: false, description: false, favicon: false }
  }
}

/**
 * 并发执行测试
 */
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = []
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const current = index++
      try {
        results[current] = await tasks[current]()
      } catch (err) {
        console.error(`Task ${current} failed:`, err)
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/**
 * 主测试函数
 */
export async function runPlatformTests(priorityFilter?: ('S' | 'A' | 'B' | 'C')[]): Promise<PlatformTestResult[]> {
  const samples = priorityFilter
    ? PLATFORM_SAMPLES.filter(p => priorityFilter.includes(p.priority))
    : PLATFORM_SAMPLES

  const tasks = samples.flatMap(sample =>
    sample.sampleUrls.map(url => () => testSingleUrl(sample, url))
  )

  console.log(`[测试启动] 平台数=${samples.length}, 总URL数=${tasks.length}, 并发=${CONCURRENCY}`)

  const results = await runWithConcurrency(tasks, CONCURRENCY)

  console.log(`[测试完成] 总URL数=${results.length}`)
  return results
}

/**
 * 生成分级统计摘要
 */
export function generateSummary(results: PlatformTestResult[]) {
  const byPriority = { S: [] as PlatformTestResult[], A: [] as PlatformTestResult[], B: [] as PlatformTestResult[], C: [] as PlatformTestResult[] }

  for (const r of results) {
    byPriority[r.priority].push(r)
  }

  const summary = {
    total: results.length,
    byPriority: {} as Record<string, { count: number; success: number; titleRate: string; coverRate: string; descRate: string; faviconRate: string; avgDurationMs: number }>,
  }

  for (const [priority, list] of Object.entries(byPriority)) {
    if (list.length === 0) continue
    const successCount = list.filter(r => r.success).length
    const titleCount = list.filter(r => r.fields.title.success).length
    const coverCount = list.filter(r => r.fields.coverImage.success).length
    const descCount = list.filter(r => r.fields.description.success).length
    const faviconCount = list.filter(r => r.fields.favicon.success).length
    const avgDuration = list.reduce((sum, r) => sum + r.durationMs, 0) / list.length

    summary.byPriority[priority] = {
      count: list.length,
      success: successCount,
      titleRate: `${((titleCount / list.length) * 100).toFixed(1)}%`,
      coverRate: `${((coverCount / list.length) * 100).toFixed(1)}%`,
      descRate: `${((descCount / list.length) * 100).toFixed(1)}%`,
      faviconRate: `${((faviconCount / list.length) * 100).toFixed(1)}%`,
      avgDurationMs: Math.round(avgDuration),
    }
  }

  return summary
}

/**
 * 保存结果到JSON文件
 */
export function saveResults(results: PlatformTestResult[], outDir: string) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const byPriority = { S: [] as PlatformTestResult[], A: [] as PlatformTestResult[], B: [] as PlatformTestResult[], C: [] as PlatformTestResult[] }
  for (const r of results) {
    byPriority[r.priority].push(r)
  }

  for (const [priority, list] of Object.entries(byPriority)) {
    if (list.length > 0) {
      const filePath = path.join(outDir, `${priority.toLowerCase()}-results.json`)
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8')
      console.log(`[结果保存] ${filePath} (${list.length}条)`)
    }
  }

  const summary = generateSummary(results)
  const summaryPath = path.join(outDir, 'summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')
  console.log(`[摘要保存] ${summaryPath}`)

  return summary
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2)
  const priorityFilter = args.includes('--s') || args.includes('--S') ? ['S' as const]
    : args.includes('--a') || args.includes('--A') ? ['A' as const]
    : args.includes('--b') || args.includes('--B') ? ['B' as const]
    : args.includes('--c') || args.includes('--C') ? ['C' as const]
    : undefined

  const outDir = path.join(__dirname, '..', '..', '..', 'platform-test-results')

  runPlatformTests(priorityFilter)
    .then(results => {
      const summary = saveResults(results, outDir)
      console.log('\n========== 测试结果摘要 ==========')
      console.log(JSON.stringify(summary, null, 2))

      // 打印失败项
      const failures = results.filter(r => !r.success)
      if (failures.length > 0) {
        console.log(`\n[失败项] 共${failures.length}个:`)
        for (const f of failures) {
          console.log(`  - [${f.priority}] ${f.platformName} (${f.platformKey}): ${f.sampleUrl}`)
          if (f.error) console.log(`    error: ${f.error}`)
        }
      }
    })
    .catch(console.error)
}
