# LinkChest 优化计划 v2.0

> 基于完整代码审查报告制定，覆盖性能、架构、代码质量、安全、测试五大维度
> 制定时间：2026-05-05

---

## 一、计划总览

### 优化原则
1. **风险优先**：先解决影响系统稳定性和安全的 P0 问题
2. **数据驱动**：所有优化点都有明确的度量指标
3. **渐进交付**：分阶段实施，每阶段可独立上线
4. **最小侵入**：优先非破坏性优化，避免大规模重构

### 阶段划分
| 阶段 | 周期 | 主题 | 核心目标 |
|------|------|------|---------|
| 阶段一 | 第1-2周 | 基础加固 | 安全漏洞修复 + 数据库优化 + 类型安全 |
| 阶段二 | 第3-4周 | 质量提升 | 测试体系建立 + 代码重构 + 文档补齐 |
| 阶段三 | 第2-3月 | 性能优化 | 缓存增强 + 分页优化 + 前端性能 |
| 阶段四 | 第3-4月 | 架构演进 | 分布式锁 + 事件驱动 + 可观测性 |
| 阶段五 | 第4-6月 | 能力增强 | AI功能 + 全文搜索 + 团队协作 |

---

## 二、阶段一：基础加固（第1-2周）

### 2.1 数据库性能优化

#### 任务 DB-01：添加高频查询复合索引
- **优先级**：P0
- **问题**：Collection 表按用户+时间排序、回收站查询缺少有效索引
- **措施**：
  ```sql
  -- 收藏列表查询（userId + 平台筛选 + 时间排序）
  CREATE INDEX CONCURRENTLY idx_collection_user_platform_created 
    ON collections(userId, platform, createdAt DESC) 
    WHERE deletedAt IS NULL;
  
  -- 回收站查询（userId + 删除时间排序）
  CREATE INDEX CONCURRENTLY idx_collection_user_deleted 
    ON collections(userId, deletedAt DESC) 
    WHERE deletedAt IS NOT NULL;
  
  -- 收藏搜索（标题全文检索）
  CREATE INDEX CONCURRENTLY idx_collection_title_trgm 
    ON collections USING gin(title gin_trgm_ops) 
    WHERE deletedAt IS NULL;
  
  -- 分享项查询优化
  CREATE INDEX CONCURRENTLY idx_shareitem_share_created 
    ON share_items(shareId, createdAt);
  
  -- 用户状态查询
  CREATE INDEX CONCURRENTLY idx_user_status_tier 
    ON users(status, userTier) 
    WHERE status = 'active';
  ```
- **验收标准**：
  - EXPLAIN ANALYZE 显示查询成本降低 50%+
  - 生产环境慢查询日志中相关查询消失
- **工时**：2天
- **负责人**：后端开发

#### 任务 DB-02：ShareItem 差异化清理策略
- **优先级**：P1
- **问题**：固定180天清理可能过早，活跃分享的快照应保留更久
- **措施**：
  - 修改 `cleanupOrphanedShareItems`，关联活跃分享(isActive=true)的快照保留365天
  - 已停用分享的快照保留90天
  - 添加 `share.isActive` 条件到清理查询
- **验收标准**：
  - 清理任务 SQL 正确过滤分享状态
  - 保留策略单元测试通过
- **工时**：1天

### 2.2 类型安全修复

#### 任务 TS-01：消除 API 层 any/unknown 类型
- **优先级**：P0
- **问题**：多处使用 `as unknown as Record<string, unknown>` 绕过类型检查
- **措施**：
  - 为 Express Request 添加类型扩展声明：
    ```typescript
    // types/express.d.ts
    declare global {
      namespace Express {
        interface Request {
          userId?: string;
          user?: SafeUser;
          reqId: string;
        }
      }
    }
    ```
  - 修改 `admin.ts` 中 `req as unknown as Record<string, unknown>` 为标准类型
  - 修改 `auth.ts` 中验证器错误处理类型
- **验收标准**：
  - `npx tsc --noEmit` 无类型错误
  - ESLint `no-explicit-any` 规则开启后零违规
- **工时**：2天
- **负责人**：后端开发

#### 任务 TS-02：前端 API 响应类型化
- **优先级**：P1
- **问题**：前端大量使用 `res.data as any`，API 契约不明确
- **措施**：
  - 为所有 API 函数添加返回类型：
    ```typescript
    // lib/api-types.ts
    export interface ApiResponse<T> {
      data: T;
      error?: string;
    }
    
    export interface CollectionListResponse {
      data: Collection[];
      pagination: PaginationInfo;
    }
    ```
  - 逐步替换 `api.get('/collections')` 为带类型的调用
- **验收标准**：
  - 核心 API 调用点均有类型定义
  - 编译时类型检查覆盖 80%+ API 调用
- **工时**：3天
- **负责人**：前端开发

### 2.3 安全加固

#### 任务 SEC-01：移除 passwordPlain 字段
- **优先级**：P0
- **问题**：Share 表存储密码明文，存在数据泄露风险
- **措施**：
  - 数据库迁移删除 `share.passwordPlain` 列
  - 前端分享列表中密码显示改为"已设置"布尔值
  - API 返回数据过滤该字段
- **验收标准**：
  - Schema 中无 passwordPlain 字段
  - 所有查询 SELECT 中不包含该字段
  - 回归测试通过
- **工时**：1天
- **风险**：需确认前端是否依赖该字段显示

#### 任务 SEC-02：API 接口级限流细化
- **优先级**：P1
- **问题**：全局500次/15分钟限流对批量导入等接口过松
- **措施**：
  ```typescript
  // 导入接口更严格
  const importLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 10, // 每小时10次
    keyGenerator: (req) => req.user?.id || req.ip,
  });
  
  // 分享创建限流
  const shareCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
  });
  ```
- **验收标准**：
  - 各接口限流策略文档化
  - 超出限流返回 429 + Retry-After 头
- **工时**：1天

#### 任务 SEC-03：验证码强制 Redis
- **优先级**：P1
- **问题**：内存降级验证码在多实例部署时不一致
- **措施**：
  - 生产环境检测 Redis 不可用时报错，不降级到内存
  - 启动时检查 Redis 连通性，无 Redis 拒绝启动
  - 保留开发环境降级能力（通过环境变量控制）
- **验收标准**：
  - `REDIS_REQUIRED=true` 时 Redis 不可用服务拒绝启动
  - 健康检查包含 Redis 状态
- **工时**：0.5天

### 2.4 配置集中化

#### 任务 CFG-01：建立业务常量中心
- **优先级**：P1
- **问题**：`999999`、`30`、`180` 等魔法数字分散在各文件
- **措施**：
  ```typescript
  // lib/constants.ts
  export const CONSTANTS = {
    // 配额
    QUOTA_FUNCTIONAL_UNLIMITED: 999_999,
    
    // 时间周期
    TRASH_RETENTION_DAYS: 30,
    SHARE_ITEM_RETENTION_DAYS: 180,
    SHARE_ITEM_ACTIVE_RETENTION_DAYS: 365,
    ERROR_EVENT_RETENTION_DAYS: 30,
    USER_CACHE_TTL_SECONDS: 300,
    SHARE_CACHE_TTL_SECONDS: 7 * 24 * 3600,
    
    // 限流
    VERIFY_CODE_TTL_SECONDS: 600,
    IP_RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000,
    IP_RATE_LIMIT_MAX: 10,
    
    // 分页
    DEFAULT_PAGE_SIZE: 40,
    MAX_PAGE_SIZE: 100,
    
    // 元数据抓取
    METADATA_MAX_CONCURRENT: 3,
    METADATA_FETCH_TIMEOUT_MS: 8000,
    
    // 其他
    MAX_LIST_DEPTH: 2,
    REFERRAL_CODE_LENGTH: 6,
    REFERRAL_CODE_MAX_ATTEMPTS: 10,
  } as const;
  ```
- **验收标准**：
  - 全项目无硬编码业务常量（代码扫描确认）
  - 常量文件覆盖率 100%
- **工时**：2天

---

## 三、阶段二：质量提升（第3-4周）

### 3.1 测试体系建立

#### 任务 TEST-01：Jest + supertest 单元测试框架
- **优先级**：P0
- **措施**：
  ```bash
  npm install --save-dev jest supertest @types/jest @types/supertest ts-jest
  ```
  - 配置 `jest.config.js` 支持 TypeScript
  - 设置测试数据库（使用 SQLite 内存模式或独立 PostgreSQL schema）
  - 编写核心服务测试：
    - `services/quota.test.ts` - 配额计算逻辑
    - `services/metadata.test.ts` - URL 元数据解析
    - `middleware/auth.test.ts` - JWT 认证流程
- **验收标准**：
  - 核心服务测试覆盖率 > 80%
  - CI 流水线自动运行测试
  - 测试执行时间 < 30秒
- **工时**：5天
- **负责人**：后端开发

#### 任务 TEST-02：关键 API 路由集成测试
- **优先级**：P1
- **测试范围**：
  | 路由 | 测试场景 |
  |------|---------|
  | POST /api/auth/register | 注册成功、邮箱重复、参数校验 |
  | POST /api/auth/login | 登录成功、密码错误、账号锁定 |
  | GET /api/collections | 分页、过滤、搜索 |
  | POST /api/collections | 创建成功、配额超限、URL无效 |
  | POST /api/shares | 创建分享、密码保护、过期设置 |
  | GET /s/:shareId | 缓存命中、密码验证、UV统计 |
- **验收标准**：
  - 每条路由至少覆盖正常流程 + 2个异常场景
  - 测试数据库自动回滚
- **工时**：4天

#### 任务 TEST-03：前端组件测试（Web）
- **优先级**：P1
- **措施**：
  ```bash
  npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
  ```
  - 为以下组件编写测试：
    - `CollectionList` - 列表渲染、筛选交互、批量选择
    - `Sidebar` - 导航、折叠、主题切换
    - `Toast` - 显示/隐藏/自动关闭
  - 使用 MSW (Mock Service Worker) 模拟 API
- **验收标准**：
  - 核心组件测试覆盖率 > 60%
  - 交互测试覆盖用户主要操作流程
- **工时**：4天
- **负责人**：前端开发

### 3.2 代码重构

#### 任务 REF-01：collections.ts 路由拆分
- **优先级**：P1
- **问题**：单文件过大（>1000行），职责过多
- **拆分方案**：
  ```
  routes/collections/
    ├── index.ts          # 路由聚合
    ├── reader.ts         # GET /collections, /collections/:id
    ├── writer.ts         # POST/PUT/DELETE /collections
    ├── batch.ts          # 批量操作
    ├── trash.ts          # 回收站相关
    ├── import.ts         # 导入功能
    ├── export.ts         # 导出功能
    └── helpers.ts        # 共享辅助函数
  ```
- **验收标准**：
  - 每个子文件 < 300 行
  - 原有接口行为完全一致（测试通过）
- **工时**：3天

#### 任务 REF-02：提取共享平台配置包
- **优先级**：P2
- **问题**：前后端各有一份平台配置，维护困难
- **措施**：
  ```
  packages/
    └── platforms/
        ├── src/
        │   ├── index.ts       # 主导出
        │   ├── types.ts       # PlatformConfig 类型
        │   ├── platforms.ts   # 91个平台数据
        │   ├── utils.ts       # generateDefaultCover, getPlatformColor 等
        │   └── constants.ts   # 平台相关常量
        └── package.json
  ```
  - Web/Mobile/Extension/API 均依赖 `@linkchest/platforms`
- **验收标准**：
  - 全项目平台配置单一来源
  - 新增平台只需修改一处
- **工时**：2天

#### 任务 REF-03：CollectionList 组件拆分
- **优先级**：P1
- **问题**：组件 500+ 行，逻辑过于集中
- **拆分方案**：
  ```
  components/collection-list/
    ├── index.tsx              # 主组件（容器）
    ├── useCollectionData.ts   # 数据获取逻辑
    ├── useBatchOperations.ts  # 批量操作逻辑
    ├── CollectionGrid.tsx     # Grid 视图
    ├── CollectionCard.tsx     # Card 视图
    ├── CollectionFilters.tsx  # 筛选面板
    ├── CollectionSearch.tsx   # 搜索栏
    ├── BatchActionBar.tsx     # 批量操作栏
    └── MoveTagModal.tsx       # 移动/标签弹窗
  ```
- **验收标准**：
  - 主组件 < 150 行
  - 各子组件独立可测
- **工时**：3天
- **负责人**：前端开发

### 3.3 文档补齐

#### 任务 DOC-01：API 文档（OpenAPI/Swagger）
- **优先级**：P1
- **措施**：
  ```bash
  npm install swagger-jsdoc swagger-ui-express
  ```
  - 为所有路由添加 JSDoc 注解：
    ```typescript
    /**
     * @openapi
     * /api/collections:
     *   get:
     *     summary: 获取收藏列表
     *     parameters:
     *       - in: query
     *         name: page
     *         schema: { type: integer, default: 1 }
     *     responses:
     *       200:
     *         description: 收藏列表
     *         content:
     *           application/json:
     *             schema: { $ref: '#/components/schemas/CollectionList' }
     */
    ```
  - 暴露 `/api/docs` 端点供查看
- **验收标准**：
  - 所有 API 端点均有文档
  - 文档可交互测试（Try it out）
- **工时**：4天

#### 任务 DOC-02：环境变量配置文档
- **优先级**：P1
- **内容**：
  | 变量 | 必填 | 说明 | 示例 |
  |------|------|------|------|
  | JWT_SECRET | 是 | JWT签名密钥 | - |
  | DATABASE_URL | 是 | PostgreSQL连接串 | postgresql://... |
  | REDIS_URL | 否 | Redis连接串 | redis://localhost:6379 |
  | COS_SECRET_ID | 否 | 腾讯云COS密钥ID | - |
  | ALERTING_ENABLED | 否 | 是否启用告警 | true |
- **验收标准**：
  - `.env.example` 完整且带注释
  - README 中包含配置说明
- **工时**：0.5天

---

## 四、阶段三：性能优化（第2-3月）

### 4.1 数据库查询优化

#### 任务 PERF-01：游标分页替代 Offset 分页
- **优先级**：P0
- **问题**：Offset 分页在数据量大时性能急剧下降
- **措施**：
  ```typescript
  // 新分页接口
  interface CursorPagination {
    cursor?: string;      // 上一页最后一条ID
    limit: number;
    direction: 'next' | 'prev';
  }
  
  // 查询实现
  const collections = await prisma.collection.findMany({
    where: { userId, deletedAt: null },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
  ```
- **兼容性**：保留旧接口，新接口为 `/collections/v2`
- **验收标准**：
  - 10万条数据下第100页查询 < 100ms
  - 前端适配游标分页
- **工时**：3天

#### 任务 PERF-02：分享页 CDN 缓存
- **优先级**：P1
- **措施**：
  - 公开分享页面（`/s/:shareId`）响应添加缓存头：
    ```
    Cache-Control: public, max-age=3600, s-maxage=86400
    ```
  - Nginx/CDN 层缓存静态分享数据
  - 分享更新时通过 API 触发 CDN 刷新
- **验收标准**：
  - 分享页 TTFB < 50ms（缓存命中时）
  - 缓存命中率 > 90%
- **工时**：2天

### 4.2 缓存增强

#### 任务 PERF-03：用户配额缓存优化
- **优先级**：P1
- **问题**：每次操作都查询数据库计算配额
- **措施**：
  - 配额计算结果缓存 60 秒（当前无缓存）
  - 写操作时异步更新缓存（Cache-Aside 模式）
  - 订阅变更时主动失效缓存
  ```typescript
  // 缓存 key: lc:quota:{userId}
  // TTL: 60s
  ```
- **验收标准**：
  - 配额查询 90% 走缓存
  - 缓存不一致窗口 < 60s
- **工时**：2天

#### 任务 PERF-04：元数据队列持久化
- **优先级**：P1
- **问题**：进程重启后 pending 任务丢失
- **措施**：
  - 将内存队列改为 Redis List：
    ```typescript
    // 入队
    await redis.lpush('lc:metadata:queue', JSON.stringify(item));
    
    // 消费
    const task = await redis.brpop('lc:metadata:queue', 30);
    ```
  - 增加任务状态追踪（pending/processing/failed）
  - 失败任务进入死信队列，支持重试
- **验收标准**：
  - 进程重启后任务不丢失
  - 失败任务可重试3次
- **工时**：3天

### 4.3 前端性能

#### 任务 PERF-05：Next.js 代码分割
- **优先级**：P1
- **措施**：
  ```typescript
  // 动态导入大组件
  const CollectionDetailModal = dynamic(
    () => import('@/components/CollectionDetailModal'),
    { loading: () => <Skeleton /> }
  );
  
  const AdminDashboard = dynamic(
    () => import('@/app/admin/dashboard/page'),
    { ssr: false }
  );
  ```
  - Admin 相关页面完全动态导入
  - 弹窗组件按需加载
- **验收标准**：
  - 首屏 JS 体积减少 30%
  - Lighthouse Performance 分数 > 80
- **工时**：2天
- **负责人**：前端开发

#### 任务 PERF-06：图片优化策略
- **优先级**：P1
- **措施**：
  - Web 端强制使用 Next.js Image 组件（自动 WebP + 懒加载）
  - Mobile 端统一使用 `expo-image`（支持缓存和格式转换）
  - COS 上传时生成多尺寸缩略图（原图/400px/200px）
  - 列表使用 200px 缩略图，详情页使用 400px
- **验收标准**：
  - 图片加载时间减少 50%
  - 带宽消耗减少 60%
- **工时**：3天

---

## 五、阶段四：架构演进（第3-4月）

### 5.1 分布式定时任务锁

#### 任务 ARCH-01：Redis Redlock 实现
- **优先级**：P0
- **问题**：多实例部署时 cron 任务重复执行
- **措施**：
  ```typescript
  // lib/redlock.ts
  import Redlock from 'redlock';
  
  const redlock = new Redlock([redis], {
    driftFactor: 0.01,
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 200,
  });
  
  // 任务包装
  export async function withDistributedLock(
    lockKey: string,
    ttlMs: number,
    task: () => Promise<void>
  ) {
    const lock = await redlock.acquire([`locks:${lockKey}`], ttlMs);
    try {
      await task();
    } finally {
      await lock.release();
    }
  }
  
  // 使用
  cron.schedule('0 3 * * *', async () => {
    await withDistributedLock('cleanup-covers', 300000, async () => {
      await cleanupOrphanedCovers();
    });
  });
  ```
- **验收标准**：
  - 3实例部署下任务仅执行1次
  - 锁超时后自动释放
- **工时**：2天

### 5.2 事件驱动架构

#### 任务 ARCH-02：引入事件总线
- **优先级**：P1
- **场景**：支付成功后的后续操作、订阅到期通知、分享创建通知
- **措施**：
  ```typescript
  // lib/eventBus.ts
  type EventMap = {
    'payment:success': { userId: string; tier: string; transactionId: string };
    'subscription:expired': { userId: string; oldTier: string };
    'share:created': { shareId: string; userId: string };
    'collection:imported': { userId: string; count: number };
  };
  
  export class EventBus {
    async emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
      await redis.publish(`events:${event}`, JSON.stringify(payload));
      // 同时持久化到数据库（审计+重放）
      await prisma.eventLog.create({ data: { type: event, payload } });
    }
    
    on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void) {
      redis.subscribe(`events:${event}`);
      redis.on('message', (channel, message) => {
        if (channel === `events:${event}`) {
          handler(JSON.parse(message));
        }
      });
    }
  }
  ```
- **验收标准**：
  - 支付成功事件触发用户升级 + 邮件通知 + 缓存清理
  - 事件处理失败可重试
- **工时**：5天

### 5.3 可观测性增强

#### 任务 ARCH-03：OpenTelemetry 链路追踪
- **优先级**：P1
- **措施**：
  ```bash
  npm install @opentelemetry/api @opentelemetry/node @opentelemetry/auto-instrumentations-node
  ```
  - 追踪 HTTP 请求全链路（API -> Prisma -> Redis -> COS）
  - 关键业务操作追踪（支付流程、分享创建流程）
  - 与 Jaeger/Tempo 集成展示
- **验收标准**：
  - 99% 请求有完整链路追踪
  - 慢请求可定位到具体 SQL/Redis 操作
- **工时**：4天

#### 任务 ARCH-04：业务指标监控
- **优先级**：P2
- **指标**：
  | 指标 | 类型 | 说明 |
  |------|------|------|
  | collections_created_total | Counter | 收藏创建总数 |
  | collections_created_rate | Gauge | 每分钟收藏创建速率 |
  | share_view_total | Counter | 分享浏览总数 |
  | share_conversion_rate | Gauge | 分享→注册转化率 |
  | payment_success_total | Counter | 支付成功数 |
  | payment_amount_total | Counter | 支付金额累计 |
  | user_active_daily | Gauge | DAU |
  | user_tier_distribution | Gauge | 各套餐用户数 |
- **措施**：
  - 使用 prom-client 暴露 /metrics 端点
  - Grafana 仪表盘展示
- **验收标准**：
  - 核心业务流程均有指标覆盖
  - 告警规则覆盖关键指标
- **工时**：3天

---

## 六、阶段五：能力增强（第4-6月）

### 6.1 AI 功能集成

#### 任务 AI-01：智能标签推荐
- **优先级**：P2
- **场景**：用户添加收藏时自动推荐标签
- **措施**：
  - 基于 URL/标题/内容使用 OpenAI/Claude API 分类
  - 与现有标签库匹配，推荐最相似的3个标签
  - 支持多语言（根据用户语言偏好）
  ```typescript
  async function suggestTags(url: string, title: string, lang: string): Promise<string[]> {
    const prompt = `根据以下链接和标题，推荐3个最相关的标签（使用${lang}）：\nURL: ${url}\n标题: ${title}`;
    // OpenAI API 调用
    const response = await openai.chat.completions.create({...});
    return parseTags(response.choices[0].message.content);
  }
  ```
- **验收标准**：
  - 推荐准确率 > 70%
  - 响应时间 < 2s
- **工时**：5天

#### 任务 AI-02：收藏内容摘要
- **优先级**：P3
- **场景**：为收藏内容生成一句话摘要
- **措施**：
  - 元数据抓取时同时生成摘要
  - 存储到 Collection 新字段 `summary`
  - 列表页展示摘要替代长标题
- **工时**：3天

### 6.2 全文搜索

#### 任务 SEARCH-01：MeiliSearch 集成
- **优先级**：P2
- **措施**：
  ```bash
  # Docker 部署 MeiliSearch
  docker run -p 7700:7700 getmeili/meilisearch
  ```
  - 同步 Collection 数据到 MeiliSearch
  - 支持标题、URL、备注、标签的全文搜索
  - 模糊搜索、拼写纠错、高亮
- **验收标准**：
  - 搜索响应 < 100ms
  - 支持中文分词
- **工时**：5天

### 6.3 团队协作

#### 任务 TEAM-01：共享收藏夹
- **优先级**：P3
- **功能**：
  - 创建团队空间
  - 邀请成员（邮箱/链接）
  - 角色管理（Owner/Admin/Editor/Viewer）
  - 团队内收藏共享
- **工时**：15天（独立项目）

---

## 七、执行跟踪表

### 7.1 任务依赖关系
```
DB-01 (索引优化)
  └─ 无依赖，可立即开始

TS-01 (类型修复)
  └─ 无依赖

SEC-01 (移除明文密码)
  └─ 需前端配合确认

TEST-01 (测试框架)
  └─ CFG-01 (常量提取) 完成后最佳

PERF-01 (游标分页)
  └─ DB-01 完成后

ARCH-01 (分布式锁)
  └─ TEST-01 完成后（需测试覆盖）

ARCH-02 (事件总线)
  └─ ARCH-01 完成后
```

### 7.2 每周任务分配示例

**第1周**
| 天数 | 任务 | 负责人 | 产出 |
|------|------|--------|------|
| Day 1-2 | DB-01 添加数据库索引 | 后端 | 迁移脚本 + 性能测试报告 |
| Day 2-3 | TS-01 修复API类型 | 后端 | 类型声明文件 + 零any |
| Day 3-4 | CFG-01 配置集中化 | 后端 | constants.ts + 全项目替换 |
| Day 4-5 | SEC-01 移除明文密码 | 后端+前端 | 迁移脚本 + 前端适配 |
| Day 5 | 代码审查 + 测试 | 全员 | PR Review |

**第2周**
| 天数 | 任务 | 负责人 | 产出 |
|------|------|--------|------|
| Day 1-2 | SEC-02/03 限流+验证码 | 后端 | 限流中间件 + 启动检查 |
| Day 2-4 | TEST-01 测试框架搭建 | 后端 | jest配置 + 核心服务测试 |
| Day 3-5 | REF-03 前端组件拆分 | 前端 | 拆分后的组件 + 测试 |
| Day 4-5 | DOC-01 API文档 | 后端 | Swagger文档 + 交互界面 |
| Day 5 | 阶段一回顾 | 全员 | 阶段总结文档 |

---

## 八、度量指标

### 8.1 技术指标
| 指标 | 当前基线 | 阶段一目标 | 阶段三目标 | 测量方式 |
|------|---------|-----------|-----------|---------|
| API P99 响应时间 | - | < 500ms | < 200ms | Redis 指标 |
| 数据库慢查询数 | - | 减少 50% | 减少 90% | PostgreSQL 慢查询日志 |
| 测试覆盖率 | ~0% | 30% | 70% | Jest coverage report |
| TypeScript 严格模式错误 | >50 | 0 | 0 | tsc --noEmit |
| 首屏加载时间 | - | - | < 2s | Lighthouse |
| 图片加载时间 | - | - | < 500ms | Web Vitals |

### 8.2 业务指标
| 指标 | 测量方式 |
|------|---------|
| 收藏创建成功率 | 成功率日志 |
| 分享页加载速度 | RUM (Real User Monitoring) |
| 支付成功率 | 支付回调统计 |
| 用户留存率 | 活跃用户/注册用户数 |
| API 错误率 | 5xx 响应占比 |

---

## 九、风险与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 数据库索引导致写性能下降 | 中 | 中 | 使用 CONCURRENTLY 创建，监控写延迟 |
| 类型修复引入编译错误 | 高 | 低 | 渐进式修复，每次PR限制范围 |
| 移除 passwordPlain 影响用户体验 | 中 | 中 | 提前确认前端使用场景，提供替代方案 |
| 测试编写进度滞后 | 高 | 中 | 优先覆盖核心路径，边缘场景后续补充 |
| 性能优化效果不达预期 | 中 | 低 | 优化前有基准测试，量化对比 |
| 多实例部署问题无法复现 | 中 | 中 | 使用 Docker Compose 模拟多实例环境 |

---

## 十、附录

### A. 环境准备
```bash
# 测试数据库
docker run -d --name linkchest-test-db \
  -e POSTGRES_DB=linkchest_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 postgres:15

# 测试 Redis
docker run -d --name linkchest-test-redis \
  -p 6380:6379 redis:7-alpine

# MeiliSearch（阶段五）
docker run -d --name linkchest-search \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=masterKey \
  getmeili/meilisearch:v1.7
```

### B. 代码检查命令
```bash
# 类型检查
npx tsc --noEmit

# 测试
npm test -- --coverage

# 代码风格
npx eslint . --ext .ts,.tsx
npx prettier --check "**/*.{ts,tsx,json,md}"

# 安全检查
npm audit
```

### C. 性能测试脚本
```bash
# API 压力测试（k6）
k6 run --vus 100 --duration 5m api-load-test.js

# 数据库查询分析
psql -c "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM collections WHERE userId = 'xxx' AND deletedAt IS NULL ORDER BY createdAt DESC LIMIT 40;"
```
