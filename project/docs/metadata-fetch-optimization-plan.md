# LinkChest 封面/标题抓取优化方案
## 目标：在 2核2GB 服务器上提升抓取成功率、降低资源消耗

---

## 一、现有方案诊断

当前 `services/metadata.ts` 共 **1843 行**，采用多层 fallback 策略：

```
oEmbed API → 平台专属 API → HTML解析(cheerio) → UA重试 → Cloudflare Worker降级
     ↑           ↑              ↑
   YouTube    小红书/知乎    通用网页(500+行)
   Bilibili   抖音/快手
```

### 存在的问题

| 问题 | 影响 | 严重程度 |
|------|------|---------|
| 手写 cheerio 解析 500+ 行 | 维护成本高、边界情况多、内存泄漏风险 | 高 |
| 单请求最多发起 5+ HTTP | 出站连接耗尽、响应时间 3-10s | 高 |
| 同步阻塞 API 响应 | 用户添加收藏要等 3-10s | 高 |
| 反爬平台硬抓（抖音/小红书） | 成功率低、浪费 CPU/内存/带宽 | 中 |
| 无并发控制 | 10 个用户同时添加 = 服务器满载 | 高 |
| cheerio DOM 对象占用大 | 单次解析 2-10MB 内存 | 中 |

### 服务器资源视角的瓶颈

在 2核2GB 的服务器上：
- **10 个并发抓取请求** → cheerio DOM 占用 20-50MB+ 内存 → 接近危险线
- **每个抓取请求 3-5 个 HTTP** → 50 个出站 TCP 连接 → 文件描述符紧张
- **同步等待** → Node.js 事件循环被大量 I/O 占据 → 其他 API 响应变慢

---

## 二、优化策略总览

### 核心原则：先保服务器不死，再保抓取成功率

针对 2核2GB 的硬件约束，采用 **"四化"策略**：

1. **异步化**：metadata 抓取不阻塞 API 响应
2. **轻量化**：用成熟库替代手写解析，减少内存占用
3. **限量化**：严格控制并发和超时，防止资源耗尽
4. **缓存化**：提升缓存命中率，减少重复抓取

### 优化后的分层架构

```
┌─────────────────────────────────────────────────────────────┐
│  用户添加收藏                                                │
│     ↓                                                       │
│  API 立即返回（URL + 平台默认标题/封面）                      │
│     ↓                                                       │
│  触发后台抓取任务（不阻塞响应）                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  抓取引擎（受控并发，max 3）                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ L1 缓存  │→│L2 oEmbed│→│ L3 OGS  │→│L4 平台API│        │
│  │ (Redis) │  │(快速API)│  │(通用OG) │  │(反爬平台)│        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│       ↑           ↑            ↑            ↑               │
│     命中?       命中?        命中?        命中?             │
│       ↓           ↓            ↓            ↓               │
│   直接返回    直接返回     直接返回      直接返回            │
│       └───────────┴────────────┴────────────┘               │
│                              ↓                              │
│                        L5 平台 Fallback                     │
│                        （零 HTTP 成本）                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、技术方案详解

### 3.1 引入 open-graph-scraper（替代手写 cheerio 解析）

**为什么选它**：
- 社区成熟，专门做 OG/Twitter Card 提取，比我们手写的 500 行更可靠
- 内置请求超时、重试、UA 设置
- 支持从 URL 或 HTML 字符串解析
- 封装了 `title`/`ogTitle`/`ogImage`/`description`/`favicon` 的提取逻辑
- 代码量可以减少 **400-600 行**

**使用方式**：
```typescript
import ogs from 'open-graph-scraper'

// 通用网页抓取（替代手写的 doFetchHtml + extractTitle + extractCoverImage）
async function fetchOgsMetadata(url: string): Promise<UrlMetadata | null> {
  const { result } = await ogs({
    url,
    timeout: 5000,
    fetchOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  })
  
  if (!result.success) return null
  
  return {
    title: result.ogTitle || result.twitterTitle || result.pageTitle || null,
    coverImage: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || null,
    description: result.ogDescription || result.twitterDescription || null,
    favicon: result.favicon || null,
  }
}
```

**保留现有部分**：
- oEmbed API（YouTube、Spotify 等）—— 成功率高、速度快
- 平台专属 API（Bilibili BV 号 API）—— 已验证有效
- Cloudflare Worker 降级 —— 作为最后兜底

**删除/简化部分**：
- 手写的 `doFetchHtml` + `extractTitle` + `extractCoverImage` + `extractSchemaTitle` + `findFirstValidImage` 等 500+ 行
- 手写的 `fetchXiaohongshuMetadata` / `fetchDouyinMetadata` 等（反爬严重，成功率低，不如直接 fallback）

### 3.2 异步化 Metadata 抓取（最关键优化）

**当前问题**：用户添加收藏时必须等待 3-10s 的抓取完成

**优化后**：API 立即返回，后台异步抓取

```typescript
// routes/collections.ts - 添加收藏
router.post('/', authenticate, async (req, res) => {
  const { url, title: userTitle, coverImage: userCover, note, tagIds = [], listIds = [] } = req.body
  const userId = req.user.id
  const platform = detectPlatform(url)

  // 配额检查
  const quotaError = await checkQuota(userId, 'collections')
  if (quotaError) return res.status(403).json({ error: quotaError })

  // 1. 使用默认标题（URL 或用户提供）
  const defaultTitle = userTitle || getPlatformFallbackMetadata(platform).title || url
  const defaultCover = userCover || null

  // 2. 立即保存（不等待抓取）
  const collection = await prisma.collection.create({
    data: {
      userId, url,
      title: defaultTitle,
      coverImage: defaultCover,
      platform, note,
      tags: tagIds.length > 0 ? { connect: tagIds.map((id: string) => ({ id })) } : undefined,
      lists: { connect: defaultListIds.map((id: string) => ({ id })) },
    },
    include: { tags: { select: { id: true, name: true } }, lists: { select: { id: true, name: true } } }
  })

  // 3. 触发后台抓取（不 await！不阻塞响应）
  if (!userTitle || !userCover) {
    metadataQueue.add(collection.id, url, { title: !userTitle, cover: !userCover })
      .catch(err => console.error('后台抓取任务失败:', err))
  }

  res.status(201).json({ data: collection })
})
```

**后台抓取队列（轻量级实现，不引入 BullMQ）**：
```typescript
// services/metadata-queue.ts
import pLimit from 'p-limit'

// 限制最大并发抓取数（2核2GB 服务器，最多 3 个并发）
const limit = pLimit(3)

// 待处理队列
const pendingTasks: Array<() => Promise<void>> = []

interface MetadataTask {
  collectionId: string
  url: string
  fields: { title: boolean; cover: boolean }
}

export async function addMetadataTask(
  collectionId: string,
  url: string,
  fields: { title: boolean; cover: boolean }
): Promise<void> {
  return limit(async () => {
    try {
      const metadata = await fetchUrlMetadata(url)
      
      const updateData: any = {}
      if (fields.title && metadata.title) updateData.title = metadata.title
      if (fields.cover && metadata.coverImage) updateData.coverImage = metadata.coverImage
      
      if (Object.keys(updateData).length > 0) {
        await prisma.collection.update({
          where: { id: collectionId },
          data: updateData
        })
        
        // 可选：通过 WebSocket / SSE 推送给前端
        // notifyClient(collectionId, updateData)
      }
    } catch (err) {
      console.error(`Metadata 抓取失败 [${collectionId}]:`, err)
    }
  })
}
```

**为什么不用 BullMQ**：
- 2GB 内存紧张，BullMQ + Redis 额外消耗内存
- 当前抓取量不大，简单的 `p-limit` 足够
- 减少依赖，降低复杂度

### 3.3 精简抓取策略（减少单请求 HTTP 数）

**当前**：单请求最多 5+ HTTP（oEmbed → 平台API → HTML解析 → UA重试 → Worker）
**优化后**：单请求最多 2 HTTP（oEmbed/OGS → Worker 兜底）

```typescript
async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  // 1. 缓存检查
  const cached = await getCachedMetadata(url)
  if (cached) return cached

  const platform = detectPlatform(url)
  let metadata: UrlMetadata | null = null

  // 2. oEmbed（仅 YouTube、Bilibili 等支持的平台，1 个 HTTP，<500ms）
  if (OEMBED_PROVIDERS[platform]) {
    metadata = await fetchOEmbedMetadata(url, OEMBED_PROVIDERS[platform])
    if (metadata?.title || metadata?.coverImage) {
      await setCachedMetadata(url, metadata)
      return metadata
    }
  }

  // 3. open-graph-scraper（通用网页，1 个 HTTP，<3s）
  // 跳过已知反爬平台，直接 fallback，不浪费资源
  const antiBotPlatforms = ['douyin', 'xiaohongshu', 'kuaishou', 'weibo', 'wechat']
  if (!antiBotPlatforms.includes(platform)) {
    metadata = await fetchOgsMetadata(url)
    if (metadata?.title || metadata?.coverImage) {
      await setCachedMetadata(url, metadata)
      return metadata
    }
  }

  // 4. 平台默认 fallback（0 HTTP，零成本）
  metadata = await getPlatformFallbackMetadata(platform)
  
  // 5. 可选：Cloudflare Worker（异步/延迟调用，不阻塞）
  if (CLOUDFLARE_WORKER_URL && antiBotPlatforms.includes(platform)) {
    fetchCloudflareWorkerFallback(url)
      .then(workerResult => {
        if (workerResult.title || workerResult.coverImage) {
          setCachedMetadata(url, workerResult)
          // 如果有对应的 collection，可以异步更新
        }
      })
      .catch(() => {})
  }

  return metadata
}
```

### 3.4 缓存策略强化

| 层级 | 当前 TTL | 优化后 TTL | 说明 |
|------|---------|-----------|------|
| Redis 缓存 | 1 小时 | **24 小时** | 链接元数据变化频率极低 |
| 内存缓存（LRU） | 无 | **5 分钟/1000条** | 热点链接直接内存命中 |
| 客户端缓存 | 无 | **Cache-Control: max-age=86400** | 减少重复请求 |

```typescript
// 新增内存缓存（比 Redis 更快）
import LRU from 'lru-cache'

const memoryCache = new LRU<string, UrlMetadata>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 分钟
})

async function getCachedMetadata(url: string): Promise<UrlMetadata | null> {
  // L1: 内存缓存
  const mem = memoryCache.get(url)
  if (mem) return mem
  
  // L2: Redis 缓存
  const redis = getRedisClient()
  if (redis) {
    const raw = await redis.get(`md:${url}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      memoryCache.set(url, parsed) // 回填内存缓存
      return parsed
    }
  }
  
  return null
}
```

### 3.5 资源限制配置

```typescript
// 抓取配置
const FETCH_CONFIG = {
  maxConcurrent: 3,           // 最大并发抓取数
  timeoutPerRequest: 5000,    // 单次 HTTP 超时 5s
  totalTimeout: 8000,         // 总超时 8s
  maxRedirects: 3,            // 最大重定向次数
  maxResponseSize: 2 * 1024 * 1024, // 最大响应体 2MB（防止大页面拖垮内存）
}

// ogs 配置
const ogsOptions = {
  timeout: FETCH_CONFIG.timeoutPerRequest,
  fetchOptions: {
    headers: { 'User-Agent': 'Mozilla/5.0 ...' },
    size: FETCH_CONFIG.maxResponseSize, // 限制响应大小
    follow: FETCH_CONFIG.maxRedirects,
  },
  onlyGetOpenGraphInfo: false,
}
```

---

## 四、实施步骤（分阶段）

### 第一阶段：立即可做（1-2 天）

1. **安装依赖**
   ```bash
   npm install open-graph-scraper p-limit lru-cache
   npm install -D @types/open-graph-scraper
   ```

2. **创建异步队列模块** `services/metadata-queue.ts`
   - 使用 `p-limit` 控制最大并发 3
   - 封装 `addMetadataTask(collectionId, url, fields)`

3. **修改添加收藏路由**
   - 立即返回默认数据
   - 触发后台 `metadataQueue.add()`

4. **强化 Redis 缓存 TTL**
   - 从 1 小时改为 24 小时

### 第二阶段：替换解析引擎（2-3 天）

1. **引入 `open-graph-scraper`**
   - 创建 `fetchOgsMetadata()` 函数
   - 在 `fetchUrlMetadata()` 中替换手写的 `doFetchHtml`

2. **删除/简化平台专属函数**
   - 保留：Bilibili API（成功率高）
   - 删除：小红书、抖音、快手、知乎等手写抓取（成功率低，浪费资源）
   - 简化：直接返回平台 fallback

3. **添加内存缓存层**
   - LRU 1000 条，5 分钟 TTL

### 第三阶段：测试与监控（1-2 天）

1. **压力测试**
   - 模拟 10 个并发添加收藏
   - 监控内存、CPU、响应时间

2. **添加指标上报**
   ```typescript
   // 记录抓取成功率
   console.log(`[Metadata] url=${url} success=${!!metadata.title} duration=${duration}ms`)
   ```

---

## 五、预期收益

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 添加收藏 API 响应时间 | 3-10s | **< 100ms** | **30-100x** |
| 单请求 HTTP 数 | 3-5 个 | **1-2 个** | **60%↓** |
| 内存占用（并发抓取时） | 20-50MB/请求 | **< 5MB/请求** | **80%↓** |
| 代码维护量 | 1843 行 | **~800 行** | **55%↓** |
| 服务器安全并发抓取数 | 5-8 | **15-25** | **3x** |
| 缓存命中率 | ~30% | **~70%** | **2.3x** |

### 服务器容量变化

| 场景 | 优化前安全并发 | 优化后安全并发 |
|------|--------------|--------------|
| 用户同时添加收藏 | 5-8 | 15-25 |
| 高峰 DAU 承载 | 100-150 | 300-500 |

---

## 六、风险与应对

| 风险 | 应对 |
|------|------|
| 异步抓取后用户看到默认标题 | 前端添加"正在获取信息..."状态，获取成功后无感更新 |
| `open-graph-scraper` 提取失败 | 保留平台 fallback，确保列表不空白 |
| 并发限制导致队列堆积 | 超过 50 个待处理任务时，丢弃最旧的任务 |
| 某些网站 ogs 无法解析 | 保留 Cloudflare Worker 作为最终兜底 |

---

## 七、代码变更范围预估

```
services/metadata.ts    -600 行（删除手写解析，引入 ogs）
                        +100 行（ogs 封装 + 内存缓存）

services/metadata-queue.ts   新增 ~80 行（异步队列）

routes/collections.ts   ~20 行修改（添加收藏路由异步化）

lib/config.ts           ~10 行修改（新增抓取配置）

package.json            +3 依赖（ogs, p-limit, lru-cache）
```

---

## 八、总结

本方案立足于 **2核2GB 服务器的硬件约束**，核心思路是：

1. **异步化** → API 响应从 3-10s 降到 <100ms，用户体验质变
2. **轻量库替代手写** → 用 `open-graph-scraper` 替换 500+ 行 cheerio 解析，降低维护成本
3. **减少无效抓取** → 反爬平台直接 fallback，不浪费服务器资源
4. **强化缓存** → 24h Redis + 5min 内存缓存，大幅减少重复请求
5. **并发控制** → `p-limit` 限制 max 3 并发，防止资源耗尽

**预期效果**：在不升级服务器的前提下，将 metadata 相关的服务器承载能力提升 **3-5 倍**，同时显著提升用户体验。
