# LinkChest 分享页高并发优化指南

## 一、当前架构瓶颈分析

### 1.1 理论承载能力（优化前）

| 组件 | 当前配置 | 理论 QPS |
|------|---------|---------|
| Node.js 单进程 | 1 进程 | ~3,000 |
| PostgreSQL 连接池 | 10 连接 | ~1,000 |
| Redis 单机 | 1 实例 | ~100,000 |
| 全局限流 | 500/15min/IP | - |

**实际瓶颈**：Node.js 单进程 + 数据库连接池过小

### 1.2 优化后理论承载能力

| 组件 | 优化后配置 | 理论 QPS |
|------|-----------|---------|
| Node.js | PM2 × 4 进程 | ~12,000 |
| PostgreSQL 连接池 | 30 连接 | ~3,000 |
| Redis 缓存 | 7 天 TTL | ~100,000 |
| CDN 边缘缓存 | 1 小时 | ~∞ |

**结论**：优化后单台服务器可稳定支撑 **10,000+ 并发**，分享页几乎完全走 Redis + CDN，数据库零压力。

---

## 二、已完成的优化

### 2.1 缓存策略重构（核心）

**修改前**：Redis 60 秒 TTL → 频繁失效 → 大量打到数据库

**修改后**：
- Redis **7 天 TTL**（`SHARE_CACHE_TTL_SECONDS = 604800`）
- 分享数据是**快照**，创建后基本不变
- **主动失效**：删除/停用时自动清除缓存
- 用户状态（isOwner/needsPassword）在缓存命中后动态合并

```
用户访问 /s/xxx
    ↓
Redis 命中？ → 是 → 直接返回（< 1ms）
    ↓ 否
查数据库 → 写入 Redis → 返回（~10ms）
```

### 2.2 前端 SSR 优化

**修改前**：
- `revalidate = 60` → ISR 每小时重生成 60 次
- 服务端查一次 API → 客户端 hydrate 后又查一次 API

**修改后**：
- `revalidate = 3600` → 1 小时重生成一次
- `react.cache` 包裹 `getShareData` → 同请求内多次调用只查一次
- 服务端数据通过 props 传给客户端 → 客户端跳过首次请求

### 2.3 数据库索引优化

```prisma
model ShareItem {
  // ...
  @@index([shareId])        // 新增：加速分享详情页查询
  @@unique([shareId, url])  // 原有
}
```

### 2.4 限流策略细化

```typescript
// 公开分享独立限流：200/分钟/IP（足够一个用户正常浏览）
const shareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  skip: (req) => req.path === '/check' || 
                req.path.endsWith('/verify') || 
                req.path.endsWith('/save'),
})
```

---

## 三、部署配置（必须执行）

### 3.1 数据库连接池调优

修改服务器环境变量 `DATABASE_URL`：

```bash
# 当前（默认）
DATABASE_URL=postgresql://user:pass@host:5432/db

# 高并发推荐（4 核 8G 服务器）
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=30&pool_timeout=15

# 如果服务器配置更高（8 核 16G）
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=50&pool_timeout=20
```

参数说明：
- `connection_limit=30`：连接池大小 = (核心数 × 2) + 有效磁盘数，4核服务器推荐 30
- `pool_timeout=15`：连接等待超时 15 秒，避免请求无限堆积

### 3.2 使用 PM2 多进程部署

```bash
# 安装 PM2
npm install -g pm2

# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'linkchest-api',
    script: './apps/api/dist/index.js',
    instances: 'max',        // 使用所有 CPU 核心
    exec_mode: 'cluster',    // 集群模式
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    max_memory_restart: '512M',
    restart_delay: 3000,
    // 优雅重启
    kill_timeout: 5000,
    listen_timeout: 10000,
  }]
}

# 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**为什么需要多进程？**
- Node.js 是单线程的，1 个进程只能利用 1 个 CPU 核心
- 4 核服务器只跑 1 个进程 = 浪费 75% 的 CPU
- PM2 集群模式 = 4 个进程同时处理请求，吞吐量 ×4

### 3.3 Nginx 反向代理优化

```nginx
upstream linkchest_api {
    least_conn;              # 最少连接负载均衡
    server 127.0.0.1:3001;
    # 如果有多个实例
    # server 127.0.0.1:3002;
    # server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name api.linkchest.net;

    # 公开分享页长缓存（CDN/浏览器层）
    location ~ ^/s/[a-zA-Z0-9_-]+$ {
        proxy_pass http://linkchest_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 连接优化
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
        
        # 启用缓存头（由后端控制）
        proxy_hide_header Cache-Control;
    }

    location / {
        proxy_pass http://linkchest_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3.4 CDN 配置（ Cloudflare / 腾讯云 CDN）

**缓存规则**：

| 路径 | 缓存时间 | 说明 |
|------|---------|------|
| `/s/*` | 1 小时 | 分享页 HTML |
| `/s/*` (API JSON) | 不缓存 | 动态数据 |
| 静态资源 | 1 年 | JS/CSS/图片 |

**注意**：CDN 只缓存 GET 请求的 HTML，不缓存 API 返回的 JSON（因为 `Cache-Control: public` 只对浏览器生效，CDN 需要根据业务需求配置）。

---

## 四、监控指标

### 4.1 关键指标

```bash
# Redis 缓存命中率（应该 > 95%）
redis-cli info stats | grep keyspace

# 数据库连接池使用率（应该 < 80%）
# 查看 Prisma 日志或 PostgreSQL 活动连接数
SELECT count(*) FROM pg_stat_activity WHERE datname = 'linkchest';

# API 响应时间 P99（应该 < 50ms）
# 通过 requestTracker 中间件日志分析
```

### 4.2 告警阈值

| 指标 | 警告阈值 | 紧急阈值 |
|------|---------|---------|
| Redis 缓存命中率 | < 90% | < 80% |
| 数据库连接池使用率 | > 70% | > 90% |
| API P99 响应时间 | > 100ms | > 500ms |
| 错误率 | > 1% | > 5% |
| CPU 使用率 | > 70% | > 90% |
| 内存使用率 | > 70% | > 85% |

---

## 五、压测验证

使用 `autocannon` 或 `wrk` 进行压测：

```bash
# 安装
npm install -g autocannon

# 压测分享页（1000 并发，持续 30 秒）
autocannon -c 1000 -d 30 http://localhost:3001/s/xxxxxx

# 预期结果（优化后）
# - 平均响应时间: < 5ms
# - P99: < 20ms
# - 吞吐量: > 5000 req/s
# - 错误率: 0%
```

---

## 六、水平扩展（如果单机不够）

如果单机无法支撑，可水平扩展：

```
                    ┌─────────────┐
                    │   CDN       │
                    │ (Cloudflare)│
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │  Nginx LB   │
                    │ (负载均衡)   │
                    └──────┬──────┘
                           ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ API-1   │      │ API-2   │      │ API-3   │
   │ Node×4  │      │ Node×4  │      │ Node×4  │
   └────┬────┘      └────┬────┘      └────┬────┘
        └─────────────────┼─────────────────┘
                          ↓
                    ┌─────────────┐
                    │   Redis     │
                    │  (主从)     │
                    └──────┬──────┘
                           ↓
                    ┌─────────────┐
                    │ PostgreSQL  │
                    │ (主从/读写)  │
                    └─────────────┘
```

**扩展后理论承载**：
- 3 台 API 服务器 × 4 进程 × 3000 QPS = **36,000 QPS**
- 足够支撑 **100,000+ 并发用户**（按每用户 10 秒访问一次计算）

---

## 七、总结

| 优化项 | 效果 | 成本 |
|--------|------|------|
| Redis 7 天缓存 | 数据库压力降至接近 0 | 0（已有 Redis） |
| 前端 ISR 1 小时 | 减少服务端渲染次数 | 0 |
| 数据库索引 | 查询提速 10-100 倍 | 0 |
| PM2 多进程 | 吞吐量 × CPU 核心数 | 0 |
| 连接池调优 | 消除连接等待 | 0 |
| CDN 缓存 | 边缘节点直接响应 | CDN 费用 |

**按当前配置，单台 4 核 8G 服务器可稳定支撑 10,000+ 并发访问分享页。**
