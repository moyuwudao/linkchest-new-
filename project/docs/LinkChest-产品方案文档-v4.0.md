# 链藏 / LinkChest V4.0 产品方案文档

> 本文档基于 2026-04-25 代码实际状态编写，反映当前线上真实功能，不包含已下线或未上线的功能。

---

## 一、产品定位

链藏 / LinkChest — 全网好内容，一键收入链藏。

一款跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自抖音、小红书、B站、YouTube 等 **91 个** 平台的内容链接。

### 品牌信息

| 项目 | 国内版 | 国际版 (Google Play) |
|------|--------|----------------------|
| 应用名 | 链藏 | LinkChest |
| Slogan | 全网好内容，一键收入链藏 | Collect the best of the web, all in one vault |
| 默认语言 | 中文 | English |

### 技术架构

| 层 | 技术 | 端口 |
|----|------|------|
| 后端 API | Express + TypeScript + Prisma ORM + PostgreSQL | 3001 |
| 前端 Web | Next.js 14 (App Router) + React + Tailwind CSS + shadcn/ui + TanStack Query | 3003 |
| 移动端 | React Native (Expo SDK 51) + Zustand + TanStack Query | — |
| 数据库 | PostgreSQL | 5432 |
| 缓存 | Redis（元数据缓存、URL 签名缓存） | 6379 |
| 对象存储 | 腾讯云 COS（封面图片） | — |
| 国际化 | 自定义 useI18n Hook + React Context + JSON 翻译文件 | — |
| 进程管理 | PM2 | — |
| 部署 | Docker Compose + 腾讯云服务器 + Nginx + Certbot | — |

---

## 二、当前版本核心特性

### 2.1 平台配置（91 个，S/A/B/C 分级）

| 优先级 | 定义 | 数量 | 代表平台 |
|--------|------|------|----------|
| S级 | 全球核心命脉 | 12 | 抖音、小红书、B站、微信、知乎、微博、YouTube、TikTok、Instagram、Twitter/X、Reddit、Pinterest |
| A级 | 区域高频 | 23 | 大众点评、美团、淘宝、京东、携程、网易云音乐、Spotify、Amazon、Airbnb、LinkedIn 等 |
| B级 | 垂直头部 | 25 | GitHub、Notion、Figma、Coursera、Steam、ChatGPT、Claude 等 |
| C级 | 中低频垂直 | 31 | 快手、腾讯视频、Netflix、百度贴吧、Boss直聘、Telegram、Unsplash 等 |

**品类覆盖**：视频(11)、社交(14)、文章(5)、音乐(4)、电商(6)、生活(11)、开发者(4)、设计(3)、效率工具(7)、教育(5)、科技资讯(4)、游戏(3)、AI(2)、财经(4)、汽车(2)、招聘(3)、图片(2)、问答(1)，共 **18 个品类**。

### 2.2 配额系统

用户分三个等级，各资源有明确上限：

| 等级 | 收藏 | 标签 | 分组 | 分享 | 分享项 | 封面图 |
|------|------|------|------|------|--------|--------|
| medium（默认） | 300 | 15 | 30 | 20 | 20 | 300 |
| heavy | 1,000 | 50 | 100 | 50 | 60 | 1,000 |
| super | 10,000 | 100 | 200 | 200 | 200 | 3,000 |

### 2.3 统一错误码体系

11 个错误码命名空间，前后端统一使用 `ERR_XXX_YYY` 格式，约 55+ 个错误码。

---

## 三、功能实现清单（仅包含实际上线的功能）

### 3.1 用户认证模块

**当前认证方式：仅支持邮箱 + 密码 / 邮箱验证码。** 手机号相关功能（手机号登录、手机号注册、换绑手机）前端入口已隐藏，后端代码保留但未启用。

| 功能 | API 路由 | Web 页面 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 邮箱+密码登录 | POST /api/auth/login-email | /login | LoginScreen | ✅ |
| 邮箱验证码登录 | POST /api/auth/login-email（code 模式） | /login | LoginScreen | ✅ |
| 邮箱注册 | POST /api/auth/register-email | /login | LoginScreen | ✅ |
| 获取当前用户 | GET /api/auth/me | 多处调用 | App.tsx | ✅ |
| 更新用户资料 | PATCH /api/auth/profile | /account, /settings | AccountSettingsScreen | ✅ |
| 设置密码 | POST /api/auth/set-password | /account | AccountSettingsScreen | ✅ |
| 修改密码 | PUT /api/auth/change-password | /account | AccountSettingsScreen | ✅ |
| 用户名可用性检查 | GET /api/auth/check-username | /settings | — | ✅ |
| 删除账号 | DELETE /api/auth/account | /account | AccountSettingsScreen | ✅ |

**认证机制**：JWT (7天有效期)。Web 端 Token 双写 Cookie + localStorage；移动端使用 SecureStore。验证码支持 IP 级别限流（每小时10次）和错误次数限制（5次）。

> **注**：后端仍保留 `/auth/send-code`、`/auth/login`（手机号）、`/auth/change-phone` 等路由代码，但前端登录/注册/账号设置页面均未暴露手机号入口。部分 i18n 文案仍保留手机号相关翻译，待后续清理。

### 3.2 收藏管理模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 收藏列表(分页/筛选/搜索) | GET /api/collections | 首页 | CollectionsScreen | ✅ |
| 添加收藏 | POST /api/collections | /add | AddCollectionScreen | ✅ 自动分配默认分组 |
| 单个收藏详情 | GET /api/collections/:id | DetailModal | CollectionDetailScreen | ✅ |
| 更新收藏 | PUT /api/collections/:id | /edit/[id] | EditCollectionScreen | ✅ |
| 删除收藏 | DELETE /api/collections/:id | CollectionList | CollectionDetailScreen | ✅ 带撤销 Toast |
| 批量删除 | POST /api/collections/batch-delete | 编辑模式 | — | ✅ |
| 批量添加标签 | POST /api/collections/batch-add-tags | 编辑模式 | — | ✅ |
| 批量移动到分组 | POST /api/collections/batch-update | 编辑模式 | — | ✅ |
| 智能解析 | POST /api/collections/smart-parse | /add | AddCollectionScreen | ✅ 自动判断URL/分享文本 |
| 去重检查 | POST /api/collections/check-duplicate | /add | AddCollectionScreen | ✅ |
| 导出(CSV) | GET /api/collections/export?format=csv | /settings | — | ✅ |
| 导入(CSV) | POST /api/collections/import | /settings | — | ✅ 分批导入，每批200条 |
| 配额查询 | GET /api/quota | /settings | ProfileScreen | ✅ |

**核心能力**：91 个平台自动识别、短链域名自动还原、跟踪参数清理、OG 多源降级封面提取、元数据 Redis 缓存 24 小时、LRU 内存缓存 500 条。

> **注**：后端已开发 HTML 书签导入/导出（Netscape Bookmark Format），但 Web 端 settings 页面目前仅开放 CSV 导入/导出，HTML 格式前台暂未上线。

### 3.3 标签管理模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 标签列表(含收藏数) | GET /api/tags | /tags, /settings | TagManageScreen | ✅ |
| 创建标签(自动重命名) | POST /api/tags | /tags, /settings | TagManageScreen | ✅ |
| 更新标签 | PUT /api/tags/:id | /tags, /settings | TagManageScreen | ✅ |
| 删除标签 | DELETE /api/tags/:id | /tags, /settings | TagManageScreen | ✅ |
| 标签排序(拖拽) | POST /api/tags/reorder | /tags | — | ✅ |

### 3.4 分组管理模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 分组列表(含收藏数+默认标记) | GET /api/lists | /lists, CollectionList | ListsScreen | ✅ 自动创建"我的收藏"默认分组 |
| 创建分组(自动重命名) | POST /api/lists | /lists | ListsScreen | ✅ 支持选择父分组 |
| 更新分组 | PUT /api/lists/:id | /lists | ListsScreen | ✅ |
| 删除分组(保护默认) | DELETE /api/lists/:id | /lists | ListsScreen | ✅ "我的收藏"不可删 |
| 分组排序(拖拽) | POST /api/lists/reorder | /lists | — | ✅ |
| 分组详情(含收藏列表) | GET /api/lists/:id | ListDetailModal | ListsScreen 内嵌 | ✅ |
| 移动分组 | PUT /api/lists/:id/move | /lists | — | ✅ 支持变更父分组 |

**嵌套分组**：最多支持 3 级嵌套；同父分组下名称唯一；移动分组时防止循环引用。

### 3.5 分享模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 我的分享列表 | GET /api/shares | /shares | ShareManagementScreen | ✅ |
| 创建分享 | POST /api/shares | /shares/create | CreateShareScreen | ✅ 10种类型+密码/有效期+配额检查 |
| 删除分享 | DELETE /api/shares/:id | /shares | ShareManagementScreen | ✅ |
| 启停分享 | PUT /api/shares/:id/toggle | /shares | ShareManagementScreen | ✅ |
| 公开查看分享 | GET /api/s/:shareId | /s/[shareId] | ShareDetailScreen | ✅ |
| 密码验证 | POST /api/s/:shareId/verify | ShareViewModal | ShareDetailScreen | ✅ |
| 一键保存 | POST /api/s/:shareId/save | ShareViewModal | ShareDetailScreen | ✅ |
| UV 浏览记录 | POST /api/s/:shareId/view | — | — | ✅ 登录用户去重统计 |
| 打开分享(输入链接) | — | /shares | ShareManagementScreen | ✅ 支持粘贴完整分享链接 |
| 剪贴板分享链接检测 | — | — | MainTabNavigator | ✅ 自动检测分享链接 |
| 一键导入分享 | POST /api/subscriptions/import | — | ShareDetailScreen | ✅ 非订阅方式，配额预检 |

**分享类型**：ALL(全部收藏)、LIST(单个分组)、LISTS(多分组)、TAG(单个标签)、TAGS(多标签)、MULTI_TAG(多标签)、MULTI_LIST(多分组)、COLLECTION(单个收藏)、COLLECTIONS(多收藏)、CUSTOM(自定义)。

**分享链接格式**：`${SHARE_BASE_URL}/s/${shareId}`（完整链接）。

> **注**：早期版本的 `LCST:` 分享码前缀格式已取消，当前统一使用完整链接分享。

> **注**：分享广场功能已下线（`/plaza` 路由禁用）。订阅功能仅保留一键导入，其余路由下线。

### 3.6 统计模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 总览统计 | GET /api/stats/overview | /settings | ProfileScreen | ✅ |
| 平台分布统计 | GET /api/stats/platforms | /settings | PlatformStatsScreen | ✅ |

### 3.7 封面编辑模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 封面 URL 输入 | — | /add | AddCollectionScreen, EditCollectionScreen | ✅ 文本输入框 |
| 封面上传/编辑 | POST /api/upload/cover | /edit/[id] | — | ✅ Web 端编辑页使用 CoverEditor 组件 |

**CoverEditor 组件支持四种模式**：上传本地图片（压缩→COS）、输入 URL、AI 生成（预留）、渐变占位图。

> **注**：封面上传功能在 Web 端编辑页面可用；添加页面仅提供封面 URL 文本输入。

### 3.8 智能默认封面系统（纯客户端，零服务器负担）

解决「无封面/封面抓取失败」场景的视觉效果问题，所有封面生成在客户端完成，不增加任何服务器调用。

| 能力 | Web 端 | Mobile 端 | 实现 |
|------|--------|-----------|------|
| 品类渐变 | ✅ SVG `linearGradient` | ✅ 纯色背景（`from` 色） | 19 个品类各有专属配色 + 图标 |
| 品类图标 | ✅ SVG `path` 内联 | ✅ `@expo/vector-icons` Ionicons | 视频▶、社交💬、文章📄、音乐🎵 等 |
| 首字增强 | ✅ 标题首字优先，回退平台名首字 | ✅ 同上 | `getFirstChar()` 提取中/英文首字 |
| 哈希配色 | ✅ URL 哈希从 12 色相环取色 | ✅ 同上 | `hashToColor()` 保证同一链接永远同色 |
| 浅色兜底 | ✅ 平台色过亮时自动变暗/哈希配色 | ✅ 同上 | 亮度阈值 `luminance > 0.6` |
| 阴影层次 | ✅ `feDropShadow` 滤镜 | ✅ `textShadow` / 装饰圆 | 增强视觉层级 |
| 消灭「无封面」 | ✅ ShareViewModal、SharePageClient | — | 文字 fallback 全部替换为增强封面 |

**19 个品类覆盖**：视频、社交、文章、音乐、电商、生活、知识、财经、开发者、游戏、设计、AI、效率、招聘、汽车、图片、科技、问答、教育。

**核心文件**：
- `apps/web/src/lib/coverTemplates.ts` — Web 端 SVG 模板 + 哈希配色 + 首字提取
- `apps/mobile/src/lib/coverTemplates.ts` — Mobile 端配色 + Ionicons 图标映射
- `apps/web/src/lib/platforms.ts` — `generateDefaultCover()` 增强版入口
- `apps/mobile/src/lib/platforms.ts` — `getDefaultCoverStyle()` RN 组件样式入口

> **设计原则**：
> 1. 不引入任何新依赖（Web 纯 SVG data URI，Mobile 纯 View + Text + Ionicons）
> 2. 不新增任何 API 调用或服务器计算
> 3. 浅色平台（如美团 `#FFD100`）自动降级为暗色哈希配色，保证白色文字可读
> 4. 未知平台使用 URL 哈希配色，相邻链接颜色差异明显

### 3.9 国际化模块

| 功能 | Web | Mobile | 状态 |
|------|-----|--------|------|
| 中英文切换 | ✅ 设置页下拉框 | ✅ 个人中心选项 | ✅ |
| 语言持久化 | ✅ localStorage | ✅ AsyncStorage | ✅ |
| 翻译 key 覆盖 | ~280+ keys | ~220+ keys | ✅ |
| 参数插值 | ✅ {param} | ✅ {param} | ✅ |
| 回退机制 | ✅ 回退到 zh | ✅ 回退到 zh | ✅ |

### 3.9 隐私政策与用户协议

| 功能 | Web 页面 | 移动端 | 状态 |
|------|----------|--------|------|
| 隐私政策 | /privacy | TermsScreen 内嵌 | ✅ |
| 用户协议 | /terms | TermsScreen 内嵌 | ✅ |

---

## 四、数据库模型 (PostgreSQL + Prisma)

| 模型 | 表名 | 字段数 | 关系 | 说明 |
|------|------|--------|------|------|
| User | users | 13 | 1:N → Collection, Tag, List, Share, CoverImage, ShareSubscription, ShareView | 含 userTier 配额等级；phone 字段保留 |
| Collection | collections | 9 | N:M → Tag, N:M → List, N:1 → User, 1:N → ShareItem | 收藏主体 |
| Tag | tags | 7 | N:M → Collection, N:1 → User | nameCn/nameEn 双语 |
| List | lists | 10 | N:M → Collection, N:1 → User, 自关联 parent/children | 支持 3 级嵌套 |
| Share | shares | 15 | 1:N → ShareItem, N:1 → User, 1:N → ShareView, 1:N → ShareSubscription | 含 isPlaza/allowSync（字段保留） |
| ShareItem | share_items | 8 | N:1 → Share, N:1 → Collection | 快照数据 |
| CoverImage | cover_images | 9 | N:1 → User | COS 存储元数据 |
| ShareSubscription | share_subscriptions | 5 | N:1 → User, N:1 → Share | 保留，功能已下线 |
| ShareView | share_views | 4 | N:1 → Share, N:1 → User | UV 去重统计 |

---

## 五、关键数字

| 指标 | 数值 |
|------|------|
| API 路由总数 | **52 个** |
| Web 页面总数 | **13 个** |
| 移动端页面总数 | **14 个** |
| Web 公共组件 | 20+ 个 |
| 支持平台数 | **91 个**（S:12 / A:23 / B:25 / C:31） |
| 平台品类数 | 18 个 |
| 短链域名数 | 27 个 |
| 数据库表 | **9 张** |
| i18n 翻译 key（Web） | ~280+ |
| i18n 翻译 key（Mobile） | ~220+ |
| 支持语言 | 中文 / English |
| 错误码总数 | 55+ |
| 估计总代码行数 | ~25,000 行 |

---

## 六、已下线/隐藏的功能（代码保留但未启用）

| 功能 | 说明 |
|------|------|
| **LCST: 分享码** | 早期短码格式已取消，统一使用完整链接 `/s/:shareId` |
| **分享广场** | `/plaza` 路由已禁用，相关同步逻辑已移除 |
| **订阅功能** | 仅保留一键导入（`POST /subscriptions/import`），其余订阅路由下线 |
| **手机号登录/注册** | 前端登录/注册页面已隐藏手机号入口，仅支持邮箱 |
| **换绑手机号** | 前端账号设置页面已移除换绑手机入口 |
| **HTML 书签导入/导出** | 后端已开发，但 Web 端 settings 页面仅开放 CSV 格式，HTML 前台未上线 |
| **手机号相关 i18n 文案** | 部分翻译文件中仍保留手机号相关文案，待后续清理 |

---

## 七、项目结构

```
linkchest/
├── apps/
│   ├── api/                  # 后端 API 服务 (端口 3001)
│   │   ├── prisma/           # 数据库 schema 和迁移
│   │   └── src/
│   │       ├── routes/       # API 路由（10 个模块, 52 个端点）
│   │       │   ├── auth.ts       # 认证（含保留的手机号路由）
│   │       │   ├── collections.ts # 收藏管理（含 HTML 解析逻辑）
│   │       │   ├── lists.ts       # 分组管理
│   │       │   ├── tags.ts        # 标签管理
│   │       │   ├── shares.ts      # 分享管理（广场已下线）
│   │       │   ├── public.ts      # 公开分享访问
│   │       │   ├── stats.ts       # 统计
│   │       │   ├── upload.ts      # COS 封面上传
│   │       │   ├── quota.ts       # 配额查询
│   │       │   └── subscriptions.ts # 订阅导入（其余已下线）
│   │       ├── services/     # 业务逻辑
│   │       ├── lib/          # 工具、配置、错误码
│   │       └── middleware/   # 认证中间件
│   ├── mobile/               # React Native 安卓应用
│   └── web/                  # Next.js 网页端（端口 3003）
├── deploy/                   # 部署脚本和 Nginx 配置
├── docker-compose.yml        # 本地开发环境（PostgreSQL + Redis）
└── package.json              # 根项目配置（workspaces: apps/*）
```

---

## 八、部署说明

### 后端部署

1. 准备 PostgreSQL 和 Redis
2. 设置环境变量（DATABASE_URL, JWT_SECRET, COS 配置等）
3. 执行 `npx prisma migrate deploy`
4. 使用 PM2 管理 `npm start`

### 网页端部署

1. 设置 `NEXT_PUBLIC_API_URL` 为生产环境 API 地址
2. 执行 `npm run build`
3. 使用 PM2 启动 `npm start`

### 移动端部署

1. 配置 `apps/mobile/app.json` 中的应用信息
2. 执行 EAS Build 构建 AAB/APK
3. 提交到 Google Play

### 服务器一键更新

```bash
cd deploy
./update.sh
```

脚本执行：git pull → 数据库迁移 → API 构建重启 → Web 构建重启 → 健康检查。

---

## 九、性能优化记录（2026-04-25 完成）

本次优化仅针对性能，不涉及功能扩展。按 P0→P3 优先级实施，共 12 项。

### 9.1 P0 - API 层高频查询优化

| # | 优化项 | 文件 | 说明 |
|---|--------|------|------|
| 1 | 认证中间件 Redis 缓存 | `auth.ts` | 每次请求先查 Redis `lv:user:{id}:safe`（TTL 300s），未命中再查 DB 并写入缓存；Redis 不可用时自动降级 |
| 2 | 配额查询 Redis 缓存 | `quota.ts` | `getQuotaUsage` 增加 Redis 缓存层 `lv:quota:{userId}:usage`（TTL 5s），减少 6 次 `COUNT(*)` 查询；事务场景自动跳过缓存 |
| 3 | 元数据抓取请求中断修复 | `metadata.ts` | `fetchUrlMetadata` 改用 `AbortController` 替代 `Promise.race`，超时后统一 `abort()`；`signal` 穿透至所有子请求函数，消除文件描述符泄漏 |

### 9.2 P1 - 前端性能与内存

| # | 优化项 | 文件 | 说明 |
|---|--------|------|------|
| 4 | Blob URL 内存泄漏修复 | `coverCache.ts` + `LazyImage.tsx` | `coverCache.ts` 新增 `activeBlobUrls` Map 跟踪活跃 URL，提供 `revokeCachedCover`；`LazyImage` 组件卸载时统一释放所有创建的 blob URL |
| 5 | React Query 缓存策略差异化 | `providers.tsx` | `staleTime` 改为函数式：`platforms` 30 分钟、`tags`/`lists` 5 分钟、动态数据（收藏列表等）1 分钟 |
| 6 | CollectionList 组件拆分 | `CollectionList.tsx` | 提取 `UndoToast` → `UndoToast.tsx`（134 行）、`CollectionDetailModal` → `CollectionDetailModal.tsx`（162 行），主组件职责单一 |
| 7 | 字体加载优化 | `layout.tsx` | LXGW WenKai 改用 `media="print" onload="this.media='all'"` 异步加载，消除字体阻塞首屏渲染 |

### 9.3 P2 - 构建与数据库

| # | 优化项 | 文件 | 说明 |
|---|--------|------|------|
| 8 | Turbo 构建缓存修复 | `turbo.json` | 移除 `!.next/cache/**` 排除规则，CI 构建可利用 Next.js 增量缓存 |
| 9 | 数据库复合索引补充 | `schema.prisma` | `Collection` 表新增 `@@index([userId, platform])`，覆盖按平台筛选的高频查询 |
| 10 | 健康检查深度增强 | `index.ts` | `/health` 增加 DB（`$queryRaw`）和 Redis（`ping`）连通性检测，异常返回 HTTP 503 |

### 9.4 P3 - 可选优化

| # | 优化项 | 文件 | 说明 |
|---|--------|------|------|
| 11 | next/image 配置优化 | `next.config.js` | 启用 `formats: ['avif', 'webp']`，`minimumCacheTTL: 7 天`，`remotePatterns` 通配所有 HTTPS 域名 |
| 12 | Prisma 连接池调优 | `prisma.ts` | 显式解析并日志输出 `connection_limit` 和 `pool_timeout`，便于运维排查 |

---

## 十、下一步开发计划

### 高优先级

| # | 功能 | 说明 | 预计工时 | 状态 |
|---|------|------|----------|------|
| 1 | 大数据量虚拟滚动 | 收藏列表大数据量场景下的虚拟滚动优化（未引入 react-window 等库） | 4h | **待开发** |
| 2 | ~~TypeScript 类型清理~~ | ~~Web 端 `any` 已基本清理；API 端 24 处已清理（`errorCodes.ts`/`metadata.ts`/`index.ts`/`ses.ts`/`quota.ts`/`metadata-queue.ts`/`platform-test-runner.ts`/`collections.ts`）~~ | ~~4h~~ | **已完成** ✅ |
| 3 | ~~批量操作合并~~ | ~~后端增加批量接口替代逐个请求~~ | ~~4h~~ | **已上线** ✅ 后端已有 `batch-delete`/`batch-add-tags`/`batch-move-lists`/`batch-update`；前端 CollectionList 编辑模式已接入 |
| 4 | ~~HTML 书签导入上线~~ | ~~Web 端 settings 页面开放 HTML 导入/导出~~ | ~~2h~~ | **已上线** ✅ Settings 页面支持 CSV/HTML 双格式导入导出，后端已实现 Netscape Bookmark Format 解析 |

### 中优先级

| # | 功能 | 说明 | 预计工时 | 状态 |
|---|------|------|----------|------|
| 5 | i18n 文案清理 | 移除过时的手机号相关翻译（zh.json 16 处 / en.json 12 处） | 2h | **待开发** |
| 6 | ~~深色模式~~ | ~~Web 端暗色模式完善~~ | ~~4h~~ | **已上线** ✅ Tailwind 配置 `darkMode: 'class'`，全局组件已覆盖 `dark:` 样式类 |
| 7 | ~~PWA 支持~~ | ~~Web 端 PWA 化：安装 `@ducanh2912/next-pwa`，配置 Service Worker + Workbox 离线缓存（Google Fonts、静态资源、next/image），`manifest.json` 已有图标和主题色~~ | ~~4h~~ | **已完成** ✅ |

### 锦上添花

| # | 功能 | 说明 | 预计工时 | 状态 |
|---|------|------|----------|------|
| 8 | 浏览器扩展 | 一键收藏插件 | 16h | 待开发 |
| 9 | 定期备份 | 导出到云存储 | 8h | 待开发 |
| 10 | 收藏评论/笔记 | 收藏添加评论 | 8h | 待开发 |
| 11 | 收藏评分 | 五星评分系统 | 4h | 待开发 |

---

> 文档生成时间：2026-04-25（已更新性能优化记录）
> 基于代码实际状态：91 平台、9 张数据表、52 个 API 端点、邮箱认证、完整链接分享、12 项性能优化已实施
