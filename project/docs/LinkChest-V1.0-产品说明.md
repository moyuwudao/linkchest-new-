# LinkChest V1.0 产品说明

> 本文档基于 2026-04-28 代码实际状态编写，反映当前线上真实功能，作为测试、产品指导书编写及服务条款更新的权威依据。
>
> 本文档替代并整合此前的 V3.1 / V4.0 产品方案文档，版本号重新定义为 **V1.0**，代表产品首个正式发布版本。

---

## 一、产品定位与概述

### 1.1 产品信息

| 项目 | 国内版 | 国际版（Google Play） |
|------|--------|----------------------|
| 应用名 | 链藏 | LinkChest |
| Slogan | 收藏并分享你的宝藏 | Collect and share your treasures |
| 默认语言 | 中文 | English |
| 分享链接格式 | `https://linkchest.com/s/{shareId}` | 同左 |
| 认证方式 | 邮箱 + 密码 / Google 登录 | 同左 |

**一句话描述**：一款跨平台收藏聚合管理工具，帮助用户统一收集、整理、分享来自各大平台的好内容。

### 1.2 技术架构总览

| 层 | 技术 | 端口 |
|----|------|------|
| 后端 API | Express + TypeScript + Prisma ORM + PostgreSQL | 3001 |
| 前端 Web | Next.js 14 (App Router) + React + Tailwind CSS + shadcn/ui + TanStack Query | 3003 |
| 移动端 | React Native (Expo SDK 51) + Zustand + TanStack Query | — |
| 数据库 | PostgreSQL | 5432 |
| 缓存 | Redis（元数据缓存、URL 签名缓存） | 6379 |
| 对象存储 | 腾讯云 COS `ap-singapore`（封面图片） | — |
| 国际化 | 自定义 useI18n Hook + React Context + JSON 翻译文件 | — |
| 进程管理 | PM2 | — |
| 部署 | Docker Compose + 新加坡服务器 + Nginx + Certbot | — |

---

## 二、平台支持

### 2.1 平台覆盖

平台覆盖采用内部分级管理（S/A/B/C 四级），涵盖全球主流平台，按视频、社交、文章、音乐、电商、生活、开发者、设计、效率工具、教育、科技资讯、游戏、AI、财经、汽车、招聘、图片、问答等 **18 个品类**。

### 2.2 链接处理能力

- **短链还原**：支持 27 个短链域名的自动还原
- **跟踪参数清理**：自动清理 URL 中的追踪参数
- **元数据提取**：OG 多源降级封面提取，Redis 缓存 24 小时，LRU 内存缓存 500 条

---

## 三、配额系统

用户分三个等级，各资源有明确上限：

| 等级 | 收藏上限 | 标签上限 | 分组上限 | 分享上限 | 分享项上限 | 封面图上限 |
|------|----------|----------|----------|----------|------------|------------|
| medium（默认） | 300 | 15 | 30 | 20 | 20 | 300 |
| heavy | 1,000 | 50 | 100 | 50 | 60 | 1,000 |
| super | 10,000 | 100 | 200 | 200 | 200 | 3,000 |

---

## 四、错误码体系

11 个错误码命名空间，前后端统一使用 `ERR_XXX_YYY` 格式，共约 **55+ 个**错误码。

---

## 五、功能模块详解

### 5.1 用户认证模块

**当前认证方式：邮箱 + 密码 / Google 登录。** 邮箱验证码仅用于注册和重置密码。手机号相关功能已完全下线。

| 功能 | API 路由 | Web 页面 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 邮箱+密码登录 | POST /api/auth/login-email | /login | LoginScreen | ✅ 已上线 |
| Google 登录 | POST /api/auth/google | /login | LoginScreen | ✅ 已上线 |
| 发送验证码 | POST /api/auth/send-code | /login（注册/重置密码） | — | ✅ 已上线（仅用于注册、重置密码） |
| 邮箱注册 | POST /api/auth/register-email | /login | LoginScreen | ✅ 已上线 |
| 获取当前用户 | GET /api/auth/me | 多处调用 | App.tsx | ✅ 已上线 |
| 更新用户资料 | PATCH /api/auth/profile | /account, /settings | AccountSettingsScreen | ✅ 已上线 |
| 设置密码 | POST /api/auth/set-password | /account | AccountSettingsScreen | ✅ 已上线 |
| 修改密码 | PUT /api/auth/change-password | /account | AccountSettingsScreen | ✅ 已上线 |
| 重置密码 | POST /api/auth/reset-password | /login | — | ✅ 已上线（通过验证码） |
| 用户名可用性检查 | GET /api/auth/check-username | /settings | — | ✅ 已上线 |
| 删除账号 | DELETE /api/auth/account | /account | AccountSettingsScreen | ✅ 已上线 |

**认证机制**：JWT（7 天有效期）。Web 端 Token 双写 Cookie + localStorage；移动端使用 SecureStore。验证码支持 IP 级别限流（每小时 10 次）和错误次数限制（5 次）。

**Google 登录逻辑**：通过 Google ID Token 验证 → 优先匹配 googleId → 回退匹配 email 并关联 → 新用户自动创建（含默认分组和标签）。Google 登录用户禁止修改邮箱，但可设置独立密码。

> ⚠️ **注意**：`User` 表 `phone` 字段及少量注释中仍有"手机号"字样残留，不影响功能，仅待后续彻底清理。手机号登录/注册/换绑的独立路由已完全移除。

### 5.2 收藏管理模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 收藏列表（分页/筛选/搜索） | GET /api/collections | 首页 | CollectionsScreen | ✅ 已上线 |
| 添加收藏 | POST /api/collections | /add | AddCollectionScreen | ✅ 已上线（自动分配默认分组） |
| 单个收藏详情 | GET /api/collections/:id | DetailModal | CollectionDetailScreen | ✅ 已上线 |
| 更新收藏 | PUT /api/collections/:id | /edit/[id] | EditCollectionScreen | ✅ 已上线 |
| 删除收藏 | DELETE /api/collections/:id | CollectionList | CollectionDetailScreen | ✅ 已上线（带撤销 Toast） |
| 批量删除 | POST /api/collections/batch-delete | 编辑模式 | — | ✅ 已上线 |
| 批量添加标签 | POST /api/collections/batch-add-tags | 编辑模式 | — | ✅ 已上线 |
| 批量移动到分组 | POST /api/collections/batch-update | 编辑模式 | — | ✅ 已上线 |
| 智能解析 | POST /api/collections/smart-parse | /add | AddCollectionScreen | ✅ 已上线（自动判断 URL/分享文本） |
| 去重检查 | POST /api/collections/check-duplicate | /add | AddCollectionScreen | ✅ 已上线 |
| 导出（CSV） | GET /api/collections/export?format=csv | /settings | — | ✅ 已上线 |
| 导出（HTML 书签） | GET /api/collections/export?format=html | /settings | — | ✅ 已上线 |
| 导入（CSV） | POST /api/collections/import | /settings | — | ✅ 已上线（分批导入，每批 200 条） |
| 导入（HTML 书签） | POST /api/collections/import | /settings | — | ✅ 已上线（Netscape Bookmark Format） |
| 配额查询 | GET /api/quota | /settings | ProfileScreen | ✅ 已上线 |

**核心能力**：多平台自动识别、短链域名自动还原（27 个）、跟踪参数清理、OG 多源降级封面提取、元数据 Redis 缓存 24 小时、LRU 内存缓存 500 条。

### 5.3 标签管理模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 标签列表（含收藏数） | GET /api/tags | /tags, /settings | TagManageScreen | ✅ 已上线 |
| 创建标签（自动重命名） | POST /api/tags | /tags, /settings | TagManageScreen | ✅ 已上线 |
| 更新标签 | PUT /api/tags/:id | /tags, /settings | TagManageScreen | ✅ 已上线 |
| 删除标签 | DELETE /api/tags/:id | /tags, /settings | TagManageScreen | ✅ 已上线 |
| 标签排序（拖拽） | POST /api/tags/reorder | /tags | — | ✅ 已上线 |

### 5.4 分组管理模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 分组列表（含收藏数+默认标记） | GET /api/lists | /lists, CollectionList | ListsScreen | ✅ 已上线（自动创建"我的收藏"默认分组） |
| 创建分组（自动重命名） | POST /api/lists | /lists | ListsScreen | ✅ 已上线（支持选择父分组） |
| 更新分组 | PUT /api/lists/:id | /lists | ListsScreen | ✅ 已上线 |
| 删除分组（保护默认） | DELETE /api/lists/:id | /lists | ListsScreen | ✅ 已上线（"我的收藏"不可删除） |
| 分组排序（拖拽） | POST /api/lists/reorder | /lists | — | ✅ 已上线 |
| 分组详情（含收藏列表） | GET /api/lists/:id | ListDetailModal | ListsScreen 内嵌 | ✅ 已上线 |
| 移动分组 | PUT /api/lists/:id/move | /lists | — | ✅ 已上线（支持变更父分组） |

**嵌套分组**：最多支持 **3 级嵌套**；同父分组下名称唯一；移动分组时防止循环引用。

### 5.5 分享模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 我的分享列表 | GET /api/shares | /shares | ShareManagementScreen | ✅ 已上线 |
| 创建分享 | POST /api/shares | /shares/create | CreateShareScreen | ✅ 已上线（10 种类型+密码/有效期+配额检查） |
| 删除分享 | DELETE /api/shares/:id | /shares | ShareManagementScreen | ✅ 已上线 |
| 启停分享 | PUT /api/shares/:id/toggle | /shares | ShareManagementScreen | ✅ 已上线 |
| 公开查看分享 | GET /api/s/:shareId | /s/[shareId] | ShareDetailScreen | ✅ 已上线 |
| 密码验证 | POST /api/s/:shareId/verify | ShareViewModal | ShareDetailScreen | ✅ 已上线 |
| 一键保存 | POST /api/s/:shareId/save | ShareViewModal | ShareDetailScreen | ✅ 已上线 |
| UV 浏览记录 | POST /api/s/:shareId/view | — | — | ✅ 已上线（登录用户去重统计） |
| 打开分享（输入链接） | — | /shares | ShareManagementScreen | ✅ 已上线（支持粘贴完整分享链接） |
| 剪贴板分享链接检测 | — | — | MainTabNavigator | ✅ 已上线（自动检测分享链接） |
| 一键导入分享 | POST /api/subscriptions/import | — | ShareDetailScreen | ✅ 已上线（非订阅方式，配额预检） |

**分享类型（10 种）**：ALL（全部收藏）、LIST（单个分组）、LISTS（多分组）、TAG（单个标签）、TAGS（多标签）、MULTI_TAG（多标签）、MULTI_LIST（多分组）、COLLECTION（单个收藏）、COLLECTIONS（多收藏）、CUSTOM（自定义）。

**分享链接格式**：`${SHARE_BASE_URL}/s/${shareId}`（完整链接，如 `https://linkchest.com/s/abc123`）。

> ⚠️ **注意**：
> - 早期版本的 `LCST:` 分享码前缀格式**已取消**，当前统一使用完整链接分享。
> - 分享广场功能**已下线**（`/plaza` 路由禁用）。
> - 订阅功能仅保留一键导入，其余路由已下线。

### 5.6 统计模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 总览统计 | GET /api/stats/overview | /settings | ProfileScreen | ✅ 已上线 |
| 平台分布统计 | GET /api/stats/platforms | /settings | PlatformStatsScreen | ✅ 已上线 |

### 5.7 封面编辑模块

| 功能 | API 路由 | Web 入口 | 移动端 | 状态 |
|------|----------|----------|--------|------|
| 封面 URL 输入 | — | /add | AddCollectionScreen, EditCollectionScreen | ✅ 已上线（文本输入框） |
| 封面上传/编辑 | POST /api/upload/cover | /edit/[id] | — | ✅ 已上线（Web 端编辑页使用 CoverEditor 组件） |

**CoverEditor 组件支持四种模式**：上传本地图片（压缩→COS）、输入 URL、AI 生成（预留）、渐变占位图。

> ⚠️ **注意**：封面上传功能在 Web 端编辑页面可用；添加页面仅提供封面 URL 文本输入。

### 5.8 智能默认封面系统

解决「无封面/封面抓取失败」场景的视觉效果问题，所有封面生成在**客户端完成**，不增加任何服务器调用。

| 能力 | Web 端 | 移动端 | 实现 |
|------|--------|--------|------|
| 品类渐变 | ✅ SVG `linearGradient` | ✅ 纯色背景 | 19 个品类各有专属配色 + 图标 |
| 品类图标 | ✅ SVG `path` 内联 | ✅ `@expo/vector-icons` Ionicons | 视频▶、社交💬、文章📄、音乐🎵 等 |
| 首字增强 | ✅ 标题首字优先，回退平台名首字 | ✅ 同上 | `getFirstChar()` 提取中/英文首字 |
| 哈希配色 | ✅ URL 哈希从 12 色相环取色 | ✅ 同上 | `hashToColor()` 保证同一链接永远同色 |
| 浅色兜底 | ✅ 平台色过亮时自动变暗/哈希配色 | ✅ 同上 | 亮度阈值 `luminance > 0.6` |
| 阴影层次 | ✅ `feDropShadow` 滤镜 | ✅ `textShadow` / 装饰圆 | 增强视觉层级 |
| 消灭「无封面」 | ✅ ShareViewModal、SharePageClient | — | 文字 fallback 全部替换为增强封面 |

**核心文件**：
- `apps/web/src/lib/coverTemplates.ts` — Web 端 SVG 模板 + 哈希配色 + 首字提取
- `apps/mobile/src/lib/coverTemplates.ts` — 移动端配色 + Ionicons 图标映射
- `apps/web/src/lib/platforms.ts` — `generateDefaultCover()` 增强版入口
- `apps/mobile/src/lib/platforms.ts` — `getDefaultCoverStyle()` RN 组件样式入口

### 5.9 国际化模块（i18n）

| 功能 | Web | 移动端 | 状态 |
|------|-----|--------|------|
| 中英文切换 | ✅ 设置页下拉框 | ✅ 个人中心选项 | ✅ 已上线 |
| 语言持久化 | ✅ localStorage | ✅ AsyncStorage | ✅ 已上线 |
| 翻译 key 覆盖 | ~280+ keys | ~220+ keys | ✅ 已上线 |
| 参数插值 | ✅ {param} | ✅ {param} | ✅ 已上线 |
| 回退机制 | ✅ 回退到 zh | ✅ 回退到 zh | ✅ 已上线 |

### 5.10 深色模式

Web 端 Tailwind CSS 配置 `darkMode: 'class'`，全局组件已覆盖 `dark:` 样式类。 ✅ 已上线

### 5.11 PWA 支持

Web 端已启用 PWA：安装 `@ducanh2912/next-pwa`，配置 Service Worker + Workbox 离线缓存（Google Fonts、静态资源、next/image），`manifest.json` 已有图标和主题色。 ✅ 已上线

---

## 六、数据库模型

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

共 **9 张**数据表。

---

## 七、关键数字汇总

| 指标 | 数值 |
|------|------|
| API 路由总数 | **52 个** |
| Web 页面总数 | **13 个** |
| 移动端页面总数 | **14 个** |
| Web 公共组件 | 20+ 个 |
| 支持平台数 | **覆盖主流平台**（内部 S/A/B/C 四级分级管理） |
| 平台品类数 | 18 个 |
| 短链域名数 | 27 个 |
| 数据库表 | **9 张** |
| i18n 翻译 key（Web） | ~280+ |
| i18n 翻译 key（移动端） | ~220+ |
| 支持语言 | 中文 / English |
| 错误码总数 | 55+ |
| 估计总代码行数 | ~25,000 行 |

---

## 八、已下线/隐藏功能清单

以下功能代码保留或未启用，不对用户开放：

| 功能 | 说明 |
|------|------|
| **LCST: 分享码** | 早期短码格式已取消，统一使用完整链接 `/s/:shareId` |
| **分享广场** | `/plaza` 路由已禁用，相关同步逻辑已移除 |
| **订阅功能** | 仅保留一键导入（`POST /subscriptions/import`），其余订阅路由已下线 |
| **手机号登录/注册/换绑** | 独立路由已完全移除，仅 `User` 表 `phone` 字段及少量注释残留 |
| **手机号相关 i18n 文案** | 部分翻译文件中仍保留手机号相关文案，待后续清理 |

---

## 九、项目结构

```
linkchest/
├── apps/
│   ├── api/                  # 后端 API 服务（端口 3001）
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

## 十、部署说明

### 10.1 后端部署

1. 准备 PostgreSQL 和 Redis
2. 设置环境变量（DATABASE_URL, JWT_SECRET, COS 配置等）
3. 执行 `npx prisma migrate deploy`
4. 使用 PM2 管理 `npm start`

### 10.2 网页端部署

1. 设置 `NEXT_PUBLIC_API_URL` 为生产环境 API 地址
2. 执行 `npm run build`
3. 使用 PM2 启动 `npm start`

### 10.3 移动端部署

1. 配置 `apps/mobile/app.json` 中的应用信息
2. 执行 EAS Build 构建 AAB/APK
3. 提交到 Google Play

### 10.4 服务器一键更新

```bash
cd deploy
./update.sh
```

脚本执行：git pull → 数据库迁移 → API 构建重启 → Web 构建重启 → 健康检查。

---

## 十一、性能优化（2026-04-25 完成）

共 12 项优化，按 P0→P3 优先级实施。

### P0 - API 层高频查询优化

| # | 优化项 | 文件 | 说明 |
|---|--------|------|------|
| 1 | 认证中间件 Redis 缓存 | `auth.ts` | 每次请求先查 Redis `lv:user:{id}:safe`（TTL 300s），未命中再查 DB 并写入缓存；Redis 不可用时自动降级 |
| 2 | 配额查询 Redis 缓存 | `quota.ts` | `getQuotaUsage` 增加 Redis 缓存层 `lv:quota:{userId}:usage`（TTL 5s），减少 6 次 `COUNT(*)` 查询；事务场景自动跳过缓存 |
| 3 | 元数据抓取请求中断修复 | `metadata.ts` | `fetchUrlMetadata` 改用 `AbortController` 替代 `Promise.race`，超时后统一 `abort()`；`signal` 穿透至所有子请求函数，消除文件描述符泄漏 |

### P1 - 前端性能与内存

| # | 优化项 | 文件 | 说明 |
|---|--------|------|------|
| 4 | Blob URL 内存泄漏修复 | `coverCache.ts` + `LazyImage.tsx` | `coverCache.ts` 新增 `activeBlobUrls` Map 跟踪活跃 URL，提供 `revokeCachedCover`；`LazyImage` 组件卸载时统一释放所有创建的 blob URL |
| 5 | React Query 缓存策略差异化 | `providers.tsx` | `staleTime` 改为函数式：`platforms` 30 分钟、`tags`/`lists` 5 分钟、动态数据（收藏列表等）1 分钟 |
| 6 | CollectionList 组件拆分 | `CollectionList.tsx` | 提取 `UndoToast` → `UndoToast.tsx`（134 行）、`CollectionDetailModal` → `CollectionDetailModal.tsx`（162 行），主组件职责单一 |
| 7 | 字体加载优化 | `layout.tsx` | LXGW WenKai 改用 `media="print" onload="this.media='all'"` 异步加载，消除字体阻塞首屏渲染 |

### P2 - 构建与数据库

| # | 优化项 | 文件 | 说明 |
|---|--------|------|------|
| 8 | Turbo 构建缓存修复 | `turbo.json` | 移除 `!.next/cache/**` 排除规则，CI 构建可利用 Next.js 增量缓存 |
| 9 | 数据库复合索引补充 | `schema.prisma` | `Collection` 表新增 `@@index([userId, platform])`，覆盖按平台筛选的高频查询 |
| 10 | 健康检查深度增强 | `index.ts` | `/health` 增加 DB（`$queryRaw`）和 Redis（`ping`）连通性检测，异常返回 HTTP 503 |

### P3 - 可选优化

| # | 优化项 | 文件 | 说明 |
|---|--------|------|------|
| 11 | next/image 配置优化 | `next.config.js` | 启用 `formats: ['avif', 'webp']`，`minimumCacheTTL: 7 天`，`remotePatterns` 通配所有 HTTPS 域名 |
| 12 | Prisma 连接池调优 | `prisma.ts` | 显式解析并日志输出 `connection_limit` 和 `pool_timeout`，便于运维排查 |

---

## 十二、后续开发计划

### 高优先级

| # | 功能 | 说明 | 预计工时 | 状态 |
|---|------|------|----------|------|
| 1 | 大数据量虚拟滚动 | 收藏列表大数据量场景下的虚拟滚动优化 | 4h | **待开发** |
| 2 | ~~TypeScript 类型清理~~ | ~~Web 端 `any` 已基本清理；API 端 24 处已清理~~ | ~~4h~~ | **已完成** ✅ |
| 3 | ~~批量操作合并~~ | ~~后端已有 `batch-delete`/`batch-add-tags`/`batch-move-lists`/`batch-update`；前端 CollectionList 编辑模式已接入~~ | ~~4h~~ | **已完成** ✅ |
| 4 | ~~HTML 书签导入上线~~ | ~~Web 端 settings 页面开放 HTML 导入/导出~~ | ~~2h~~ | **已完成** ✅ |

### 中优先级

| # | 功能 | 说明 | 预计工时 | 状态 |
|---|------|------|----------|------|
| 5 | i18n 文案清理 | 移除过时的手机号相关翻译（zh.json 16 处 / en.json 12 处） | 2h | **待开发** |
| 6 | ~~深色模式~~ | ~~Web 端暗色模式完善~~ | ~~4h~~ | **已完成** ✅ |
| 7 | ~~PWA 支持~~ | ~~Web 端 PWA 化~~ | ~~4h~~ | **已完成** ✅ |

### 锦上添花

| # | 功能 | 说明 | 预计工时 | 状态 |
|---|------|------|----------|------|
| 8 | 浏览器扩展 | 一键收藏插件 | 16h | 待开发 |
| 9 | 定期备份 | 导出到云存储 | 8h | 待开发 |
| 10 | 收藏评论/笔记 | 收藏添加评论 | 8h | 待开发 |
| 11 | 收藏评分 | 五星评分系统 | 4h | 待开发 |

---

## 十三、当前服务条款与隐私政策核对

> **重要**：`docs/terms/` 目录下为早期版本（部分表述已过时）。**实际部署版本**位于 `apps/web/public/terms/`，该版本已更新为新加坡法律管辖、新加坡存储等最新表述。以下核对以 `apps/web/public/terms/` 为准。

### 13.1 无需修改的内容（`apps/web/public/terms/` 版本）

| 文档位置 | 核对结果 |
|----------|----------|
| 服务条款 — 适用法律 | ✅ 已更新为**新加坡共和国法律** |
| 服务条款 — 争议解决 | ✅ 已更新为**新加坡国际仲裁中心（SIAC）**或新加坡有管辖权的法院 |
| 隐私政策 — 存储地点 | ✅ 已更新为**新加坡**服务器 |
| 隐私政策 — 法律依据 | ✅ 已更新为新加坡《个人数据保护法》（PDPA） |
| 服务条款 — 邮箱注册/登录 | ✅ 准确（未提及手机号） |
| 服务条款 — 账号注销 | ✅ 准确 |
| 隐私政策 — 联系方式 | ✅ support@linkchest.net |

### 13.2 仍需核对/更新的内容

| 文档位置 | 现有内容 | 实际情况 | 更新方向 |
|----------|----------|----------|----------|
| 服务条款 1.1 / 6.1 — 分享描述 | 提及"LCST: 分享码或对应链接" | LCST: 分享码**已取消**，仅使用完整链接 | 移除 LCST: 提及，统一为"分享链接" |
| 服务条款 2.1 — 平台数量 | 英文版仍写具体数字 | 用户感知界面已**淡化数量** | 统一改为"各大主流平台" |
| 服务条款 — Google 登录 | 未提及 Google 登录 | 已支持 Google 第三方登录 | 补充 Google 登录相关条款 |
| 服务条款 — 认证方式 | 仅提及邮箱 | 当前支持**邮箱 + Google** | 更新认证方式描述 |
| 服务条款 — 付费服务/配额描述 | 描述为"付费会员" | 实际为**配额等级体系**（medium/heavy/super） | 需与实际体系对应 |

### 13.3 文件位置对照

| 文件 | 路径 | 状态 |
|------|------|------|
| 中文服务条款（部署版） | `apps/web/public/terms/terms-of-service-zh.md` | ✅ 已更新（新加坡法律） |
| 英文服务条款（部署版） | `apps/web/public/terms/terms-of-service-en.md` | ✅ 已更新（新加坡法律） |
| 中文隐私政策（部署版） | `apps/web/public/terms/privacy-policy-zh.md` | ✅ 已更新（新加坡存储/PDPA） |
| 英文隐私政策（部署版） | `apps/web/public/terms/privacy-policy-en.md` | ✅ 已更新（新加坡存储/PDPA） |
| 中文服务条款（旧版） | `docs/terms/terms-of-service-zh.md` | ⚠️ 过时，建议删除或归档 |
| 英文服务条款（旧版） | `docs/terms/terms-of-service-en.md` | ⚠️ 过时，建议删除或归档 |
| 中文隐私政策（旧版） | `docs/terms/privacy-policy-zh.md` | ⚠️ 过时，建议删除或归档 |
| 英文隐私政策（旧版） | `docs/terms/privacy-policy-en.md` | ⚠️ 过时，建议删除或归档 |

---

## 十四、版本信息

| 项目 | 内容 |
|------|------|
| 文档版本 | V1.0 |
| 产品版本 | LinkChest V1.0 |
| 文档更新日期 | 2026 年 4 月 28 日 |
| 基于代码版本 | 2026-04-28（含 Google 登录、HTML 导入导出、新加坡存储等） |
| 替代文档 | LinkChest-产品方案文档-v3.1.md、LinkChest-产品方案文档-v4.0.md |
| 用途 | 测试依据 · 产品指导书编写依据 · 服务条款更新依据 |
