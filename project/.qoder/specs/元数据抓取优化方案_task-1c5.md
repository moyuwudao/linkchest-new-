# 优化数据抓取能力 + 服务器性能榨取方案

## 服务器现状（4台服务器，双区域分离部署）

> 数据来源：服务器监控面板（实时）

| 服务器 | 位置 | CPU | 总内存 | 已用 | Node RSS | Node Heap | 负载(1m) | 用途 |
|--------|------|-----|--------|------|----------|-----------|----------|------|
| 海外应用层 | 雅加达 | **2核** | **3.6 GB** | 1.0 GB (27.2%) | 215 MB | 69 MB | 0.16 | API + Web + Redis + Nginx |
| 海外数据层 | 新加坡 | **2核** | **1.9 GB** | 0.6 GB (30.0%) | — | — | 0.00 | PostgreSQL 16 专用 |
| 国内应用层 | 广州 | **4核** | **7.6 GB** | 1.6 GB (21.1%) | 188 MB | 54 MB | 0.06 | API + Web + Redis + Nginx |
| 国内数据层 | 广州 | **2核** | **3.6 GB** | 0.7 GB (20.3%) | — | — | 0.00 | PostgreSQL 16 专用 |

### 关键发现：服务器严重空闲

| 服务器 | CPU利用率 | 内存利用率 | 诊断 |
|--------|-----------|-----------|------|
| 海外应用层 | 负载0.16/2核 = **8%** | 27.2% | ⚠️ 内存总量小(3.6G)，PM2阈值3G危险 |
| 海外数据层 | **0%** | 30.0% | ✅ 空闲，但仅1.9G给PG |
| 国内应用层 | 负载0.06/4核 = **1.5%** | 21.1% | ✅ 极度空闲，大量资源浪费 |
| 国内数据层 | **0%** | 20.3% | ✅ 极度空闲 |

### 核心问题诊断

1. **海外应用层(3.6G)配置危险**: ecosystem.config.js 的 PM2 重启阈值设为 3G，但服务器总内存只有 3.6G。这意味着进程可能先被 OS OOM Killer 杀掉，而非 PM2 主动重启
2. **国内应用层(4核7.6G)极度浪费**: CPU 负载仅 1.5%，内存仅用 21%，Node.js 实际只用了 188MB RSS。4核中有 3.85 核空闲
3. **海外架构跨地域**: 应用层在雅加达，数据层在新加坡，DB 查询有额外 5-15ms 跨地域延迟
4. **所有服务器的 Node.js 堆内存都极小**: 最大 69MB Heap，说明当前流量很低，主要瓶颈是内存配置而非实际负载

### 当前关键参数

| 配置项 | 海外应用层(2C3.6G) | 国内应用层(4C7.6G) |
|--------|----------------------|---------------------|
| METADATA_MAX_CONCURRENT | 5 | 5 |
| METADATA_FETCH_TIMEOUT_MS | 4000 | 4000 |
| METADATA_TOTAL_TIMEOUT_MS | 8000 | 8000 |
| Prisma connection_limit | 10 | 10 |
| LRU 缓存条目 | 500 | 500 |
| PM2 实例数 | API×1 + Web×1 | API×1 + Web×1 |
| Node.js 堆内存 | 未设置 | 未设置 |
| PM2 重启阈值 | **3G ⚠️危险** | 3G |
| PG 调优 | tune-pg.sql(按4G配) | docker-compose.cn.yml(按4G配) |

---

## 第一部分：优化方案与服务器冲突分析

### 结论：**无冲突，所有服务器资源充裕，可放心实施**

| 优化 Task | 资源影响 | 海外(2C3.6G) | 国内(4C7.6G) |
|-----------|----------|------------|------------------|
| Task 1 Cheerio 解析 | 每次解析临时+1-5MB | ✅ 无风险(Node仅215MB) | ✅ 无风险 |
| Task 2 JSON-LD 提取 | 复用 cheerio | ✅ 无风险 | ✅ 无风险 |
| Task 3 短链预解析 | 多1次HEAD请求 | ✅ 低风险 | ✅ 低风险 |
| Task 4 并行策略 | 并发连接翻倍 | ⚠️ 雅加达↔新加坡延迟 | ✅ 低风险 |
| Task 5 API 直调 | 新增HTTP请求 | ✅ 低风险 | ✅ 低风险 |
| Task 6 Worker 增强 | 云端执行 | ✅ 无风险 | ✅ 无风险 |
| Task 7 扩展回写 | 1个PUT接口 | ✅ 无风险 | ✅ 无风险 |
| Task 8+9 统计/自适应 | Redis counter | ✅ 无风险 | ✅ 无风险 |

**关键发现**:
- **海外最大风险不是性能而是配置错误**: PM2 阈值 3G 对 3.6G 服务器极其危险，必须优先修正
- **国内服务器浪费严重**: 4核7.6G 只用了 1.5% CPU + 21% 内存，PM2 集群可以大幅提升吞吐
- **cheerio 已安装(^1.2.0)**，Task 1/2 无需新依赖

---

## 第二部分：服务器性能榨取（按服务器分 Task）

### 海外应用层 (雅加达, 2核3.6G) — ⚠️ 紧急修复配置错误

#### Task S1: 【紧急】海外 PM2 内存阈值修正
- **文件**: `deploy/ecosystem.config.js`
- **现状**: API/Web 的 `max_memory_restart: '3G'`，但服务器总内存只有 3.6G！进程可能在 PM2 重启前就被 OOM Killer 杀掉
- **改动**: API `max_memory_restart: '1G'`，Web `max_memory_restart: '800M'`
- **依据**: 当前 Node RSS 仅 215MB，设 1G 已有 4.6 倍余量，总 PM2 上限 1.8G 给 OS+Redis 留足 1.8G
- **收益**: 消除 OOM 崩溃风险，PM2 能正常触发重启而非被系统强杀

#### Task S2: 海外 Node.js 堆内存显式设置
- **文件**: `deploy/start-api.sh`, `deploy/start-web.sh`
- **现状**: 未设置 `--max-old-space-size`，V8 默认堆上限 ~700MB（3.6G系统自动计算）
- **改动**: API 添加 `NODE_OPTIONS="--max-old-space-size=512"`，Web 添加 `NODE_OPTIONS="--max-old-space-size=384"`
- **收益**: 堆内存可控，GC 压力小，与 PM2 阈值配合形成安全梯度（512MB堆 < 1G PM2 < 3.6G OS）

#### Task S3: 海外 Redis 内存上限
- **文件**: `docker-compose.yml`
- **改动**: Redis 添加 `command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru`
- **收益**: 防止 Redis 在小内存服务器上吃光剩余内存

#### Task S4: 海外 PG 调优修正
- **文件**: `deploy/tune-pg.sql`
- **现状**: effective_cache_size=3072MB，但海外 PG 在独立 1.9G 服务器上！
- **改动**:
  ```sql
  ALTER SYSTEM SET effective_cache_size = '1200MB';  -- 3072→1200（适配 1.9G）
  ALTER SYSTEM SET shared_buffers = '384MB';         -- 新增
  ALTER SYSTEM SET work_mem = '4MB';                 -- 8→4MB（小内存服务器减半）
  ALTER SYSTEM SET maintenance_work_mem = '128MB';    -- 256→128MB
  ```
- **收益**: PG 不再过度占用 1.9G 服务器的有限内存

### 海外数据层 (新加坡, 2核1.9G) — PG 专用

#### Task S5: 海外数据层 PG 启动参数修正
- **文件**: 数据层 Docker 配置（对应海外专用的 docker-compose，可能复用 `docker-compose.yml` 或独立配置）
- **改动**: PG 容器 `mem_limit: 1G`，`shared_buffers=384MB`，`max_connections=50`
- **收益**: 1.9G 服务器中 PG 安全运行，不超内存

### 国内应用层 (广州, 4核7.6G) — 极度空闲，充分榨取

#### Task S6: 国内 PM2 集群模式（最大收益）
- **文件**: `deploy/ecosystem.config.js`
- **现状**: 4核只用了 1.5% 负载，Node RSS 仅 188MB
- **改动**: API 添加 `instances: 2, exec_mode: 'cluster'`，每实例 `max_memory_restart: '1.5G'`
- **收益**: 利用 2/4 核，吞吐量翻倍；仍留 2 核给 Web+Redis+Nginx
- **注意**: metadata-queue BRPOP 天然只被一个 worker 消费

#### Task S7: 国内 PM2 内存阈值合理化
- **文件**: `deploy/ecosystem.config.js`
- **现状**: 3G 阈值对 7.6G 服务器可接受，但实际 Node RSS 仅 188MB
- **改动**: API `max_memory_restart: '1.5G'`，Web `max_memory_restart: '1G'`
- **依据**: 实际 188MB，设 1.5G 已有 8 倍余量，更安全且节省内存
- **收益**: 总 PM2 上限从 6G 降至 2.5G，释放 3.5G 给系统缓存

#### Task S8: 国内 Node.js 堆内存显式设置
- **文件**: `deploy/start-api.sh`, `deploy/start-web.sh`
- **改动**: API `NODE_OPTIONS="--max-old-space-size=1024"`，Web `NODE_OPTIONS="--max-old-space-size=512"`
- **收益**: 与 PM2 阈值配合形成安全梯度

#### Task S9: 国内 Prisma 连接池扩容
- **文件**: `.env`（DATABASE_URL 参数）
- **现状**: connection_limit=10
- **改动**: `connection_limit=15&pool_timeout=15`
- **注意**: 跨服 DB 查询有延迟，连接建立成本高，连接池不宜太小
- **收益**: 并行化后不会连接池耗尽

#### Task S10: 国内 Redis 内存上限
- **文件**: `docker-compose.cn.yml` 或应用层 docker-compose
- **改动**: `maxmemory 256mb --maxmemory-policy allkeys-lru`

### 国内数据层 (广州, 2核3.6G) — 已较合理

#### Task S11: 国内数据层 PG 微调
- **现状**: docker-compose.cn.yml 配 shared_buffers=1GB, effective_cache_size=2GB — 对 3.6G 服务器合理
- **可选**: `max_connections` 从 100 降到 50（国内并发低，每连接节省 ~8MB）
- **可选**: `work_mem` 从 8MB 提到 16MB（利用空闲内存改善查询性能）

---

## 第三部分：抓取优化（保留原方案 Task 1-10）

### P0 — 立即实施（投入小、收益大）

#### Task 1: HTML 解析从正则切换到 Cheerio
- **文件**: `apps/api/src/services/metadata.ts` — `fetchHtmlMetadata()`
- **改动**: 将 og/twitter 正则替换为 cheerio 选择器，补充属性顺序变体和 canonical URL
- **影响**: HTML fallback 成功率 +15-25%

#### Task 2: 新增 JSON-LD 结构化数据提取
- **文件**: `apps/api/src/services/metadata.ts` — `fetchHtmlMetadata()`
- **改动**: 提取 `<script type="application/ld+json">` 中的 name/image/description
- **影响**: B/C 级平台（新闻、电商、博客、开发工具）成功率显著提升

#### Task 3: 短链接预解析
- **文件**: `metadata.ts` + `share-parser.ts`（导出常量）
- **改动**: 在抓取前检测短链域名，HEAD 请求解析真实 URL + 移除 tracking 参数
- **影响**: xhslink.com/b23.tv/t.co 等短链的平台识别率和缓存命中率大幅提升

### P1 — 近期实施

#### Task 4: 并行策略执行（需配合 S1/S3）
- **改动**: OEmbed + OGS 并行 `Promise.race`，反爬平台 Worker + fallback 并行
- **影响**: 平均耗时从 6-8s 降至 3-4s
- **前置**: Task S3（连接池扩容）

#### Task 5: 扩展 API 直调平台
- **改动**: 新增知乎、掘金、CSDN、豆瓣、GitHub 的 API 直调
- **影响**: S/A 级平台成功率接近 100%

#### Task 6: Cloudflare Worker 增强
- **改动**: 新增 5+ 平台、缓存 TTL 从 5min→1h、JSON-LD 提取
- **影响**: Worker 兜底成功率提升，重复请求减少

#### Task 7: Chrome 扩展提取结果回写
- **改动**: 新增 `PUT /api/collections/:id/client-metadata` 接口
- **影响**: 扩展用户获得最高质量元数据

### P2 — 持续改进

#### Task 8: 按平台维度的抓取成功率统计
#### Task 9: 自适应超时
#### Task 10: URL 规范化（缓存命中率 +20-30%）

---

## 执行顺序建议

```
第一批（紧急修复 + 服务器调优，按服务器独立执行）:

  海外应用层(雅加达 2C3.6G) — 优先修复配置错误:
    S1: 【紧急】PM2阈值 3G→1G/800M（消除OOM风险）
    S2: Node.js 堆内存设置(512/384MB)
    S3: Redis 内存上限 128MB

  海外数据层(新加坡 2C1.9G):
    S4: PG 调优修正(effective_cache_size 3072→1200MB)
    S5: PG 启动参数修正(shared_buffers 384MB)

  国内应用层(广州 4C7.6G) — 充分榨取空闲资源:
    S6: PM2 集群模式(2实例)
    S7: PM2 阈值合理化(3G→1.5G/1G)
    S8: Node.js 堆内存设置(1024/512MB)
    S9: Prisma 连接池扩容(10→15)
    S10: Redis 内存上限 256MB

  国内数据层(广州 2C3.6G):
    S11: PG 微调（可选）

第二批（P0 抓取优化，改动小收益大）:
  Task 1: Cheerio 解析
  Task 2: JSON-LD 提取
  Task 3: 短链预解析

第三批（P1 抓取优化，配合服务器调优后实施）:
  Task 4: 并行策略（依赖 S9 连接池扩容）
  Task 5-7: API直调/Worker/扩展回写
```

## 修改文件清单

| 文件 | Tasks | 目标服务器 |
|------|-------|----------|
| `deploy/ecosystem.config.js` | S1,S6,S7 | 海外 + 国内应用层 |
| `deploy/start-api.sh` | S2,S8 | 海外 + 国内应用层 |
| `deploy/start-web.sh` | S2,S8 | 海外 + 国内应用层 |
| `deploy/tune-pg.sql` | S4 | 海外数据层 |
| `docker-compose.yml` | S3,S5 | 海外应用层 + 数据层 |
| `docker-compose.cn.yml` | S10,S11 | 国内应用层 + 数据层 |
| `apps/api/src/services/metadata.ts` | 1,2,3,4,8,9,10 | 代码层 |
| `apps/api/src/services/share-parser.ts` | 3 | 代码层 |
| `workers/metadata-fetcher/src/index.ts` | 6 | Cloudflare Worker |
| `apps/chrome-extension/src/background/service-worker.ts` | 7 | Chrome 扩展 |
| `apps/api/src/routes/collections.ts` | 7 | 代码层 |

## 验证

- 海外: `ssh linkchest-global "pm2 list"` 确认 PM2 阈值 + `docker stats` 确认 PG/Redis 内存
- 国内: `ssh linkchest-cn-app "pm2 list"` 确认集群实例 + `ssh linkchest-cn-db "docker exec linkchest-db pg_stat_activity"` 确认连接数
- 抓取优化后: 用已知 URL 列表（S/A/B/C 级各 2-3 个）跑 `fetchUrlMetadata()`，对比前后成功率
- 上线后观察 `/api/admin/metadata-stats` 按平台成功率变化