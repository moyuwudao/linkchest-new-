# LinkChest Chrome Extension — 页面元数据提取方案

> 本文档记录各平台标题/封面的提取策略，防止后续更新导致退化。
> 最后更新：2026-05-26

---

## 一、通用原则

1. **API 优先**：平台提供开放 API 时优先使用（YouTube oEmbed、Bilibili API 等）
2. **DOM 兜底**：API 失败或无 API 时，从页面 DOM 提取
3. **SPA 感知**：单页应用切换后不刷新页面，需检测 URL/modal_id 变化
4. **多视频处理**：垂直滑动布局（抖音 jingxuan）可能同时存在多个视频 DOM，需定位当前可见的

---

## 二、抖音（douyin.com / iesdouyin.com）

### 2.1 页面类型

| 类型 | URL 特征 | 特点 |
|------|---------|------|
| 精选页 | `/jingxuan?modal_id={id}` | 垂直滑动，多视频同时在 DOM 中 |
| 视频页 | `/video/{id}` | 单视频，传统页面 |
| 用户主页 | `/user/{uid}?modal_id={id}` | 弹窗播放，title 是用户名 |

### 2.2 提取流程

```
1. 提取 videoId（modal_id 或路径中的 id）
2. 调用抖音 API: https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids={videoId}
3. API 成功 → 返回封面 + 标题
4. API 失败（encrypt_data_miss 等）→ DOM 兜底
```

### 2.3 DOM 兜底策略

#### 标题提取 — `extractDouyinTitleFromDOM()`

**核心问题**：jingxuan 页面有多个 `[data-e2e="video-desc"]`，全局 `querySelector` 永远返回第一个（最上面的视频，可能是上一个）。

**解决方案**：先定位当前可见的视频 section，再在其内部查找 `video-desc`。

```typescript
function getCurrentDouyinVideoSection(): Element | null {
  const modalId = new URLSearchParams(window.location.search).get('modal_id')

  // 方式1：通过 modalId 匹配 class（如 video_123456）
  if (modalId) {
    const section = document.querySelector(`[class*="video_${modalId}"]`)
    if (section) return section
  }

  // 方式2：找在视口内的 video section（jingxuan 垂直滑动）
  const sections = document.querySelectorAll('[class*="video_"]')
  for (const section of sections) {
    const rect = section.getBoundingClientRect()
    // 当前可见：在视口内且面积足够大
    if (rect.top >= -50 && rect.top <= window.innerHeight / 2 && rect.height > 100) {
      return section
    }
  }

  return null
}
```

**标题清理**：
- 去掉尾部 `"展开"`
- 去掉从第一个 `#tag` 开始到末尾的所有内容（处理 `吗?#量化投资` 和 ` #tag` 两种情况）

```typescript
function cleanText(raw: string): string {
  let t = raw.replace(/展开\s*$/, '').trim()
  t = t.replace(/\s*#\S+.*$/, '').trim()
  return t
}
```

**优先级**：
1. 当前可见 section 内的 `[data-e2e="video-desc"]`
2. 全局 `[data-e2e="video-desc"]`（兼容单视频页面）
3. `document.title`（非用户主页兜底，但 SPA 切换后不更新，仅作最后 fallback）

#### 封面提取 — `extractDouyinCoverFromDOM()`

**优先级**：
1. `og:image`
2. `twitter:image`
3. `video[poster]`
4. 当前可见 section 内的 `<img>`（过滤 `naturalWidth < 200` 或 `naturalHeight < 200` 的小图，避免取到头像）

### 2.4 SPA 切换检测

抖音 jingxuan 用 `history.replaceState` 切换视频，需同时检测：
- `window.location.href` 变化
- `modal_id` 参数变化

```typescript
let lastUrl = window.location.href
let lastModalId = new URLSearchParams(window.location.search).get('modal_id') || ''

setInterval(() => {
  const currentUrl = window.location.href
  const currentModalId = new URLSearchParams(window.location.search).get('modal_id') || ''

  if (currentUrl !== lastUrl || currentModalId !== lastModalId) {
    lastUrl = currentUrl
    lastModalId = currentModalId
    setTimeout(() => extractAndSend('urlChange'), 1200)  // 延迟等待 SPA 渲染
  }
}, 1000)
```

### 2.5 已知限制

- 未登录用户：API 返回 `encrypt_data_miss`，完全依赖 DOM 兜底
- 登录用户：API 可能返回有效数据，但封面 URL 可能有签名过期问题
- `document.title` 在 SPA 切换后不更新，不可作为可靠来源

---

## 三、小红书（xiaohongshu.com / xhslink.com）

### 3.1 提取策略 — 封面（通用入口）

```
1. og:image（最可靠，登录用户有高清封面）
2. meta thumbnail
3. twitter:image
4. link[rel="image_src"]
5. img[src*="sns-webpic"]（小红书 CDN）
6. #noteContainer img / .note-content img / .note-scroller img
```

> 封面提取的详细内部逻辑见 §3.2（图片笔记）和 §3.3（视频笔记）。

### 3.2 图片笔记封面提取

图片笔记的封面是 `<img>` 标签，通过 `sns-webpic` CDN 域名 + modal 定位策略（§3.5）即可准确提取。

### 3.3 视频笔记封面提取（2026-05-26 修复）

**核心问题**：小红书视频使用 **xgplayer** 播放器，封面图不在 `<img>` 标签中，而是通过 `<xg-poster class="xgplayer-poster">` 自定义元素的 CSS `background-image` 属性存储。

**错误做法**：
```typescript
// ❌ 封面不在 <img> 标签中，position 重叠算法永远匹配不到
const allImgs = container.querySelectorAll('img')  // → 拿到的都是侧边栏推荐卡片缩略图
```

**正确做法 — 三层策略**：

```typescript
function extractCoverFromContainer(container: Element): string | null {
  // 1. video.poster（标准 HTML5 方式，小红书 xgplayer 始终为空）
  const video = container.querySelector('video') as HTMLVideoElement | null
  if (video?.poster && isValidImageUrl(video.poster)) return video.poster

  // 2. xgplayer-poster 的 background-image（小红书视频封面真实存储位置）
  const posterEl = container.querySelector<HTMLElement>('.xgplayer-poster, xg-poster')
  if (posterEl) {
    const bg = getComputedStyle(posterEl).backgroundImage
    const match = bg?.match(/url\(["']?([^"')]+)["']?\)/)
    if (match?.[1] && isValidImageUrl(match[1])) return match[1]  // → sns-webpic URL
  }

  // 3. 兜底：position 重叠算法（匹配 <img> 与 <video> 的矩形交集）
  //    对于 xgplayer 场景始终为 null，保留作为非标准播放器兼容
  //    ...
}
```

**MCP 实测验证**（2026-05-26，red_video 页面）：

| 策略 | 结果 |
|------|------|
| `video.poster` | 空 |
| **`xgplayer-poster` background-image** | `http://sns-webpic-qc.xhscdn.com/...` |
| 重叠算法（兜底） | `null`（封面不在 `<img>` 中） |

**适用页面**：`/red_video/*`（RED 视频专区）和 `/explore` modal 中的视频笔记均使用 xgplayer。

### 3.4 关键注意点

**`isPlaceholderImage` 黑名单**：
- ❌ **禁止**将 `picasso-static`、`fe-platform` 加入黑名单
- ✅ 这两个域名是小红书图片 CDN，登录用户的 `og:image` 就是 `//picasso-static.xiaohongshu.com/...`

**协议相对 URL**：
- 小红书 `og:image` 可能是 `//picasso-static.xiaohongshu.com/...`（无协议前缀）
- `isValidImageUrl` 必须支持 `//` 开头的 URL

**CSS 选择器限制**：
- ❌ `querySelector('img[naturalWidth>400]')` 会抛出 `SyntaxError`
- ✅ 必须用 JS 循环检查：`img.naturalWidth > 400`

### 3.5 小红书 SPA + Modal 架构

**核心问题**：小红书是 SPA，点击笔记后**不刷新页面**，而是在当前页面上打开一个 **modal/overlay 浮层** 显示笔记详情。首页的所有笔记缩略图 DOM 仍然存在于页面中。

**错误做法**：
```typescript
// ❌ 这会取到首页第一张缩略图，不是当前笔记
const firstImg = document.querySelector('img[src*="sns-webpic"]')
```

**正确做法 — 三层策略区分 modal 中的当前笔记**：

**策略 A：z-index 最高的浮层容器**
```typescript
for (const el of document.querySelectorAll('*')) {
  const style = window.getComputedStyle(el)
  const zIndex = parseInt(style.zIndex, 10)
  if ((style.position === 'fixed' || style.position === 'absolute') &&
      !isNaN(zIndex) && zIndex > highestZ && zIndex < 99999) {
    // 用 JS 检查是否包含大图（不能用 CSS 选择器）
    const imgs = el.querySelectorAll('img')
    let hasLargeImg = false
    for (const img of imgs) {
      if ((img as HTMLImageElement).naturalWidth > 400) {
        hasLargeImg = true
        break
      }
    }
    if (hasLargeImg) {
      // 这是当前笔记的 modal，提取其中的图片
      return modal.querySelector('img').src
    }
  }
}
```

**策略 B：body 末尾最新插入的容器**
```typescript
// modal 通常 append 到 body 末尾，从后往前找
const bodyChildren = Array.from(document.body.children)
for (let i = bodyChildren.length - 1; i >= 0; i--) {
  const child = bodyChildren[i]
  const rect = child.getBoundingClientRect()
  if (rect.width > 300 && rect.height > 300) {
    // 这是当前笔记的容器
    return child.querySelector('img').src
  }
}
```

**策略 C：视口中央的大图（面积/距离分数）**
```typescript
let bestImg: HTMLImageElement | null = null
let bestScore = -1

for (const img of allImgs) {
  const rect = img.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const screenCX = window.innerWidth / 2
  const screenCY = window.innerHeight / 2
  const dist = Math.sqrt(Math.pow(centerX - screenCX, 2) + Math.pow(centerY - screenCY, 2))
  const size = rect.width * rect.height
  const score = size / (dist + 100)  // 面积大且靠近中心的分数高

  if (rect.width > 200 && rect.height > 200 && score > bestScore) {
    bestScore = score
    bestImg = img
  }
}
```

### 3.6 SPA 渲染延迟

小红书从首页点击笔记后，modal 和图片加载需要较长时间：
```typescript
const delay = currentUrl.includes('xiaohongshu') ? 2500 : 1200
setTimeout(() => extractAndSend('urlChange'), delay)
```

### 3.7 已知问题

- MCP 浏览器未登录会跳转到登录页/404，无法验证
- 实际用户环境（已登录）中 `og:image` 可能不存在，需依赖 DOM 兜底

---

## 四、YouTube（youtube.com / youtu.be）

### 4.1 提取策略

```typescript
// 构造高清封面
const coverUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`

// 标题：document.title 动态更新，直接可用
const title = document.title.replace(/\s*-\s*YouTube$/, '').trim()
```

### 4.2 特点

- `document.title` 在视频切换时正确更新（YouTube 会修改 `<title>`）
- 封面通过 videoId 构造，无需 API 调用
- 无需特殊 DOM 解析

---

## 五、其他平台速查

| 平台 | 策略 | 备注 |
|------|------|------|
| Bilibili | `og:image` → `meta[itemprop="image"]` | 有开放 API 可用 |
| 知乎 | `og:image` → `twitter:image` | 标准 OG 标签 |
| 微博 | `og:image` / `twitter:image` → `.WB_editor_iframe_new img` | 需处理微博详情页 |
| Twitter/X | `og:image` / `twitter:image` | 标准 OG 标签 |
| TikTok | `og:image` / `twitter:image` → `video[poster]` | 类似抖音但结构不同 |
| Instagram | `og:image` | 标准 OG 标签 |
| 通用网页 | `og:image` → `twitter:image` → `link[rel="image_src"]` | 最后 fallback |

---

## 六、Popup 与 Content Script 通信

### 6.1 消息类型

| 方向 | 消息类型 | 说明 |
|------|---------|------|
| CS → Background/Popup | `METADATA_EXTRACTED` | 提取完成后主动推送 |
| Popup → CS | `GET_METADATA` | Popup 打开时主动请求 |

### 6.2 Popup 初始化流程

```typescript
// Popup.tsx 初始化时
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0]
  if (tab?.url) setPageUrl(tab.url)

  // 优先向 content script 请求提取的元数据
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_METADATA' }, (metadata) => {
      if (metadata) {
        if (metadata.title) setPageTitle(metadata.title)
        if (metadata.coverImage) setFaviconUrl(metadata.coverImage)
      } else {
        // content script 无响应，回退到 tab.title
        if (tab?.title) setPageTitle(tab.title)
      }
    })
  }
})
```

**关键**：Popup 不能直接用 `tab.title`，因为 SPA 页面（抖音）的标签标题不会随视频切换更新。

---

## 七、调试方法

### 7.1 Content Script 控制台输出

打开目标页面 F12 → Console，查看：
- `[LinkChest] Metadata extracted (initial):` — 首次加载结果
- `[LinkChest] URL/Modal changed:` — URL/modal_id 变化检测
- `[LinkChest] Metadata extracted (urlChange):` — 切换后重新提取结果
- `[LinkChest] Douyin DOM fallback:` — API 失败后的 DOM 兜底结果

### 7.2 手动验证提取逻辑

```javascript
// 在目标页面 Console 中执行
chrome.runtime.sendMessage({type: 'GET_METADATA'}, console.log)
```

### 7.3 检查 content script 是否加载

```javascript
// 检查全局函数是否存在
console.log(typeof getCurrentDouyinVideoSection)
// 应输出 "function"，如果输出 "undefined" 说明扩展未正确加载
```

---

## 八、修改检查清单

修改 `metadata-extractor.ts` 后，必须验证以下场景：

- [ ] 抖音 jingxuan 首次加载 — 标题和封面正确
- [ ] 抖音 jingxuan 切换视频 — 标题和封面同步更新
- [ ] 抖音用户主页 — 标题是视频标题（非用户名），封面正确
- [ ] 小红书（已登录）— 封面正常显示
- [ ] YouTube — 标题和封面正确
- [ ] Popup 打开 — 显示 content script 提取的标题/封面