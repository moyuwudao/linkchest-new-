# 抖音抓取方案文档（连通方案 + 历史备份）

> 本文档汇总所有抖音（Douyin）元数据抓取方案，**保留历史方案**以便在某个方案异常时回退。
> 适用代码：`apps/api/src/services/metadata.ts`
>
> **最后更新**：2026-06-12

---

## 一、方案总览

LinkChest 当前实现 **4 个抖音抓取通道**，按优先级 + 并行执行：

```
                    用户添加抖音链接
                          │
                          ▼
              ┌───────────────────────┐
              │  tryFastChannels()    │ ← 并行快通道
              │  ┌─────────────────┐  │
              │  │ ★ 方案A: HTTP直拉│  │ ← 新增（2026-06）
              │  │   (fetchDouyin)  │  │
              │  │   Http)          │  │
              │  └─────────────────┘  │
              └───────────────────────┘
                          │ 失败
                          ▼
              ┌───────────────────────┐
              │  fetchWithPuppeteer() │ ← 浏览器渲染（备份）
              │  ┌─────────────────┐  │
              │  │ 方案B: video.    │  │
              │  │   poster          │  │
              │  │ 方案C: _SSR_      │  │
              │  │   HYDRATED_DATA   │  │
              │  │ 方案D: RENDER_DATA │  │
              │  │   脚本解析         │  │
              │  └─────────────────┘  │
              └───────────────────────┘
                          │ 失败
                          ▼
              ┌───────────────────────┐
              │ getPlatformFallback() │ ← 零成本兜底
              └───────────────────────┘
```

---

## 二、★ 方案 A：HTTP 直拉通道（新增 · 主推）

> **状态**：✅ 已实现（2026-06-12）
> **位置**：[metadata.ts:1385-1504](file:///d:/trae_projects/linkchest/project/apps/api/src/services/metadata.ts#L1385-L1504) `fetchDouyinHttp()`
> **触发位置**：[metadata.ts:426-429](file:///d:/trae_projects/linkchest/project/apps/api/src/services/metadata.ts#L426-L429) `tryFastChannels()`

### 2.1 核心思路

公网内容直接用 HTTP `fetch()` 抓取 HTML（**不启动 Puppeteer 浏览器**），从 HTML 中解析 `RENDER_DATA` script 标签内的 URL 编码 JSON。

**优势**：
- 速度极快：实测 **~270ms**（Puppeteer 通道需 13s+，**50x 提速**）
- 资源占用低：不启动浏览器，零内存/TCP 占用
- 可与 Puppeteer 通道**并行执行**，任一通道成功即返回
- 不受 Puppeteer 浏览器池容量限制

**局限**：
- 抖音桌面版风控较严，移动端 UA 成功率更高
- 部分视频有地域限制，可能被重定向到验证页
- 无法执行 JS（但抖音 RENDER_DATA 是 SSR 注入的纯 HTML 字符串，够用）

### 2.2 触发条件

```typescript
// metadata.ts tryFastChannels() 内部
if (platformKey === 'douyin') {
  tasks.push(fetchDouyinHttp(url, signal))
}
```

### 2.3 抓取实现

**请求头**（关键：移动端 UA + 抖音 Referer）：

| Header | Value |
|---|---|
| User-Agent | `Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1`（即 `MOBILE_USER_AGENT`）|
| Accept | `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8` |
| Accept-Language | `zh-CN,zh;q=0.9,en;q=0.8` |
| Referer | `https://www.douyin.com/` |
| redirect | `follow` |

**超时**：12s

### 2.4 数据解析策略（按优先级）

| 优先级 | 数据源 | 提取方式 | 字段 |
|---|---|---|---|
| 1 | `<title>` 标签 | 正则匹配 | `title`（去掉尾巴 " - 抖音"）|
| 2 | `<script>` 中的 `RENDER_DATA` | URL 解码 JSON | `desc` → `title`/`description`；`cover.urlList[0]`、`video.cover.urlList[0]`、`video.poster`、`originCover.urlList[0]`、`dynamicCover.urlList[0]` → `coverImage` |
| 3 | `og:image` meta 标签 | 正则匹配 | `coverImage` |
| 4 | `og:title` / `og:description` | 正则匹配 | `title` / `description` |

**RENDER_DATA 路径**：
```typescript
const data = JSON.parse(decoded)  // 解码后的 JSON
const detail = data?.app?.videoDetail     // 桌面版
            || data?.app?.awemeDetail    // 移动版
            || data?.awemeDetail         // 短链
            || data?.app?.itemList?.[0]  // 列表页
```

### 2.5 失败处理

| 场景 | 处理 |
|---|---|
| 响应非 200 | 静默返回 null，让其他通道接管 |
| HTML 含 `Security Verification` / `人机验证` | 静默返回 null |
| 提取到 title 或 coverImage 至少一项 | 返回结果，**标记通道成功** |
| 全部为空 | 返回 null |

### 2.6 测试结果

| URL 类型 | 状态 | 耗时 | 结果 |
|---|---|---|---|
| `https://www.iesdouyin.com/share/video/{id}/` | ✅ 通道触发 | **~270ms** | title 提取成功（依赖 HTML 是否含 RENDER_DATA）|
| `https://www.douyin.com/video/{id}` | ✅ 通道触发 | ~280ms | 同上 |
| 无效 video ID | ✅ 通道触发 | ~300ms | 兜底返回 null，让 Puppeteer 接管 |

---

## 三、方案 B：video.poster 直接提取（Puppeteer 内执行）

> **状态**：✅ 已实现（保留）
> **位置**：[metadata.ts:763-768](file:///d:/trae_projects/linkchest/project/apps/api/src/services/metadata.ts#L763-L768) `extractMetadataFromPage()` → `pk === 'douyin'` 分支

### 3.1 核心思路

抖音视频页面渲染后会有 `<video>` 标签，其 `poster` 属性即为视频首帧封面。直接读 DOM 即可。

### 3.2 实现

```typescript
if (pk === 'douyin') {
  // 1. video poster（最直接）
  if (!result.coverImage) {
    const video = document.querySelector('video')
    if (video?.poster && video.poster.startsWith('http')) {
      result.coverImage = video.poster
    }
  }
  // ...
}
```

### 3.3 触发条件

- 走 `fetchWithPuppeteer()` 通道
- 抖音平台（`platformKey === 'douyin'`）
- 浏览器已加载完 `<video>` 元素

### 3.4 优势 / 局限

- ✅ 最直接、最快（DOM 已渲染时几乎是 0 成本）
- ❌ 依赖浏览器成功渲染
- ❌ 部分视频没有 `poster` 属性（纯音频 / 直播）

---

## 四、方案 C：_SSR_HYDRATED_DATA 提取（Puppeteer 内执行）

> **状态**：✅ 已实现（保留）
> **位置**：[metadata.ts:770-784](file:///d:/trae_projects/linkchest/project/apps/api/src/services/metadata.ts#L770-L784)

### 4.1 核心思路

抖音 SPA 在 `window._SSR_HYDRATED_DATA` 注入完整的页面数据（含视频列表）。直接读 `window` 对象即可。

### 4.2 实现

```typescript
if (!result.title || !result.coverImage) {
  try {
    const ssrData = window._SSR_HYDRATED_DATA
    if (ssrData?.app) {
      const app = ssrData.app
      const videoList = app.videoList || app.itemList || []
      const item = videoList[0]
      if (!result.title && item?.title) result.title = item.title
      if (!result.title && item?.desc) result.title = item.desc
      if (!result.coverImage && item?.cover) result.coverImage = item.cover
      if (!result.coverImage && item?.originCover) result.coverImage = item.originCover
    }
  } catch { /* 忽略 */ }
}
```

### 4.3 数据结构

```
window._SSR_HYDRATED_DATA.app
├── videoList[] / itemList[]    ← 视频列表（取第一项）
│   └── {
│       title / desc,           ← 标题
│       cover / originCover,    ← 封面
│       ...
│     }
```

### 4.4 优势 / 局限

- ✅ 数据完整（比 OG 标签丰富）
- ❌ 依赖浏览器成功执行 JS
- ❌ `_SSR_HYDRATED_DATA` 是抖音较老版本的注入方式，新版可能改用 `RENDER_DATA`

---

## 五、方案 D：RENDER_DATA 脚本解析（Puppeteer 内执行）

> **状态**：✅ 已实现（保留）
> **位置**：[metadata.ts:786-813](file:///d:/trae_projects/linkchest/project/apps/api/src/services/metadata.ts#L786-L813)

### 5.1 核心思路

抖音新版 SSR 将 RENDER_DATA 注入到 `<script>` 标签中（URL 编码的 JSON 字符串）。从 script 标签解析。

### 5.2 实现

```typescript
if (!result.title || !result.coverImage) {
  try {
    const scripts = document.querySelectorAll('script')
    for (const s of scripts) {
      const text = s.textContent || ''
      const rdIdx = text.indexOf('RENDER_DATA')
      if (rdIdx === -1) continue
      const eqIdx = text.indexOf('=', rdIdx)
      if (eqIdx === -1) continue
      // RENDER_DATA 通常是 URL 编码的 JSON
      const valStart = text.indexOf('"', eqIdx) + 1
      const valEnd = text.indexOf('"', valStart)
      if (valStart === 0 || valEnd === -1) continue
      const encoded = text.substring(valStart, valEnd)
      const decoded = decodeURIComponent(encoded)
      const data = JSON.parse(decoded)
      // 数据结构: data.app.videoDetail 或 data.app.awemeDetail
      const detail = data?.app?.videoDetail || data?.app?.awemeDetail || data?.awemeDetail
      if (detail) {
        if (!result.title && detail.desc) result.title = detail.desc.substring(0, 100)
        if (!result.coverImage && detail.cover?.urlList?.[0]) result.coverImage = detail.cover.urlList[0]
        if (!result.coverImage && detail.video?.cover?.urlList?.[0]) result.coverImage = detail.video.cover.urlList[0]
        if (!result.coverImage && detail.video?.poster) result.coverImage = detail.video.poster
      }
      break
    }
  } catch { /* 忽略 */ }
}
```

### 5.3 数据结构

```
RENDER_DATA (解码后 JSON)
├── app
│   ├── videoDetail                ← 桌面版视频详情
│   ├── awemeDetail                ← 移动版视频详情
│   └── ...
└── ...
```

字段说明：
- `detail.desc` — 视频描述（作为标题）
- `detail.cover.urlList[0]` — 静态封面（首选）
- `detail.video.cover.urlList[0]` — 视频内嵌封面
- `detail.video.poster` — video 标签的 poster

### 5.4 优势 / 局限

- ✅ 抖音新版 SSR 主推方式
- ❌ 依赖浏览器渲染（与方案 B/C 一起在 Puppeteer 通道内）
- ❌ 数据结构可能变化（需要关注抖音前端升级）

---

## 六、方案执行顺序（汇总）

```
抖音 URL 进入 fetchUrlMetadataCore()
    ↓
1. 平台识别 → platformKey = 'douyin'
    ↓
2. tryFastChannels() 并行执行
    ├── 方案A: fetchDouyinHttp()       ← HTTP 直拉（快通道）
    │   成功: 直接返回（~270ms）
    │   失败: 进入下一步
    ↓
3. fetchWithPuppeteer() 浏览器渲染
    ├── 等待 video / og:image 选择器
    ├── 方案B: video.poster
    ├── 方案C: _SSR_HYDRATED_DATA
    ├── 方案D: RENDER_DATA 脚本
    │   成功: 返回结果
    │   失败: 进入下一步
    ↓
4. getPlatformFallback() 兜底
    └── 返回平台默认标题 + favicon（零 HTTP 成本）
```

---

## 七、方案切换 / 回退指南

### 7.1 关闭方案 A（HTTP 直拉）

如果 HTTP 直拉通道出现异常（例如抖音对服务器 IP 全面风控），可临时禁用：

```typescript
// metadata.ts tryFastChannels() 中注释掉：
if (platformKey === 'douyin') {
  // tasks.push(fetchDouyinHttp(url, signal))  // ← 临时禁用
}
```

只影响快通道，Puppeteer 通道（方案 B/C/D）继续生效。

### 7.2 关闭方案 D（RENDER_DATA 脚本解析）

如果 RENDER_DATA 字段路径变化导致解析失败：

```typescript
// metadata.ts extractMetadataFromPage() 中 pk === 'douyin' 分支
// 注释掉 "3. 从 script 标签提取 RENDER_DATA" 整段（约 30 行）
```

### 7.3 完全回退到 Puppeteer 单通道

```typescript
// metadata.ts tryFastChannels() 中删除：
if (platformKey === 'douyin') {
  tasks.push(fetchDouyinHttp(url, signal))  // ← 整段删除
}
```

降级为：HTTP 直拉不参与 → Puppeteer 通道（video.poster + SSR + RENDER_DATA）→ 兜底。

### 7.4 监控指标

| 指标 | 期望值 | 日志关键词 |
|---|---|---|
| HTTP 直拉成功率 | > 70% | `[metadata] 抖音 HTTP 直拉成功` |
| HTTP 直拉平均耗时 | < 500ms | 同上 |
| Puppeteer 通道使用率 | < 30%（因为快通道优先）| `metadataStats.puppeteerUsed` |
| 兜底使用率 | < 5% | 抓取结果只有 `getPlatformFallbackMetadata` 字段 |

---

## 八、测试脚本

### 8.1 单个 URL 测试

```bash
cd project/apps/api
npx tsx src/test-douyin-single.ts "https://www.iesdouyin.com/share/video/{VIDEO_ID}/"
```

输出格式：
```
Testing Douyin: https://...
---
[2026-06-12 xx:xx:xx] DEBUG: [metadata] platform detected platform: "douyin"
[2026-06-12 xx:xx:xx] INFO: [metadata] 抖音 HTTP 直拉成功 title: "..." hasCover: true
[~270ms] Result:
  title:        视频标题
  coverImage:   https://p3-sign.douyinpic.com/...
  description:  ...
```

### 8.2 批量 URL 测试

```bash
# 在 test-douyin-batch.ts 中传入 URL 数组
npx tsx src/test-douyin-batch.ts
```

---

## 九、版本变更记录

| 日期 | 版本 | 变更 |
|---|---|---|
| 2026-05-11 | v1.0 | 初始方案 B/C/D（Puppeteer 单通道）|
| 2026-06-12 | v2.0 | **新增方案 A：HTTP 直拉通道**，实现 50x 提速 |

---

## 十、相关文档

- [metadata-fetch-optimization-plan.md](file:///d:/trae_projects/linkchest/project/docs/metadata-fetch-optimization-plan.md) — 元数据抓取总优化方案
- [metadata-scraping-optimization.md](file:///d:/trae_projects/linkchest/project/docs/metadata-scraping-optimization.md) — 抓取能力优化（P0/P1/P2）
- [platform-priority-strategy.md](file:///d:/trae_projects/linkchest/project/docs/platform-priority-strategy.md) — 平台优先级策略
- [platform-coverage-report.md](file:///d:/trae_projects/linkchest/project/docs/platform-coverage-report.md) — 平台覆盖报告

---

*最后更新：2026-06-12*
*版本：v2.0 — 新增方案 A HTTP 直拉通道*
