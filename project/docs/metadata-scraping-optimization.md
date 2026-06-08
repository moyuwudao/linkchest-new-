# 优化数据抓取能力 — 改善链接识别封面和标题的成功率

## Context

LinkChest 的核心体验是用户粘贴链接后自动获取标题和封面。当前抓取流水线（`metadata.ts` → `metadata-queue.ts` → Cloudflare Worker → Chrome 扩展）已覆盖 91 个平台，但存在以下痛点：
- 反爬平台（抖音/小红书/快手）服务端抓取成功率低，依赖 5 分钟延迟重试
- HTML 解析使用脆弱的正则，属性顺序变化即失败
- 未利用 JSON-LD 结构化数据、短链预解析等低成本高收益手段
- 抓取策略串行执行，总耗时等于各环节之和

本方案按 P0/P1/P2 分级，聚焦投入产出比最高的改进。

---

## Task 1 (P0): HTML 解析从正则切换到 Cheerio

**问题**: `fetchHtmlMetadata()` 用正则匹配 `<meta property="og:title" content="...">`，但 HTML 属性顺序不固定，部分网站写成 `<meta content="..." property="og:title">`，导致匹配失败。

**改动**:
- `apps/api/src/services/metadata.ts` — `fetchHtmlMetadata()` 函数
  - 将 8 个 og/twitter 正则匹配替换为 `cheerio.load(html)` 选择器
  - 补充 `name="twitter:title"` / `name="twitter:image"` 等常见变体
  - 补充 `<link rel="canonical">` 提取规范 URL

**影响**: 预计 HTML fallback 成功率提升 15-25%，cheerio 已是项目依赖无需新增。

---

## Task 2 (P0): 新增 JSON-LD / 结构化数据提取

**问题**: 很多网站（GitHub、StackOverflow、电商、新闻站）嵌入了 JSON-LD 或 microdata，当前完全未利用。

**改动**:
- `apps/api/src/services/metadata.ts` — 在 `fetchHtmlMetadata()` 中新增 JSON-LD 提取：
  - 提取 `<script type="application/ld+json">` 中的 `name`/`headline` → title
  - 提取 `image`/`thumbnailUrl` → coverImage
  - 提取 `description` → description
  - 在 OG/Twitter 标签之前执行（JSON-LD 更可靠）

**影响**: 对非社交平台（新闻、电商、博客、开发者工具等 B/C 级平台）成功率显著提升。

---

## Task 3 (P0): 短链接预解析 — 将 share-parser 的 resolveShortLink 能力前置到 metadata.ts

**问题**: `share-parser.ts` 已有完整的短链解析和 URL 规范化能力，但仅在"分享文本解析"路径中使用。直接粘贴短链 URL 时，`metadata.ts` 拿到的是未解析的短链。

**改动**:
- `apps/api/src/services/metadata.ts` — 在 `fetchUrlMetadataCore()` 开头：
  - 检测 URL 是否匹配 `SHORT_LINK_DOMAINS`（从 share-parser 导入或提取为共享常量）
  - 若是短链，先用 HEAD/follow redirect 解析真实 URL
  - 用规范化后的 URL 进行后续平台识别和元数据抓取
  - 同时移除 tracking 参数，提高缓存命中率

**影响**: xhslink.com、b23.tv、t.co、youtu.be 等短链的平台识别率和缓存命中率大幅提升。

---

## Task 4 (P1): 并行策略执行 + 快速返回

**问题**: 当前 OEmbed → OGS → HTML → Worker → Fallback 是串行的，每步 4-8 秒。

**改动**:
- `apps/api/src/services/metadata.ts` — `fetchUrlMetadataCore()`:
  - 对非反爬平台：同时启动 OEmbed（如有）和 OGS+HTML，用 `Promise.race` 取首个有效结果
  - 对反爬平台：同时启动 Worker 和本地 fallback，取首个有效结果
  - 保留"任一结果有效即返回"的逻辑，但缩短总等待时间

**影响**: 平均抓取耗时从 6-8s 降至 3-4s，用户体验显著改善。

---

## Task 5 (P1): 扩展 OEmbed/API 直调平台覆盖

**问题**: 仅 12 个平台有 OEmbed 配置，很多主流平台有公开 API 但未利用。

**改动**:
- `apps/api/src/services/metadata.ts` — `OEMBED_PROVIDERS` 新增：
  - 知乎 API（`/api/v4/articles/{id}`）
  - 掘金 API（`/content-api/article/info`）
  - CSDN API（`/blog-console-api/post/info`）
  - 豆瓣 API（`/v2/movie/`、`/v2/book/`）
  - GitHub API（`/repos/{owner}/{repo}`）
  - 微信公众号（通过分享页 OG 标签增强）

**影响**: API 直调比网页抓取更稳定、更快，S/A 级平台成功率接近 100%。

---

## Task 6 (P1): Cloudflare Worker 增强

**问题**: Worker 仅支持 8 个平台，且缓存 TTL 仅 5 分钟。

**改动**:
- `workers/metadata-fetcher/src/index.ts`:
  - 新增快手、B站、GitHub、Medium、Spotify 等平台处理
  - 缓存 TTL 从 5 分钟提升到 1 小时（成功结果）/ 5 分钟（失败结果）
  - 添加 JSON-LD 提取逻辑（与 Task 2 对齐）
  - 优化 UA 策略：不同平台使用不同 UA（移动端/桌面端/Googlebot）

**影响**: Worker 兜底成功率提升，重复请求减少。

---

## Task 7 (P1): Chrome 扩展提取结果回写缓存

**问题**: Chrome 扩展有最可靠的 DOM 提取能力，但结果仅存在本地，不回写到 API 缓存。

**改动**:
- `apps/chrome-extension/src/background/service-worker.ts`:
  - 提取成功后，调用 API 回写结果
- `apps/api/src/routes/collections.ts`:
  - 新增 `PUT /api/collections/:id/client-metadata` 接口
  - 接受客户端（扩展/移动端）提取的元数据，更新 Collection 并写入缓存

**影响**: 扩展用户的所有收藏都能获得高质量元数据，同时充实缓存。

---

## Task 8 (P2): 抓取成功率可观测性增强

**问题**: 当前 `metadataStats` 仅有总计/成功/失败，缺少按平台/策略维度的细粒度指标。

**改动**:
- `apps/api/src/services/metadata.ts`:
  - 按平台维度统计: `{ douyin: { total, ogs, html, worker, fallback, success, failed } }`
  - 记录每次抓取使用的策略路径和耗时
  - 暴露管理后台接口
- `apps/api/src/routes/admin.ts`:
  - 新增 `GET /api/admin/metadata-stats` 路由

**影响**: 能精确定位哪些平台成功率下降，指导后续优化。

---

## Task 9 (P2): 自适应超时与平台策略记忆

**问题**: 所有平台使用相同的 4s/8s 超时，反爬平台总是超时后才降级。

**改动**:
- `apps/api/src/services/metadata.ts`:
  - 新增平台成功率存储（Redis Hash: `lc:meta:platform-stats:{platform}`）
  - 根据历史成功率调整超时：高成功率平台 6s，低成功率平台 2s（快速降级到 Worker）
  - 反爬平台首次直接走 Worker + 异步重试，不浪费 8s 等待

**影响**: 反爬平台的平均响应时间从 8s 降至 2-3s。

---

## Task 10 (P2): URL 规范化增强

**问题**: 同一内容的不同 URL（协议、www、尾斜杠、参数）产生重复抓取。

**改动**:
- `apps/api/src/services/metadata.ts`:
  - 新增 `normalizeUrl()` 函数：统一 https、移除 www.、移除尾斜杠、移除 tracking 参数
  - 在缓存查找和存储前执行规范化
  - 复用 `share-parser.ts` 的 `TRACKING_PARAMS` 列表

**影响**: 缓存命中率提升 20-30%，减少不必要的重复抓取。

---

## 修改文件清单

| 文件 | Task | 改动说明 |
|------|------|----------|
| `apps/api/src/services/metadata.ts` | 1,2,3,4,8,9,10 | 核心改动文件 |
| `apps/api/src/services/share-parser.ts` | 3 | 导出 SHORT_LINK_DOMAINS 和 TRACKING_PARAMS |
| `workers/metadata-fetcher/src/index.ts` | 6 | Worker 增强 |
| `apps/chrome-extension/src/background/service-worker.ts` | 7 | 回写缓存 |
| `apps/api/src/routes/collections.ts` | 7 | 新增 client-metadata 接口 |
| `apps/api/src/routes/admin.ts` | 8 | 新增 stats 接口 |
| `apps/api/src/lib/constants.ts` | 9 | 超时配置参数 |

## 验证方式

1. **单元测试**: 对 `fetchHtmlMetadata()` 新增 Cheerio 解析和 JSON-LD 提取的测试用例
2. **集成测试**: 用已知 URL 列表（覆盖 S/A/B/C 级平台各 2-3 个）运行 `fetchUrlMetadata()`，对比优化前后的标题/封面成功率
3. **手动验证**: 
   - 粘贴 xhslink.com 短链 → 验证短链解析 + 平台识别
   - 粘贴 GitHub repo URL → 验证 JSON-LD 提取
   - 粘贴抖音视频链接 → 验证 Worker 降级 + 快速返回
   - 通过 Chrome 扩展保存 → 验证元数据回写
4. **监控**: 上线后观察 `/api/admin/metadata-stats` 的按平台成功率变化
