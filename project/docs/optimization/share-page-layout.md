# 分享页自由排版与布局方案

> 提出时间：2026-05-15 | 状态：待讨论 | 优先级：高

---

## 1. 需求背景

### 1.1 痛点描述

当前分享页排版固定，用户无法自定义展示方式，存在以下问题：

| 场景 | 问题 | 影响 |
|------|------|------|
| 布局固定 | 分享页硬编码为 grid 布局，`Share.layout` 字段虽支持 grid/list/card 但渲染端未实现 | 用户体验单一 |
| 无个性化 | 所有分享页外观一致，无法体现用户风格 | 付费价值感不足 |
| 封面受限 | 用户上传封面在分享时被替换为品牌色 SVG，封面无法自由引用 | 功能缺失 |
| 模块不可控 | 标题/描述/链接等模块无法调整顺序或隐藏 | 灵活性差 |

### 1.2 核心诉求

为专业版和旗舰版用户提供分享页自由排版与布局能力，提升付费用户差异化体验。

### 1.3 功能范围

| 功能 | 面向用户 | 优先级 | 阶段 |
|------|----------|--------|------|
| 模块拖拽排序 | 专业版 + 旗舰版 | P0 | 阶段一 |
| 模块显隐控制 | 专业版 + 旗舰版 | P0 | 阶段一 |
| 预设布局模板（grid/list/card） | 专业版 + 旗舰版 | P0 | 阶段一 |
| 封面链接自由使用 | 专业版 + 旗舰版 | P0 | 阶段一 |
| 自定义背景 | 旗舰版 | P1 | 阶段二 |
| 自定义配色 | 旗舰版 | P1 | 阶段二 |
| 自定义字体 | 旗舰版 | P1 | 阶段二 |
| 视频嵌入播放器 | — | P2 | 后续优化池 |
| 自定义备注/标签 | — | P2 | 后续优化池 |
| 短链/二维码/海报图 | — | P2 | 后续优化池 |
| 分享页数据统计 | — | P2 | 后续优化池 |

---

## 2. 技术可行性评估

### 2.1 拖拽布局库选型

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **@dnd-kit/core + @dnd-kit/sortable** | React-first、TypeScript 原生、触屏友好、轻量（core ~8KB gzip） | 需自实现网格布局逻辑 | ★★★★★ |
| SortableJS + react-sortablejs | 成熟稳定、开箱即用排序动画 | React 封装层有 SSR 兼容问题、操作 DOM 与 Next.js SSR 冲突 | ★★★☆☆ |
| react-grid-layout | 支持网格拖拽+缩放、功能强大 | 包体积大（~30KB gzip）、过度设计、移动端体验差 | ★★☆☆☆ |

**推荐：@dnd-kit** — 与 React 18 + Next.js 14 天然契合，分享页拖拽是模块级排序而非网格自由定位，sortable 完全够用。

### 2.2 配置存储方案

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **Share 表新增 layoutConfig Json 字段** | 与现有模型一致、查询简单、Prisma Json 原生支持 | 需应用层 Zod 校验 | ★★★★★ |
| 独立 ShareLayout 表 | 结构化存储、可做数据库级约束 | 1:1 关系独立表过度设计 | ★★★☆☆ |

**推荐：Share.layoutConfig (Json)** — 与现有 `ShareItem.tags`（Json 字段）模式一致，Zod 做应用层校验。

### 2.3 渲染方案：配置驱动渲染引擎

```
layoutConfig (JSON)
    ↓ Zod 校验
    ↓ 转换为 LayoutConfig 类型
    ↓
LayoutRenderer 组件
    ├── 根据 template 选择布局容器
    ├── 根据 modules[].order 排序渲染模块
    ├── 根据 modules[].visible 控制显隐
    └── 根据 style 应用视觉定制
```

**降级策略**：
- 免费版：`layoutConfig = null` → 默认固定布局（当前 grid）
- 专业版：模块排序 + 显隐 + 模板选择
- 旗舰版：额外支持视觉定制（背景/配色/字体）

### 2.4 封面链接自由使用

API 端新增封面代理接口：

```
GET /api/cover/proxy?url={encodedUrl}&w=800&h=600&q=80
```

- 复用已有 `sharp` 库做实时裁剪/缩放
- CDN 缓存（Cache-Control 头）
- 域名白名单限制（防 SSRF）
- 尺寸上限（最大 1200x1200）

---

## 3. 布局配置 JSON Schema

```jsonc
{
  "template": "grid" | "list" | "card",

  "modules": [
    {
      "id": "header",
      "type": "header" | "cover" | "description" | "links" | "footer",
      "visible": true,
      "order": 0,
      "props": {
        // header: showViewCount, showExpiry, showPasswordBadge
        // cover: size(small|medium|large), source(original|compressed|custom),
        //        customUrl, width, height
        // links: columns, showPlatform, showRating, coverSizeMode
      }
    }
  ],

  "style": {
    "background": {
      "type": "solid" | "gradient" | "image",
      "color": null,
      "gradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "imageUrl": null
    },
    "colors": {
      "primary": "#667eea",
      "accent": "#764ba2",
      "text": "#1a1a2e",
      "textSecondary": "#6b7280"
    },
    "font": "default" | "serif" | "mono" | "rounded" | "elegant",
    "borderRadius": "none" | "small" | "medium" | "large" | "full",
    "cardShadow": "none" | "small" | "medium" | "large"
  }
}
```

**默认配置（免费版降级）**：

```json
{
  "template": "grid",
  "modules": [
    { "id": "header", "type": "header", "visible": true, "order": 0, "props": {} },
    { "id": "description", "type": "description", "visible": true, "order": 1, "props": {} },
    { "id": "links", "type": "links", "visible": true, "order": 2, "props": { "columns": 3 } },
    { "id": "footer", "type": "footer", "visible": true, "order": 3, "props": {} }
  ],
  "style": null
}
```

---

## 4. 数据库变更

```prisma
model Share {
  // ... 现有字段 ...
  layout        String    @default("grid")   // 保留，向后兼容 fallback
  layoutConfig  Json?                         // 新增：完整布局配置
}
```

**迁移策略**：
- `layout` 字段保留，`layoutConfig` 为 null 时根据 `layout` 生成默认配置
- 新创建的分享（专业版+旗舰版）写入 `layoutConfig`

---

## 5. 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 移动端拖拽体验不佳 | 中 | @dnd-kit 触屏支持 + 编辑器仅桌面端使用 |
| 复杂布局渲染性能 | 中 | React.memo + 虚拟化 + 懒加载图片 |
| layoutConfig Schema 升级兼容 | 中 | 版本号字段 + 向后兼容解析 |
| 封面代理接口被滥用 | 中 | 域名白名单 + 频率限制 + 尺寸上限 |
| 小程序/H5 布局一致性 | 低 | 分享页当前仅 Web，移动端为 WebView |

---

## 6. 关键架构决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 拖拽库 | @dnd-kit | React-first + 触屏友好 + 轻量 |
| 配置存储 | Share.layoutConfig (Json) | 1:1 关系，Prisma 原生支持 |
| 渲染方式 | 配置驱动 + React 组件 | 声明式渲染，易测试易扩展 |
| 封面代理 | API 代理 + sharp 裁剪 | 复用已有 sharp 依赖，CDN 缓存 |
| 降级策略 | layoutConfig=null → 默认布局 | 零配置即降级，无需额外逻辑 |
| 模板系统 | 预设模板组件 + 可扩展 | 先做 3 种预设，后续可开放自定义 |

---

## 7. 开发工作量预估

### 阶段一（P0 核心功能）

| 任务 | 说明 |
|------|------|
| 数据库迁移 + layoutConfig Schema | Prisma migration + Zod schema |
| API: 创建/更新分享时保存 layoutConfig | shares.ts 路由扩展 |
| API: 公开分享接口返回 layoutConfig | public.ts 路由扩展 |
| 布局渲染引擎（LayoutRenderer） | 核心组件，配置驱动渲染 |
| 三种预设模板实现（grid/list/card） | 3 个布局容器组件 |
| 模块拖拽排序编辑器 | @dnd-kit/sortable 集成 |
| 模块显隐控制 UI | 开关组件 |
| 封面链接自由使用 | 封面代理接口 + 布局集成 |
| 等级门控逻辑 | 配额检查 + 功能降级 |

### 阶段二（P1 视觉定制）

| 任务 | 说明 |
|------|------|
| 自定义背景 | 纯色/渐变/图片 |
| 自定义配色 | CSS 变量 + 预设色板 |
| 自定义字体 | 5 种预设字体 |
| 视觉风格编辑器 UI | 颜色选择器 + 字体选择器 |

---

## 8. 后续优化池（P2）

| 功能 | 暂缓原因 |
|------|----------|
| 视频嵌入播放器 | 需视频托管/转码基础设施，投入大 |
| 自定义备注/标签 | 需求不明确，需收集用户反馈 |
| 短链/二维码/海报图 | 短链需域名规划，海报图需服务端渲染 |
| 分享页数据统计 | 现有 ShareView 表有基础 UV 统计，完整分析需单独设计 |
| 自定义 CSS 注入 | 旗舰版高级功能，需安全沙箱 |
| 分享页 A/B 测试 | 多版本布局效果对比 |

---

## 9. 待决策事项

| 事项 | 选项 |
|------|------|
| 是否推进 | 推进 / 暂缓（当前决策）/ 放弃 |
| 推进条件 | 1. 用户反馈验证 2. 开发排期确认 3. 封面代理安全方案评审 |
| 功能范围确认 | P0 全做 / P0 精简 / P0+P1 一起做 |
| 封面替换规则是否调整 | 当前用户上传封面分享时替换为品牌色 SVG，是否允许付费用户保留原封面 |

---

*文档创建时间：2026-05-15*
*基于 2026-05-15 方案讨论整理*
