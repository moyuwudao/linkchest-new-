---
alwaysApply: false
description: 性能优化策略 - 定义性能优化方法、MCP 工具和最佳实践
---

# PERFORMANCE.md — 性能优化策略

> 本文档定义项目中的性能优化策略。结合新增 MCP 工具（Chrome DevTools / PostgreSQL / Context7），实现从发现到修复的闭环。

---

## 1. 性能指标

| 指标 | 说明 | 目标值 |
|------|------|--------|
| **API 响应时间** | 接口平均响应时间 | < 500ms |
| **首屏加载时间** | 页面首次渲染时间 | < 2s |
| **LCP** | Largest Contentful Paint | < 2.5s |
| **CLS** | Cumulative Layout Shift | < 0.1 |
| **INP** | Interaction to Next Paint | < 200ms |
| **数据库查询** | 单查询执行时间 | < 100ms |

---

## 2. MCP 性能工具（核心）

> **所有性能分析优先使用 MCP 工具，替代手动命令行执行。**

### 2.1 Chrome DevTools MCP — Web 端性能分析

| 工具 | 用途 | 使用方式 |
|------|------|----------|
| `performance_start_trace` | 录制页面加载/交互的完整 Performance Trace | 打开目标页面 → 开启录制 → 自动重载 → 获取追踪数据 |
| `performance_stop_trace` | 停止录制，输出追踪报告 | 自动分析后输出瓶颈 |
| `performance_analyze_insight` | 深入分析特定性能问题 | 针对 LCP/CLS/INP 等单项做根因分析 |
| `take_screenshot` | 截图验证渲染结果 | 对比优化前后视觉效果 |
| `list_console_messages` | 读取控制台错误/警告 | 排查 JS 报错对性能的影响 |
| `list_network_requests` | 检查所有 HTTP 请求的时序和状态 | 分析 API 响应时间、资源加载瀑布 |

**使用流程（Web 端性能体检）**：

```
你：帮我分析 http://43.136.82.88 的首页性能

我：
1. navigate_page("http://43.136.82.88")                         // 打开页面
2. performance_start_trace()                                      // 录制 Trace
3. performance_analyze_insight(insightSetId="xxx", insightName="LCPBreakdown")  // 分析 LCP
4. list_network_requests()                                        // 检查 API 响应
5. → 输出：LCP 3.2s（封面图片过大 1.8MB），TBT 620ms（第三方脚本阻塞），CLS 0.03（优秀）
   → 建议：压缩封面图 + WebP 格式 + 第三方脚本 defer
```

### 2.2 PostgreSQL MCP — 数据库性能分析

| 工具 | 用途 | 使用方式 |
|------|------|----------|
| `execute_sql`（推断） | 执行 SELECT 查询 | 查询数据分布、检查索引使用 |
| EXPLAIN 分析 | 查询计划分析 | 检测全表扫描、缺失索引 |

**使用流程（慢查询排查）**：

```
你：collections 列表接口很慢，帮我分析

我：
1. 通过 PostgreSQL MCP 执行：
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM collections WHERE "userId" = 'xxx' ORDER BY "createdAt" DESC LIMIT 20;

2. → 输出：Seq Scan on collections（全表扫描），rows=50000，actual time=320ms
   → 建议：添加 @@index([userId, createdAt]) 复合索引
```

**使用流程（部署后验证）**：

```
你：部署完成后检查数据库状态

我：
1. 通过 PostgreSQL MCP 执行：
   SELECT relname, n_live_tup FROM pg_stat_user_tables;         // 表行数统计
   SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;  // 迁移状态
2. → 输出：7 张表正常，最新迁移 m009 已应用
```

### 2.3 Context7 MCP — 性能最佳实践获取

当需要查库的性能优化 API 时，Context7 可实时获取最新文档：

```
你：Prisma 5.x 的批量插入性能优化怎么写？use context7

我：[获取 Prisma 5.x 最新文档] → 使用 createMany + skipDuplicates 替代循环 create
```

---

## 3. 性能优化层次

```
┌─────────────────────────────────────────────────────┐
│                   性能优化层次                       │
├─────────────────────────────────────────────────────┤
│                                                    │
│  L1. 数据库层 → PostgreSQL MCP（EXPLAIN + 索引分析）│
│    └── 索引优化、查询优化、缓存                      │
│                                                    │
│  L2. 后端层   → PostgreSQL MCP + Context7          │
│    └── 逻辑优化、并发处理、缓存策略                   │
│                                                    │
│  L3. 前端层   → Chrome DevTools MCP（Trace + LCP） │
│    └── 代码分割、懒加载、资源优化                     │
│                                                    │
│  L4. 网络层   → Chrome DevTools MCP（Network）     │
│    └── CDN、压缩、HTTP/2                           │
│                                                    │
└─────────────────────────────────────────────────────┘
```

---

## 4. 数据库性能优化

### 4.1 索引优化

```typescript
// ✅ 推荐：为频繁查询的字段添加索引
// schema.prisma
model Collection {
  id        String   @id @default(cuid())
  userId    String
  url       String
  platform  String
  createdAt DateTime @default(now())
  
  @@index([userId, platform])
  @@index([userId, createdAt])
}
```

### 4.2 查询优化

```typescript
// ❌ N+1 查询
const collections = await prisma.collection.findMany({ where: { userId } });
for (const c of collections) {
  const tags = await prisma.tag.findMany({ where: { collectionId: c.id } });
}

// ✅ include 预加载
const collections = await prisma.collection.findMany({
  where: { userId },
  include: { tags: true }
});
```

### 4.3 PostgreSQL MCP 验证

完成索引优化后，通过 PostgreSQL MCP 执行 EXPLAIN 验证效果：

```
EXPLAIN (ANALYZE, BUFFERS) SELECT ... WHERE "userId" = 'xxx' ORDER BY "createdAt" DESC LIMIT 20;
→ 确认使用了 Index Scan 而非 Seq Scan
→ 确认执行时间 < 10ms
```

---

## 5. 后端性能优化

### 5.1 缓存策略

```typescript
const cacheKey = `user:${userId}:collections`;
let collections = await redis.get(cacheKey);
if (!collections) {
  collections = await prisma.collection.findMany({ where: { userId } });
  await redis.set(cacheKey, JSON.stringify(collections), 'EX', 300);
}
```

### 5.2 并行执行

```typescript
async function fetchUserData(userId: string) {
  const [user, collections, tags] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.collection.findMany({ where: { userId } }),
    prisma.tag.findMany({ where: { userId } })
  ]);
  return { user, collections, tags };
}
```

---

## 6. 前端性能优化

### 6.1 Chrome DevTools MCP 验证流程

每次前端优化后，用 MCP 验证效果：

```
1. navigate_page("目标URL")
2. performance_start_trace()     // 录制优化后性能
3. performance_analyze_insight(insightName="LCPBreakdown")
4. 对比优化前后数据 → 确认指标达标
```

### 6.2 代码分割

```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
  ssr: false
});
```

### 6.3 图片优化

```tsx
import Image from 'next/image';
<Image src="/cover.jpg" alt="Cover" width={800} height={600} placeholder="blur" />
```

---

## 7. 性能分析完整工作流（MCP 增强版）

```
发现问题（用户反馈/监控告警）
    ↓
┌───────────────────────────────────────────────────┐
│ Step 1: Chrome DevTools MCP — 定位前端瓶颈        │
│   performance_start_trace → 分析 LCP/CLS/INP     │
│   list_network_requests → 分析 API 响应           │
│   list_console_messages → 排查 JS 报错            │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│ Step 2: PostgreSQL MCP — 定位数据库瓶颈           │
│   EXPLAIN (ANALYZE, BUFFERS) → 慢查询分析         │
│   SELECT ... FROM pg_stat_user_tables → 表统计    │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│ Step 3: Context7 — 获取最新优化 API               │
│   查 Prisma/Next.js 最新文档 → 避免使用过时 API   │
└──────────────────────┬────────────────────────────┘
                       ↓
               实施优化 → 再次验证
```

---

## 8. 性能检查清单

### 8.1 后端检查

| 检查项 | 工具 | 说明 |
|--------|------|------|
| ✅ 数据库查询有合适索引 | PostgreSQL MCP: EXPLAIN | 确认 Index Scan，无 Seq Scan |
| ✅ 使用参数化查询 | 代码审查 | 禁止字符串拼接 |
| ✅ 避免 N+1 查询 | 代码审查 | 使用 include/eager loading |
| ✅ 使用缓存减少数据库访问 | Redis 监控 | cache hit rate > 80% |
| ✅ 接口有限流保护 | express-rate-limit | 已配置 |

### 8.2 前端检查

| 检查项 | 工具 | 说明 |
|--------|------|------|
| ✅ LCP < 2.5s | Chrome DevTools: performance_start_trace | 验证 Largest Contentful Paint |
| ✅ CLS < 0.1 | Chrome DevTools: performance_analyze_insight | 验证布局稳定性 |
| ✅ 图片优化（压缩、WebP、懒加载） | Chrome DevTools: list_network_requests | 检查图片请求大小 |
| ✅ 第三方脚本异步加载 | Chrome DevTools: performance_start_trace | 检查 TBT (Total Blocking Time) |
| ✅ 启用 gzip/brotli 压缩 | Chrome DevTools: list_network_requests | 检查 Content-Encoding 响应头 |

---

*最后更新：2026-05-25*
*版本：v2.0 — 新增 Chrome DevTools / PostgreSQL / Context7 MCP 性能工具章节，替代手动命令行*
