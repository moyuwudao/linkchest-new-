# LinkChest 项目架构文档

> **版本**: 1.1.0  
> **描述**: 跨平台收藏聚合工具  
> **最后更新**: 2026-06-06

---

## 1. 项目概述

LinkChest 是一个跨平台收藏聚合工具，允许用户收藏来自抖音、小红书、B站、YouTube 等多个内容平台的链接，并提供智能元数据抓取、标签分类、分组管理、分享广场、会员订阅等完整功能。

### 1.1 核心价值

- **多平台统一收藏**: 支持主流内容平台，自动识别来源并提取元数据
- **智能封面系统**: 支持 URL 封面、平台品牌色、AI 生成三种策略
- **分享与订阅**: 用户可创建分享页面，其他用户可订阅同步
- **三级会员体系**: medium（免费）/ heavy（专业版）/ super（旗舰版）

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                       客户端层                           │
├──────────┬──────────┬──────────────┬────────────────────┤
│   Web    │  Mobile  │   Chrome     │    分享页面         │
│ Next.js  │  Expo    │   Extension  │   (公开访问)        │
│ :3003    │  RN 0.74 │   Vite       │                    │
└────┬─────┴────┬─────┴──────┬───────┴────────┬───────────┘
     │          │            │                │
     ▼          ▼            ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    Nginx 反向代理                         │
└──────────────────────┬──────────────────────────────────┘
                       │
     ┌─────────────────┼─────────────────┐
     ▼                                   ▼
┌──────────────┐                ┌──────────────────┐
│   API 服务    │                │  Cloudflare      │
│  Express.js  │                │  Worker          │
│  TypeScript  │                │  (元数据降级)     │
│  :3000       │                │                  │
└──┬───┬───┬──┘                └──────────────────┘
   │   │   │
   ▼   │   ▼
┌──────┐ ┌─────────┐
│ PG16 │ │ Redis 7 │
│Prisma│ │ ioredis │
└──────┘ └─────────┘
```

---

## 3. Monorepo 结构

采用 **npm workspaces + Turborepo** 管理多包。

```
project/
├── apps/                        # 应用层
│   ├── api/                     # 后端 API 服务
│   ├── web/                     # Web 前端
│   ├── mobile/                  # 移动端 App
│   ├── chrome-extension/        # Chrome 浏览器扩展
│   └── build-apk/               # APK 构建产物
│       ├── china/               # 国内版 (debug/release)
│       └── global/              # 国际版 (debug/release)
│
├── packages/                    # 共享包
│   └── i18n/                    # 国际化 (错误码 + 6语言翻译)
│
├── workers/                     # Serverless Workers
│   └── metadata-fetcher/        # Cloudflare Worker 元数据抓取
│
├── deploy/                      # 部署与运维
│   ├── ecosystem.config.js      # PM2 进程配置
│   ├── nginx/                   # Nginx 配置
│   ├── *.sh                     # 部署/运维脚本
│   └── web-env/                 # Web 环境变量
│
├── scripts/                     # 工具脚本
│   ├── check-*.js               # 各类检查脚本
│   ├── generate-*.js            # 图标/翻译/隐私政策生成
│   ├── deploy-*.ps1/.bat        # 部署脚本
│   └── fix-*.js/py              # 修复脚本
│
├── assets/                      # 静态资源
├── docs/                        # 文档
├── turbo.json                   # Turborepo 配置
├── docker-compose.yml           # 本地开发 (PG + Redis)
├── docker-compose.cn.yml        # 国内部署
└── package.json                 # 根配置
```

---

## 4. 技术栈详情

### 4.1 后端 API (`apps/api`)

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Express.js | ^4.18.2 | HTTP 服务框架 |
| 语言 | TypeScript | ^5.3.0 | 类型安全 |
| ORM | Prisma | ^5.7.0 | 数据库访问层 |
| 数据库 | PostgreSQL | 16-alpine | 主数据存储 |
| 缓存 | Redis 7 + ioredis | ^5.10.1 | 会话/缓存/队列 |
| 日志 | Pino | ^10.3.1 | 结构化日志 |
| 监控 | prom-client | ^15.1.3 | Prometheus 指标 |
| 安全 | Helmet + Rate Limit | - | 安全头 + 限流 |
| 对象存储 | cos-nodejs-sdk-v5 | ^2.14.6 | 腾讯云 COS |
| 邮件 | tencentcloud-sdk | ^4.1.238 | 腾讯云 SES |
| 推送 | jpush-async | ^4.2.0 | 极光推送 |
| 定时任务 | node-cron | ^3.0.3 | 封面清理/告警扫描 |
| 图片处理 | sharp | ^0.33.1 | 封面裁剪/压缩 |
| 网页解析 | cheerio + ogs | - | HTML 元数据提取 |
| 分布式锁 | redlock | ^4.2.0 | Redis 分布式锁 |
| 测试 | Jest + Supertest | - | 单元/集成测试 |

### 4.2 Web 前端 (`apps/web`)

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Next.js (App Router) | 14.1.0 | SSR/SSG 全栈框架 |
| UI | React | ^18.2.0 | 组件化 UI |
| 样式 | Tailwind CSS | ^3.4.19 | 原子化 CSS |
| 动画 | Framer Motion | ^12.38.0 | 交互动画 |
| 状态 | TanStack React Query | ^5.17.0 | 服务端状态管理 |
| 持久化 | query-persist-client | ^5.100.9 | 查询缓存持久化 |
| 虚拟列表 | TanStack Virtual | ^3.0.0 | 大数据列表渲染 |
| 图标 | Lucide React | ^0.303.0 | SVG 图标库 |
| 支付 | @stripe/stripe-js | ^4.10.0 | Stripe 前端集成 |
| OAuth | @react-oauth/google | ^0.13.5 | Google 登录 |
| PWA | next-pwa + Workbox | - | 渐进式 Web 应用 |

### 4.3 移动端 (`apps/mobile`)

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React Native | 0.74.0 | 跨平台移动开发 |
| 工具链 | Expo | ~51.0.0 | 开发/构建/发布 |
| 导航 | React Navigation | ^6.x | 页面导航 (Tabs + Stack) |
| 状态 | Zustand | ^4.4.7 | 轻量状态管理 |
| 状态 | TanStack React Query | ^5.17.0 | 服务端状态 |
| 推送 | Firebase Messaging | ^21.0.0 | FCM 推送 |
| 推送 | jpush-react-native | ^3.2.7 | 极光推送 |
| 微信 | react-native-wechat-lib | ^3.0.4 | 微信登录/分享 |
| 安全 | expo-secure-store | ~13.0.0 | 安全存储 (Token) |
| 通知 | expo-notifications | ~0.28.0 | 本地通知 |
| 剪贴板 | expo-clipboard | ~6.0.0 | 剪贴板读取 |

### 4.4 Chrome 扩展 (`apps/chrome-extension`)

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 构建 | Vite | ^5.0.0 | 快速构建 |
| UI | React | ^18.2.0 | Popup/Options 页面 |
| 通信 | axios | ^1.6.2 | API 调用 |
| 后台 | Service Worker | - | 后台任务处理 |
| 注入 | Content Script | - | 页面元数据提取 |

### 4.5 Cloudflare Worker (`workers/metadata-fetcher`)

| 类别 | 技术 | 用途 |
|------|------|------|
| 运行时 | Cloudflare Workers | 边缘计算 |
| 工具 | Wrangler | 开发/部署 |
| 缓存 | KV Namespace | 元数据缓存 |
| 限制 | 100,000 次/天 | 免费套餐 |

### 4.6 共享包 (`packages/i18n`)

| 内容 | 说明 |
|------|------|
| errorCodes.ts | 统一错误码定义 |
| error.zh/en/ja/ko/fr/de.ts | 6语言错误消息 |
| index.ts | 导出 + i18n 工具函数 |

---

## 5. 数据模型 (Prisma Schema)

### 5.1 ER 关系图

```
User (用户)
 ├── Collection (收藏) ── Tag (标签)     [多对多]
 │    │                   List (分组)     [多对多, 支持3层嵌套]
 │    └── ShareItem (分享快照)
 │           └── Share (分享)
 │                ├── ShareSubscription (订阅)
 │                └── ShareView (浏览记录)
 ├── CoverImage (封面图片)
 ├── Subscription (付费订阅)
 ├── ReferralCode (邀请码) ── ReferralUse (邀请记录)
 ├── PushToken (推送Token)
 └── Backup (备份记录)

SystemCover (系统封面库)    [独立表]
ErrorEvent (错误事件)       [运维]
AlertRule (告警规则) ── AlertHistory (告警历史)
TierConfig (等级配置)       [medium/heavy/super]
```

### 5.2 表结构概览

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 用户表 | 多渠道ID、会员等级(userTier)、语言偏好(lang)、封禁管理 |
| `collections` | 收藏表 | url、title、platform、pageType、rating、coverStrategy、deletedAt(软删除) |
| `tags` | 标签表 | nameCn、nameEn、sortOrder（中英双语） |
| `lists` | 分组表 | parentId、depth(0-2)、sourceShareId(订阅导入) |
| `shares` | 分享表 | type(ALL/LIST/TAG/...)、password、isPlaza(广场)、allowSync(订阅) |
| `share_items` | 分享快照表 | 创建时复制收藏元数据，独立于收藏增删改 |
| `cover_images` | 封面图片表 | cosKey、cosUrl、签名URL过期管理 |
| `system_covers` | 系统封面表 | 预置封面库 |
| `share_subscriptions` | 分享订阅表 | userId + shareId 唯一 |
| `share_views` | 分享浏览表 | UV 统计、来源追踪 |
| `error_events` | 错误事件表 | 聚合计数、状态流转(pending→confirmed→fixed→ignored) |
| `alert_rules` | 告警规则表 | error_rate/error_count/response_time/service_down |
| `alert_history` | 告警历史表 | 通道发送结果 |
| `tier_configs` | 等级配置表 | quotaConfig、pricingConfig、benefits |
| `subscriptions` | 订阅记录表 | 多支付源、价格(分/美分)、到期管理 |
| `referral_codes` | 邀请码表 | 6位码、maxUses、过期管理 |
| `referral_uses` | 邀请记录表 | 奖励天数、防重复奖励 |
| `push_tokens` | 推送Token表 | jpush/fcm/expo 多平台 |
| `backups` | 备份历史表 | auto/manual、json/csv/html、COS 存储 |

---

## 6. API 路由架构

### 6.1 路由清单

| 路由前缀 | 模块 | 限流策略 | 认证 | 说明 |
|----------|------|----------|------|------|
| `/api/auth` | auth.ts | 认证限流(严格) | 可选 | 注册/登录/第三方认证 |
| `/api/collections` | collections.ts | 导入限流(严格) | JWT | 收藏 CRUD + 批量导入 |
| `/api/tags` | tags.ts | 全局限流 | JWT | 标签管理 |
| `/api/lists` | lists.ts | 全局限流 | JWT | 分组管理(嵌套) |
| `/api/shares` | shares.ts | 全局限流 | JWT | 分享创建/管理 |
| `/api/stats` | stats.ts | 全局限流 | JWT | 用户统计数据 |
| `/api/upload` | upload.ts | 全局限流 | JWT | 文件上传(COS) |
| `/api/quota` | quota.ts | 全局限流 | JWT | 配额查询 |
| `/api/subscriptions` | share-imports.ts | 全局限流 | JWT | 订阅导入 |
| `/api/subscription` | subscription-plans.ts | 全局限流 | JWT | 订阅计划 |
| `/api/tiers` | tiers.ts | 全局限流 | JWT | 等级信息 |
| `/api/users` | users.ts | 全局限流 | JWT | 用户信息管理 |
| `/api/backups` | backup.ts | 全局限流 | JWT | 数据备份/恢复 |
| `/api/referrals` | referrals.ts | 全局限流 | JWT | 邀请系统 |
| `/api/payments/paypal` | payments/paypal.ts | 全局限流 | JWT | PayPal 支付 |
| `/api/payments/wechat` | payments/wechat.ts | 全局限流 | JWT | 微信支付 |
| `/api/payments/alipay` | payments/alipay.ts | 全局限流 | JWT | 支付宝支付 |
| `/api/payments/apple` | payments/appleIAP.ts | 全局限流 | JWT | Apple IAP |
| `/api/payments/google` | payments/googlePay.ts | 全局限流 | JWT | Google Pay |
| `/api/payments/google-play` | payments/googlePlayBilling.ts | 全局限流 | JWT | Google Play Billing |
| `/api/market` | market.ts | 全局限流 | JWT | 市场功能 |
| `/api/admin` | admin.ts | 全局限流 | Admin | 管理后台(独立认证) |
| `/s` & `/api/s` | public.ts | 分享限流(宽松) | 无 | 公开分享页面 |
| `/health` | index.ts | 跳过限流 | 无 | 健康检查(DB+Redis) |

### 6.2 中间件链

```
请求 → requestTimeout → requestTracker → compression → CORS → Helmet
     → express.json → globalLimiter → [路由限流] → [auth] → 路由处理
     → routeErrorHandler → express error handler
```

### 6.3 认证提供商

| 提供商 | 文件 | 说明 |
|--------|------|------|
| 邮箱/密码 | `providers/auth/email.ts` | bcrypt 哈希 |
| Google | `providers/auth/google.ts` | OAuth 2.0 |
| Apple | `providers/auth/apple.ts` | Sign In with Apple |
| 微信 | `providers/auth/wechat.ts` | 微信开放平台 |
| 支付宝 | `providers/auth/alipayAuth.ts` | 支付宝 OAuth |

### 6.4 支付提供商

| 提供商 | 文件 | 货币 | 说明 |
|--------|------|------|------|
| PayPal | `providers/payment/paypal.ts` | USD/CNY | 国际支付 |
| 微信支付 | `providers/payment/wechatPay.ts` | CNY | 国内支付 |
| 支付宝 | `providers/payment/alipay.ts` | CNY | 国内支付 |
| Apple IAP | `providers/payment/appleIAP.ts` | USD | iOS 内购 |
| Google Pay | `providers/payment/googlePay.ts` | USD | Web 支付 |
| Google Play | `providers/payment/googlePlayBilling.ts` | USD | Android 内购 |

---

## 7. 前端页面结构

### 7.1 Web 端 (Next.js App Router)

```
app/
├── layout.tsx              # 根布局 (字体、全局Provider)
├── page.tsx → (main)/page.tsx  # 首页(收藏列表)
├── (main)/                 # 主布局(需登录)
│   ├── account/            # 账户设置
│   ├── collections/        # 收藏详情
│   ├── lists/              # 分组管理
│   ├── manage/             # 批量管理
│   ├── settings/           # 应用设置
│   ├── shares/             # 分享管理
│   ├── tags/               # 标签管理
│   ├── tier/               # 会员等级
│   └── trash/              # 回收站
├── add/                    # 添加收藏
├── edit/[id]/              # 编辑收藏
├── login/                  # 登录页
├── admin/                  # 管理后台
│   ├── alerts/             # 告警管理
│   ├── errors/             # 错误日志
│   ├── logs/               # 系统日志
│   ├── server-monitor/     # 服务器监控
│   ├── tiers/              # 等级配置
│   └── users/              # 用户管理
├── download/               # 下载页
├── privacy/                # 隐私政策
├── terms/                  # 服务条款
├── refund/                 # 退款政策
└── s/[shareId]/            # 公开分享页面
```

### 7.2 移动端屏幕

| 屏幕 | 文件 | 说明 |
|------|------|------|
| 登录 | LoginScreen | 多方式登录 |
| 收藏列表 | CollectionsScreen | 主列表 |
| 收藏详情 | CollectionDetailScreen | 详情查看 |
| 添加/编辑 | CollectionFormScreen | 表单 |
| 分组 | ListsScreen | 分组管理 |
| 标签 | TagManageScreen | 标签管理 |
| 分享 | ShareDetailScreen / CreateShareScreen | 分享 |
| 会员 | TierScreen / TierUpgradeScreen | 会员升级 |
| 回收站 | TrashScreen | 软删除 |
| 设置 | AccountSettingsScreen | 账户设置 |
| 备份 | AutoBackupScreen / ExportScreen | 数据备份 |
| 管理 | ManagementScreen | 批量管理 |

### 7.3 Chrome 扩展

| 组件 | 文件 | 说明 |
|------|------|------|
| Popup | popup/Popup.tsx | 弹出窗口(快速收藏) |
| Options | options/Options.tsx | 设置页面 |
| Background | background/service-worker.ts | 后台服务 |
| Content | content/metadata-extractor.ts | 页面元数据提取 |

---

## 8. 核心服务模块

### 8.1 元数据服务 (`services/metadata.ts`)

负责从 URL 抓取标题、封面、平台等信息：
- 直接 HTTP 抓取 (cheerio + open-graph-scraper)
- Cloudflare Worker 降级 (反爬平台)
- 平台特殊处理 (`services/platforms.ts` - 907行)
- 页面类型分类 (`services/pageClassifier.ts`)
- 异步队列消费 (`services/metadata-queue.ts` - Redis 持久化)

### 8.2 封面服务 (`services/cover.ts`)

- 封面下载 & 上传到 COS
- 三种策略: URL 封面 / 平台品牌色(brand) / AI 生成
- 签名 URL 过期管理
- 定期清理过期封面

### 8.3 配额服务 (`services/quota.ts`)

根据用户等级(medium/heavy/super)控制资源上限：
- 收藏数量、标签数量、分组数量
- 分享数量、分享条目数量、封面图片数量
- 从 `TierConfig` 表动态读取

### 8.4 订阅服务 (`services/subscription.ts`)

- 订阅创建/续费/取消
- 到期自动降级
- 用户等级自动计算 (userTier 字段)

### 8.5 推送服务 (`services/push.ts`)

- 极光推送 (JPush) 集成
- FCM 推送支持
- 推送 Token 管理

### 8.6 告警引擎 (`services/alerting.ts`)

- 15分钟定时扫描
- 支持规则: 错误率、错误计数、响应时间、服务宕机
- 多通道推送: 邮件、飞书、企业微信
- 冷却时间 + 静默时段

### 8.7 分享解析器 (`services/share-parser.ts`)

- 分享链接生成 & 解析
- 分享快照创建
- 订阅同步逻辑

### 8.8 定时任务 (`services/scheduler.ts`)

- 封面清理 (node-cron)
- 告警扫描
- 订阅过期检查

---

## 9. 国际化方案

### 9.1 架构

```
packages/i18n (共享包)
├── src/errorCodes.ts        # 错误码枚举定义
├── src/index.ts             # i18n 工具函数 + 导出
└── src/locales/
    ├── error.zh.ts          # 中文错误消息
    ├── error.en.ts          # 英文错误消息
    ├── error.ja.ts          # 日文错误消息
    ├── error.ko.ts          # 韩文错误消息
    ├── error.fr.ts          # 法文错误消息
    └── error.de.ts          # 德文错误消息

apps/web/lib/locales/        # Web 端 UI 翻译 (JSON)
apps/mobile/lib/locales/     # 移动端 UI 翻译 (JSON)
```

### 9.2 支持语言

| 代码 | 语言 | 说明 |
|------|------|------|
| zh | 中文 | 默认语言 |
| en | English | 国际版 |
| ja | 日本語 | 日本市场 |
| ko | 한국어 | 韩国市场 |
| fr | Français | 法语市场 |
| de | Deutsch | 德语市场 |

---

## 10. 部署架构

### 10.1 生产环境

```
┌────────────────────────────────────────┐
│          4核8G Linux 服务器              │
│                                        │
│  ┌─────────┐  ┌──────────────────────┐ │
│  │  Nginx   │  │  Docker              │ │
│  │  反向代理 │  │  ├── PostgreSQL 16   │ │
│  │  SSL终止  │──│  ├── Redis 7         │ │
│  └─────────┘  └──────────────────────┘ │
│                                        │
│  ┌─────────────────────────────────┐   │
│  │  PM2 进程管理                    │   │
│  │  ├── linkchest-api (Express)    │   │
│  │  └── linkchest-web (Next.js)    │   │
│  └─────────────────────────────────┘   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│          Cloudflare                     │
│  └── metadata-fetcher Worker           │
│      (KV 缓存, 10万次/天)              │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│          腾讯云                         │
│  ├── COS 对象存储 (封面/备份)           │
│  ├── SES 邮件服务                      │
│  └── 内容审核 API                      │
└────────────────────────────────────────┘
```

### 10.2 进程管理 (PM2)

```javascript
// ecosystem.config.js
apps: [
  { name: 'linkchest-api', max_memory_restart: '3G' },
  { name: 'linkchest-web', max_memory_restart: '3G' },
]
```

### 10.3 本地开发

```bash
# 启动基础设施
docker-compose up -d        # PostgreSQL + Redis

# 启动各服务
npm run dev:api             # API 服务 (tsx watch)
npm run dev:web             # Web 前端 (Next.js :3003)
npm run dev:mobile          # 移动端 (Expo)
npm run dev:chrome-extension # Chrome 扩展 (Vite)
```

---

## 11. 安全机制

### 11.1 认证与授权

- **JWT Token**: 访问令牌 + 刷新令牌
- **Admin Auth**: 独立管理后台认证 (`middleware/adminAuth.ts`)
- **OAuth**: Google/Apple/微信/支付宝 第三方登录
- **密码**: bcrypt 哈希存储

### 11.2 限流策略

| 策略 | 窗口 | 上限 | 适用路由 |
|------|------|------|----------|
| 全局限流 | 15分钟 | 可配置 | 所有 API |
| 认证限流 | 15分钟 | 更严格 | `/api/auth` |
| 导入限流 | 可配置 | 更严格 | `/api/collections/import` |
| 分享限流 | 1分钟 | 200次/IP | `/s`, `/api/s` |

### 11.3 安全措施

- **Helmet**: CSP、X-Frame-Options 等安全头
- **CORS**: 白名单来源控制
- **Rate Limiting**: 多层限流防暴力破解
- **内容审核**: 腾讯云内容安全 API (`middleware/contentModeration.ts`)
- **市场守卫**: `middleware/marketGuard.ts` 市场功能访问控制
- **请求超时**: 30秒默认超时防挂死

---

## 12. 运维监控

### 12.1 日志体系

- **Pino**: 结构化 JSON 日志
- **请求追踪**: `middleware/requestTracker.ts` (请求ID、耗时)
- **日志读取**: `services/logReader.ts` (管理后台查看)

### 12.2 指标监控

- **Prometheus**: `services/prom-metrics.ts` (自定义指标)
- **指标采集**: `services/metrics.ts` (请求计数、延迟、错误率)
- **远程指标**: `services/remoteMetrics.ts`

### 12.3 告警系统

- **规则引擎**: `services/alerting.ts` (4类规则)
- **多通道**: 邮件、飞书、企业微信
- **冷却 & 静默**: 防止告警风暴

### 12.4 备份系统

- **自动备份**: 定时自动备份到 COS
- **手动备份**: 支持 JSON/CSV/HTML 格式
- **备份历史**: `backups` 表记录所有备份

---

## 13. 会员与支付体系

### 13.1 等级定义

| 等级 | 名称 | 说明 |
|------|------|------|
| medium | 基础版 | 免费用户，基础配额 |
| heavy | 专业版 | 付费用户，扩展配额 |
| super | 旗舰版 | 高级付费，最大配额 |

### 13.2 等级自动计算

```
userTier 计算逻辑:
- super 有效 → "super"
- super 过期但 heavy 有效 → "heavy"
- 其他 → "medium"
```

### 13.3 支付渠道矩阵

| 渠道 | Web | iOS | Android | 国内 | 国际 |
|------|-----|-----|---------|------|------|
| PayPal | ✓ | - | - | - | ✓ |
| 微信支付 | ✓ | - | - | ✓ | - |
| 支付宝 | ✓ | - | - | ✓ | - |
| Apple IAP | - | ✓ | - | ✓ | ✓ |
| Google Pay | ✓ | - | - | - | ✓ |
| Google Play | - | - | ✓ | - | ✓ |
| Stripe | ✓ | - | - | - | ✓ |

---

## 14. 关键配置

### 14.1 环境变量

```bash
# 数据库
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# 认证
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
APPLE_CLIENT_ID=...
WECHAT_APP_ID=...

# 云服务
COS_SECRET_ID=...
COS_SECRET_KEY=...
COS_BUCKET=...
TENCENT_SECRET_ID=...

# 支付
PAYPAL_CLIENT_ID=...
STRIPE_SECRET_KEY=...
WECHAT_PAY_MCH_ID=...
ALIPAY_APP_ID=...

# 推送
JPUSH_APP_KEY=...
JPUSH_MASTER_SECRET=...

# Cloudflare
CLOUDFLARE_WORKER_URL=...

# 管理后台
ADMIN_SECRET=...
```

### 14.2 构建命令

```bash
npm run build                    # Turborepo 全量构建
cd apps/api && npm run build     # API (tsc)
cd apps/web && npm run build     # Web (next build)
cd apps/mobile && eas build      # Mobile (EAS Build)
cd apps/chrome-extension && npm run build  # Extension (vite build)
cd workers/metadata-fetcher && npm run deploy  # Worker (wrangler deploy)
```
