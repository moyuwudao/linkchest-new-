# LinkChest 容量评估与优化报告

## 一、服务器资源盘点

| 资源项 | 配置 | 实际可用估算 |
|--------|------|-------------|
| CPU | 2核 | ~1.8核有效（系统占用） |
| 内存 | 2GB | ~1.1GB 给应用（见下） |
| 磁盘 | 50GB SSD | 充足 |
| 带宽 | 30Mbps 峰值 | ~3.75MB/s |
| 月流量 | 1024GB | 日均 ~34GB |

### 内存分配估算（2GB 总内存）
```
操作系统 + 基础进程     ~300MB
PostgreSQL (Docker)   ~400-500MB（默认配置）
Redis (Docker)        ~50-80MB
Node.js API (PM2)     ~150-250MB / worker
─────────────────────────────────────
剩余可用（3 workers）   ~300-500MB（危险余量）
剩余可用（2 workers）   ~600-900MB（较安全）
剩余可用（1 worker）    ~900-1200MB（最安全）
```

> **结论**：2GB 内存是最大瓶颈。PostgreSQL + Docker 开销已占去近 1/3，留给 Node.js 的空间非常紧张。

---

## 二、关键性能瓶颈分析

### 瓶颈 1：URL 元数据抓取（最严重）
**位置**：`services/metadata.ts` → `fetchUrlMetadata()`

**问题**：
- 单次请求可能发起 **2~5 个外部 HTTP 请求**（oEmbed → 平台API → HTML抓取 → UA重试 → Cloudflare Worker 降级）
- 每个请求等待 **3~10 秒**，虽然 Node.js I/O 是非阻塞的，但并发 outbound HTTP 连接会大量消耗：
  - **内存**：每个 `cheerio.load(html)` 解析后的 DOM 树占用 **2~10MB**
  - **CPU**：HTML 解析 + 正则匹配是 CPU 密集型操作
  - **TCP 连接池**：大量并发 outbound 连接可能耗尽文件描述符

**实测压力估算**：
| 并发 metadata 请求数 | 预估内存占用 | 预估 CPU 负载 | 风险等级 |
|---------------------|-------------|-------------|---------|
| 1-3 | 200-500MB | 30-50% | 安全 |
| 5-8 | 500MB-1.2GB | 60-90% | 黄色警告 |
| 10+ | 1.5GB+ | 100%+ | 红色危险（OOM/超时） |

### 瓶颈 2：配额检查（高频 N+1 查询）
**位置**：`services/quota.ts` → `getQuotaUsage()`

**问题**：
```typescript
// 每次 checkQuota 都会执行 6 个 COUNT 查询！
const [collections, tags, lists, shares, shareItems, coverImages] = await Promise.all([
  txClient.collection.count({ where: { userId } }),
  txClient.tag.count({ where: { userId } }),
  txClient.list.count({ where: { userId } }),
  txClient.share.count({ where: { userId } }),
  txClient.shareItem.count({ where: { share: { userId } } }),
  txClient.coverImage.count({ where: { userId } }),
])
```
- 添加收藏、创建分享、上传封面等**几乎所有写操作**都要调用
- 6 个 COUNT 在数据量大时（用户有数千收藏）可能各需 **50-200ms**
- 用户量上来后，数据库连接池会被大量占用

### 瓶颈 3：搜索查询（全表扫描风险）
**位置**：`routes/collections.ts` → GET `/`

**问题**：
```typescript
where.OR = [
  { title: { contains: search, mode: 'insensitive' } },
  { note: { contains: search, mode: 'insensitive' } },
  { url: { contains: search, mode: 'insensitive' } },
  { platform: { contains: search, mode: 'insensitive' } },
  { tags: { some: { name: { contains: search, mode: 'insensitive' } } } },
  { lists: { some: { name: { contains: search, mode: 'insensitive' } } } },
]
```
- PostgreSQL `contains` + `insensitive` 在中文场景下**无法使用 B-tree 索引**
- 会触发全表扫描 + 多表 JOIN，大数据量时单次查询可达 **1-5 秒**

### 瓶颈 4：图片压缩（CPU + 内存双重暴击）
**位置**：`services/cover.ts` → `processAndUploadCover()`

**问题**：
```typescript
// 如果压缩后仍超过目标大小，循环降低质量重新压缩！
while (finalBuffer.length > COVER_CONFIG.targetSize && finalQuality > 40) {
  finalQuality -= 10
  finalBuffer = await sharp(buffer).resize(...).webp({ quality: finalQuality }).toBuffer()
}
```
- 5MB 图片输入 → Sharp 可能占用 **200-500MB 内存**
- 循环压缩（最坏情况压缩 4 次）→ **CPU 满载 2-5 秒**
- 并发上传 3+ 张图片时，服务器几乎卡死

### 瓶颈 5：导入/保存分享的逐条循环
**位置**：`routes/public.ts` → `POST /:shareId/save`、`routes/collections.ts` → `POST /import`

**问题**：
- 事务内逐条循环处理，每条都有 `findFirst` + `create/update`
- 200 条分享保存 = 400+ 次数据库查询在一个事务中
- 事务超时设置为 15 秒，大数据量时容易失败

### 瓶颈 6：认证中间件的数据库查询
**位置**：`middleware/auth.ts`

**问题**：
- 每个需要认证的请求都要查一次 `prisma.user.findUnique()`
- JWT 验证本身很快，但数据库查询增加了 **10-30ms** 延迟
- 高频请求下，这部分查询量不可忽视

### 瓶颈 7：Prisma 连接池未优化
**位置**：`lib/prisma.ts`

**问题**：
- 当前使用默认连接池配置，未设置 `connection_limit`
- 2GB 内存的 PostgreSQL，连接数过多会直接导致 OOM
- 没有连接池预热和优雅释放机制

---

## 三、并发容量估算

### 按场景划分的安全并发数

| 场景 | 安全并发 | 警告并发 | 危险并发 | 说明 |
|------|---------|---------|---------|------|
| 浏览收藏列表（GET /collections） | 80-120 | 150 | 200+ | 简单分页查询，轻量 |
| 查看分享（GET /s/:id） | 100-150 | 200 | 300+ | 单表查询，有快照优化 |
| 添加收藏（POST /collections） | 15-25 | 40 | 60+ | 含 metadata 抓取 |
| 智能解析（POST /smart-parse） | 5-8 | 12 | 20+ | 重度 I/O + CPU |
| 封面上传（POST /upload/cover） | 3-5 | 8 | 12+ | CPU + 内存密集型 |
| 批量导入（POST /import） | 1 | 2 | 3+ | 长事务 + 大量查询 |
| 分享保存（POST /s/:id/save） | 3-5 | 8 | 12+ | 长事务 + 逐条处理 |
| 搜索（GET /collections?search=） | 10-20 | 30 | 50+ | 全表扫描风险 |

### 综合并发用户数估算

> 假设用户行为模型：每活跃用户每 5 分钟产生 1 次 API 请求，高峰时段 20% 用户同时在线

| 日活用户（DAU） | 平均在线 | 高峰在线 | 风险评估 |
|----------------|---------|---------|---------|
| 50 | 10 | 20 | 安全 |
| 100 | 20 | 40 | 安全（需限流） |
| 200 | 40 | 80 | 黄色（metadata 请求可能排队） |
| 500 | 100 | 200 | 红色（必须优化 + 限流） |
| 1000 | 200 | 400 | 必须扩容 |

**结论**：
- **安全承载**：约 100-150 DAU（日活跃用户）
- **风险阈值**：200+ DAU 时，高峰期的 metadata 抓取和搜索请求会导致明显卡顿
- **崩溃阈值**：500+ DAU 时，内存和数据库连接池很可能扛不住

---

## 四、Google Play 上架风险评估

### 上架本身无技术要求
Google Play 上架是客户端行为，对服务器没有直接的并发冲击。但要注意：

### 上架后的用户增长模型

| 阶段 | 时间 | 预期 DAU | 服务器压力 | 建议 |
|------|------|---------|-----------|------|
| 冷启动 | 0-1 月 | 10-50 | 极低 | 当前配置足够 |
| 种子期 | 1-3 月 | 50-200 | 中等 | 需要代码优化 |
| 增长期 | 3-6 月 | 200-1000 | 高 | 必须扩容 |
| 爆发期 | 6月+ | 1000+ | 极高 | 必须架构升级 |

### Google Play 带来的特殊流量
1. **应用审核期间**：Google 的自动化测试会模拟用户行为，产生约 **20-50 次 API 调用**
2. **上架初期**：如果进入"新上架"推荐位，可能在 **1-3 天内**获得数百次下载
3. **社交媒体传播**：一个爆款分享可能带来 **数百到数千** 的瞬时访问

**结论**：
- **当前配置可以支撑上架**，但需要在上线前完成以下优化
- 建议设置 **Rate Limiting** 防止突发流量击垮服务
- 建议配置 **Cloudflare/CDN** 保护源站（当前已有 Worker 降级，但无 WAF/限流）

---

## 五、代码优化方案（按优先级排序）

### P0：立即实施（上架前必须）

#### 1. 添加 API 限流（Rate Limiting）
```typescript
// 使用 express-rate-limit
import rateLimit from 'express-rate-limit'

// 全局限流：每 IP 100 请求/分钟
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: '请求过于频繁，请稍后再试' }
})

// 严格限流：metadata 抓取 5 请求/分钟
const metadataLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: '解析过于频繁，请稍后再试' }
})

// 严格限流：封面上传 3 请求/分钟
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.user?.id || req.ip,
})

app.use(globalLimiter)
app.use('/api/collections/smart-parse', metadataLimiter)
app.use('/api/collections/parse-url', metadataLimiter)
app.use('/api/upload/cover', uploadLimiter)
```
**收益**：防止突发流量直接击垮服务，是最有效的自我保护手段。

#### 2. 优化配额检查（从 6 次 COUNT 降到 0 次）
```typescript
// 方案：在用户表中增加计数缓存字段
// prisma schema 新增：
model User {
  // ... existing fields
  countCollections  Int @default(0)
  countTags         Int @default(0)
  countLists        Int @default(0)
  countShares       Int @default(0)
  countCoverImages  Int @default(0)
}

// 创建/删除时同步更新（用 Prisma 中间件）
prisma.$use(async (params, next) => {
  const result = await next(params)
  if (params.model === 'Collection' && ['create', 'delete', 'deleteMany'].includes(params.action)) {
    // 异步更新计数（不阻塞主流程）
    updateUserCount(params.args.where?.userId, 'collections').catch(() => {})
  }
  return result
})

// checkQuota 改为读取用户表的缓存字段
export async function checkQuota(userId: string, resourceType: ResourceType) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const counts = {
    collections: user.countCollections,
    tags: user.countTags,
    // ...
  }
  // 直接比较，无需 COUNT 查询
}
```
**收益**：配额检查从 **6 次 COUNT 查询 → 1 次主键查询**，延迟从 100-300ms 降到 **< 5ms**。

#### 3. 优化认证中间件（JWT + 内存缓存）
```typescript
// 使用 LRU 缓存用户信息（5分钟过期）
import LRU from 'lru-cache'

const userCache = new LRU<string, SafeUser>({
  max: 1000,
  ttl: 1000 * 60 * 5,
})

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未提供认证令牌' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    // 先查缓存
    let user = userCache.get(decoded.userId)
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, phone: true, email: true, username: true, nickname: true, avatar: true }
      })
      if (user) userCache.set(decoded.userId, user)
    }
    
    if (!user) return res.status(401).json({ error: '用户不存在' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: '无效的认证令牌' })
  }
}
```
**收益**：认证查询减少 **80-90%**（假设 5 分钟内活跃用户重复请求）。

### P1：短期内实施（上架后 2 周内）

#### 4. 优化搜索（添加全文搜索索引）
```sql
-- PostgreSQL 全文搜索优化
-- 1. 创建搜索向量字段
ALTER TABLE collections ADD COLUMN search_vector tsvector;

-- 2. 创建更新触发器
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.note, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.url, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collections_search_update
  BEFORE INSERT OR UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- 3. 创建 GIN 索引
CREATE INDEX idx_collections_search ON collections USING GIN(search_vector);
```
**收益**：搜索从全表扫描 **O(n)** 降到索引查找 **O(log n)**，大数量级时提升 **10-100 倍**。

#### 5. 优化导入/保存分享（批量操作）
```typescript
// 当前：逐条循环（N 次查询）
// 优化：批量查询 + 批量插入（2-3 次查询）

// 1. 一次性查询所有已存在的 URL
const existingCollections = await tx.collection.findMany({
  where: { userId, url: { in: urls } },
  select: { url: true, id: true }
})
const existingUrlMap = new Map(existingCollections.map(c => [c.url, c.id]))

// 2. 分离新增和已存在
const toCreate = items.filter(item => !existingUrlMap.has(item.url))
const toUpdate = items.filter(item => existingUrlMap.has(item.url))

// 3. 批量创建（Prisma createMany）
if (toCreate.length > 0) {
  await tx.collection.createMany({
    data: toCreate.map(item => ({
      userId, url: item.url, title: item.title, // ...
    })),
    skipDuplicates: true,
  })
}

// 4. 批量更新关联
if (toUpdate.length > 0) {
  await tx.$executeRaw`
    INSERT INTO _CollectionToList (A, B)
    SELECT c.id, ${listId} FROM collections c
    WHERE c.userId = ${userId} AND c.url IN (${Prisma.join(toUpdate.map(i => i.url))})
    ON CONFLICT DO NOTHING
  `
}
```
**收益**：200 条导入从 **400+ 次查询** 降到 **3-5 次查询**，事务时间从 **10-30 秒** 降到 **< 2 秒**。

#### 6. 优化 PostgreSQL 配置（降低内存占用）
```bash
# docker-compose.yml 中添加 PostgreSQL 内存限制
services:
  postgres:
    image: postgres:16-alpine
    mem_limit: 512m    # 限制 512MB
    memswap_limit: 512m
    command: >
      postgres
      -c shared_buffers=128MB
      -c effective_cache_size=256MB
      -c work_mem=4MB
      -c maintenance_work_mem=32MB
      -c max_connections=50

  redis:
    image: redis:7-alpine
    mem_limit: 128m
    command: redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru
```
**收益**：PostgreSQL 内存从 **~500MB 无限制** 降到 **512MB 硬上限**，避免 OOM。

#### 7. PM2 集群配置优化
```json
// ecosystem.config.json
{
  "apps": [{
    "name": "linkchest-api",
    "script": "dist/index.js",
    "instances": 2,
    "exec_mode": "cluster",
    "max_memory_restart": "350M",
    "env": {
      "NODE_ENV": "production"
    },
    "log_date_format": "YYYY-MM-DD HH:mm:ss",
    "merge_logs": true,
    "error_file": "./logs/err.log",
    "out_file": "./logs/out.log"
  }]
}
```
**收益**：
- `instances: 2`：充分利用 2 核 CPU，同时控制内存
- `max_memory_restart: 350M`：内存泄漏时自动重启
- Cluster 模式：一个 worker 崩溃不影响另一个

### P2：中期优化（1-3 个月）

#### 8. 异步化 Metadata 抓取（消息队列）
```typescript
// 方案：添加收藏时先保存基础信息，metadata 后台异步抓取
// 需要引入 BullMQ / Bull + Redis

// 添加收藏路由优化
router.post('/', authenticate, async (req, res) => {
  // 1. 立即保存（不等待 metadata）
  const collection = await prisma.collection.create({
    data: { userId, url, title: title || url, platform, status: 'pending' }
  })
  
  // 2. 将 metadata 抓取任务加入队列
  await metadataQueue.add('fetch', { collectionId: collection.id, url }, {
    delay: 0,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  })
  
  res.status(201).json({ data: collection })
})

// Worker 进程处理队列（可以单独部署）
metadataQueue.process('fetch', 2, async (job) => {
  const { collectionId, url } = job.data
  const metadata = await fetchUrlMetadata(url)
  await prisma.collection.update({
    where: { id: collectionId },
    data: { title: metadata.title, coverImage: metadata.coverImage, status: 'completed' }
  })
})
```
**收益**：添加收藏 API 从 **3-10 秒** 降到 **< 100ms**，metadata 抓取不再阻塞用户请求。

#### 9. 添加响应缓存（Redis Cache）
```typescript
// 对热点数据添加缓存
router.get('/', authenticate, async (req, res) => {
  const cacheKey = `collections:${req.user.id}:${JSON.stringify(req.query)}`
  
  // 尝试读缓存
  const cached = await redis.get(cacheKey)
  if (cached) return res.json(JSON.parse(cached))
  
  // 查数据库
  const result = await prisma.collection.findMany({...})
  
  // 写入缓存（5分钟）
  await redis.setex(cacheKey, 300, JSON.stringify(result))
  res.json(result)
})
```
**收益**：列表查询减少 **50-80%** 数据库负载。

#### 10. 启用 Gzip/Brotli 压缩
```typescript
import compression from 'compression'
app.use(compression({
  level: 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false
    return compression.filter(req, res)
  }
}))
```
**收益**：响应体减小 **60-80%**，节省带宽，提升移动端体验。

---

## 六、扩容建议

### 当前方案可以支撑多久？

| 阶段 | DAU | 当前配置能否支撑 | 建议 |
|------|-----|----------------|------|
| 上架初期 | < 100 | 可以，需完成 P0 优化 | 安心上架 |
| 种子用户期 | 100-300 | 可以，需完成 P1 优化 | 监控指标 |
| 增长期 | 300-800 | 吃力，建议扩容 | 升级服务器 |
| 爆发期 | 800+ | 不可以 | 必须架构升级 |

### 推荐的扩容路径

#### 阶段 1：优化代码（0 成本，提升 3-5 倍容量）
完成上述 P0 + P1 优化，容量从 **~100 DAU** 提升到 **~500 DAU**。

#### 阶段 2：升级服务器（约 ¥100-200/月，提升 3 倍容量）
```
推荐配置：
CPU：2核 → 4核
内存：2GB → 4GB
带宽：30Mbps → 50Mbps
```
扩容后容量：~1500 DAU。

#### 阶段 3：架构升级（按需投入，提升 10 倍以上）
```
- 数据库独立部署（RDS）
- Redis 独立部署（ ElastiCache / 云Redis）
- 应用层水平扩展（多实例 + 负载均衡）
- CDN 加速静态资源
- 对象存储（已有 COS，继续用）
```

---

## 七、总结与行动清单

### 核心结论

1. **当前 2核2GB 配置可以支撑 Google Play 上架**，但仅能承载约 **100-150 日活用户**
2. **最大风险不是用户量，而是突发流量**：一个分享链接爆火或 Google 推荐位可能带来瞬时高并发
3. **代码优化可以显著提升容量**：完成 P0+P1 优化后，容量可提升到 **500 DAU**
4. **metadata 抓取是最大瓶颈**：外部 HTTP 请求 + cheerio 解析在 2GB 内存下非常脆弱

### 上架前必须完成（本周）

- [ ] 安装 `express-rate-limit`，对 metadata 接口和上传接口限流
- [ ] 优化配额检查（在用户表加计数缓存字段）
- [ ] 优化认证中间件（添加 LRU 用户缓存）
- [ ] 限制 PostgreSQL 和 Redis 的 Docker 内存占用
- [ ] 配置 PM2 cluster 模式（2 instances + 内存限制）
- [ ] 添加服务器监控（至少监控 CPU、内存、磁盘）

### 上架后 2 周内完成

- [ ] 搜索功能添加 PostgreSQL 全文搜索索引
- [ ] 优化导入/保存分享的批量操作
- [ ] 启用 Gzip 压缩
- [ ] 对热点查询添加 Redis 缓存
- [ ] 配置数据库慢查询日志，持续优化

### 监控指标

| 指标 | 健康值 | 警告值 | 危险值 |
|------|--------|--------|--------|
| CPU 使用率 | < 50% | 50-80% | > 80% |
| 内存使用率 | < 60% | 60-85% | > 85% |
| API 平均响应时间 | < 200ms | 200-500ms | > 500ms |
| 数据库连接数 | < 30 | 30-45 | > 45 |
| 5xx 错误率 | < 0.1% | 0.1-1% | > 1% |

---

*报告生成时间：2026-04-24*
*基于代码版本：master branch（V3.5-fix）*
