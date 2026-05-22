---
alwaysApply: false
description: 性能优化策略 - 定义性能优化的方法、工具和最佳实践
---

# PERFORMANCE.md — 性能优化策略

> 本文档定义项目中的性能优化策略，包括前端、后端和数据库的优化方法。

---

## 1. 性能优化概览

### 1.1 性能指标

| 指标 | 说明 | 目标值 |
|------|------|--------|
| **API 响应时间** | 接口平均响应时间 | < 500ms |
| **首屏加载时间** | 页面首次渲染时间 | < 2s |
| **LCP** | Largest Contentful Paint | < 2.5s |
| **FID** | First Input Delay | < 100ms |
| **数据库查询** | 单查询执行时间 | < 100ms |

### 1.2 优化层次

```
┌─────────────────────────────────────────────────────┐
│                   性能优化层次                       │
├─────────────────────────────────────────────────────┤
│                                                    │
│  L1. 数据库层                                       │
│    └── 索引优化、查询优化、缓存                      │
│                                                    │
│  L2. 后端层                                         │
│    └── 逻辑优化、并发处理、缓存策略                   │
│                                                    │
│  L3. 前端层                                         │
│    └── 代码分割、懒加载、资源优化                     │
│                                                    │
│  L4. 网络层                                         │
│    └── CDN、压缩、HTTP/2                           │
│                                                    │
└─────────────────────────────────────────────────────┘
```

---

## 2. 数据库性能优化

### 2.1 索引优化

```typescript
// ✅ 推荐：为频繁查询的字段添加索引
// schema.prisma
model Collection {
  id        String   @id @default(cuid())
  userId    String
  url       String
  platform  String
  createdAt DateTime @default(now())
  
  // 复合索引：用户查询 + 平台筛选
  @@index([userId, platform])
  // 全文索引：标题搜索
  @@index([title], type: FullText)
}
```

### 2.2 查询优化

```typescript
// ❌ 不好：N+1 查询
const collections = await prisma.collection.findMany({
  where: { userId }
});
for (const collection of collections) {
  const tags = await prisma.tag.findMany({
    where: { collectionId: collection.id }
  });
}

// ✅ 好：使用 include 预加载
const collections = await prisma.collection.findMany({
  where: { userId },
  include: { tags: true } // 单次查询
});
```

### 2.3 分页优化

```typescript
// ✅ 使用游标分页
const collections = await prisma.collection.findMany({
  where: { userId },
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' }
});
```

---

## 3. 后端性能优化

### 3.1 缓存策略

```typescript
// Redis 缓存示例
const cacheKey = `user:${userId}:collections`;

// 先查缓存
let collections = await redis.get(cacheKey);
if (!collections) {
  // 缓存未命中，查数据库
  collections = await prisma.collection.findMany({ where: { userId } });
  // 写入缓存，有效期 5 分钟
  await redis.set(cacheKey, JSON.stringify(collections), 'EX', 300);
}
```

### 3.2 异步处理

```typescript
// ✅ 使用 Promise.all 并行执行
async function fetchUserData(userId: string) {
  const [user, collections, tags] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.collection.findMany({ where: { userId } }),
    prisma.tag.findMany({ where: { userId } })
  ]);
  return { user, collections, tags };
}
```

### 3.3 限流与熔断

```typescript
// 使用 express-rate-limit
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制 100 次请求
  message: '请求过于频繁，请稍后再试'
});

app.use('/api/', apiLimiter);
```

---

## 4. 前端性能优化

### 4.1 代码分割

```typescript
// Next.js 动态导入
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Loading />,
  ssr: false
});
```

### 4.2 图片优化

```tsx
// Next.js Image 组件
import Image from 'next/image';

<Image
  src="/cover.jpg"
  alt="Cover"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### 4.3 状态管理优化

```typescript
// React Query 缓存
const { data: collections } = useQuery({
  queryKey: ['collections', userId],
  queryFn: fetchCollections,
  staleTime: 5 * 60 * 1000, // 5 分钟内视为新鲜
  cacheTime: 30 * 60 * 1000 // 30 分钟后从缓存删除
});
```

---

## 5. 性能监控

### 5.1 监控指标

| 指标 | 工具 | 告警阈值 |
|------|------|----------|
| API 响应时间 | Prometheus + Grafana | > 1s |
| 内存使用 | Node.js 监控 | > 80% |
| CPU 使用率 | Prometheus + Grafana | > 80% |
| 数据库慢查询 | PostgreSQL 日志 | > 500ms |

### 5.2 性能测试

```bash
# 使用 autocannon 进行压力测试
npx autocannon -c 100 -d 30 http://localhost:3001/api/collections

# 使用 Lighthouse 进行前端性能测试
npx lighthouse http://localhost:3003 --view
```

---

## 6. 性能优化检查清单

### 6.1 后端检查

| 检查项 | 说明 |
|--------|------|
| ✅ 数据库查询有合适的索引 |
| ✅ 使用参数化查询 |
| ✅ 避免 N+1 查询 |
| ✅ 使用缓存减少数据库访问 |
| ✅ 接口有限流保护 |

### 6.2 前端检查

| 检查项 | 说明 |
|--------|------|
| ✅ 使用代码分割 |
| ✅ 图片优化（压缩、懒加载） |
| ✅ 第三方脚本异步加载 |
| ✅ 使用 CDN 加速静态资源 |
| ✅ 启用 gzip/brotli 压缩 |

---

## 7. 性能优化工作流

```
┌─────────────────────────────────────────────────────┐
│                  性能优化工作流                      │
├─────────────────────────────────────────────────────┤
│                                                    │
│  1. 监控发现性能问题                                │
│       ↓                                            │
│  2. 使用 performance-optimizer Agent 分析          │
│       ↓                                            │
│  3. 定位性能瓶颈                                   │
│       ↓                                            │
│  4. 实施优化方案                                   │
│       ↓                                            │
│  5. 验证优化效果                                   │
│       ↓                                            │
│  6. 监控回归                                       │
│                                                    │
└─────────────────────────────────────────────────────┘
```

---

*最后更新：2026-05-11*
*版本：v1.0*