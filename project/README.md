# LinkChest - 跨平台收藏聚合工具

一款跨平台收藏聚合管理工具，帮助用户集中存储、整理、检索来自各大平台的好内容，并可生成公开网页链接分享给朋友。

## 产品形态

- **安卓 APP**: 主要使用入口，支持添加、管理、分享收藏
- **网页管理后台**: 电脑端管理收藏，支持嵌套分组、批量操作
- **公开分享页**: 无需登录即可查看分享的收藏列表，支持密码保护和有效期

## 技术栈

- **后端**: Node.js + Express + TypeScript + Prisma ORM
- **数据库**: PostgreSQL
- **对象存储**: 腾讯云 COS（封面图片）
- **缓存**: Redis（元数据缓存、URL 签名缓存）
- **安卓 APP**: React Native + Expo SDK 51
- **网页端**: Next.js 14 + React + Tailwind CSS + shadcn/ui
- **认证**: JWT (7天有效期) + 邮箱 + 密码 / Google 登录（验证码仅用于注册和重置密码）
- **部署**: PM2 + Nginx + Docker Compose

## 项目结构

```
linkchest/
├── apps/
│   ├── api/                  # 后端 API 服务 (端口 3001)
│   │   ├── prisma/           # 数据库 schema 和迁移
│   │   └── src/
│   │       ├── routes/       # API 路由 (10 个模块, 52 个端点)
│   │       ├── services/     # 业务逻辑 (平台识别、元数据抓取、配额、上传)
│   │       ├── lib/          # 工具函数、配置、错误码定义
│   │       └── middleware/   # 认证、限流等中间件
│   ├── mobile/               # React Native 安卓应用 (Expo)
│   └── web/                  # Next.js 网页端 (端口 3003)
├── deploy/                   # 部署脚本和 Nginx 配置
├── docker-compose.yml        # 本地开发环境 (PostgreSQL + Redis)
├── package.json              # 根项目配置 (workspaces: apps/*)
└── turbo.json                # Turbo 构建配置
```

## 快速开始

### 1. 启动数据库

```bash
# 在项目根目录执行
docker-compose up -d
```

这将启动 PostgreSQL 和 Redis。

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp apps/api/.env.example apps/api/.env

# 编辑 .env 文件，配置以下必填项：
# - DATABASE_URL
# - JWT_SECRET
# - COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET (如需封面上传)
```

### 3. 初始化数据库

```bash
# 安装根目录依赖
npm install

# 生成 Prisma 客户端
cd apps/api && npx prisma generate

# 执行数据库迁移
npx prisma migrate dev
```

### 4. 启动后端服务

```bash
cd apps/api
npm install
npm run dev
```

后端服务将在 http://localhost:3001 运行

### 5. 启动网页端

```bash
cd apps/web
npm install
npm run dev
```

网页端将在 http://localhost:3003 运行

### 6. 启动移动端

```bash
cd apps/mobile
npm install
npx expo start
```

使用 Expo Go App 扫描二维码在手机上预览，或按 `a` 在安卓模拟器中运行。

## 访问应用

- **网页管理后台**: http://localhost:3003
- **后端 API**: http://localhost:3001
- **API 文档**: 各路由模块内嵌 Swagger 注释（如已配置）

## 常用命令

```bash
# 根目录命令
npm run dev:api      # 启动后端
npm run dev:web      # 启动网页端
npm run dev:mobile   # 启动移动端
npm run build        # 全量构建

# 数据库命令（需在 apps/api 目录下）
npx prisma studio        # 打开数据库管理界面
npx prisma migrate dev   # 创建迁移
npx prisma generate      # 生成 Prisma Client
```

## 功能特性

- ✅ 统一管理多平台收藏（覆盖主流视频、社交、电商等平台）
- ✅ 标签、分组（支持 3 级嵌套）、备注灵活整理
- ✅ 智能解析 URL 和分享文本，自动抓取元数据
- ✅ 一键生成分享链接，支持密码保护和有效期
- ✅ 配额系统控制用户资源使用上限
- ✅ COS 封面上传和自动压缩
- ✅ 中英文双语国际化
- ✅ 数据导入/导出（CSV / JSON / HTML 书签格式）
- ✅ 跨设备数据同步

## 部署说明

### 后端部署

1. 准备 PostgreSQL 和 Redis
2. 设置环境变量（DATABASE_URL, JWT_SECRET, COS 配置等）
3. 执行 `npx prisma migrate deploy`
4. 使用 `npm run build && npm start` 启动，或 PM2 管理

### 网页端部署

1. 设置 `NEXT_PUBLIC_API_URL` 为生产环境 API 地址
2. 执行 `npm run build`
3. 使用 PM2 启动 `npm start`，或部署到静态托管服务

### 移动端部署

1. 配置 `apps/mobile/app.json` 中的应用信息
2. 执行 `npx expo build:android` 或 EAS Build 构建 AAB/APK
3. 提交到 Google Play 或分发 APK

### 服务器一键更新

```bash
# 使用部署脚本
cd deploy
./update.sh
```

脚本执行：git pull → 数据库迁移 → API 构建重启 → Web 构建重启 → 健康检查

## 注意事项

1. 开发时确保手机和电脑在同一网络，以便移动端访问后端
2. 修改 `apps/mobile/src/lib/api.ts` 中的 `API_BASE_URL` 为实际 IP 地址
3. 生产环境务必修改 JWT_SECRET、数据库密码和 COS 密钥
4. 验证码在开发环境明文返回便于调试，生产环境请勿明文记录

## 版本规划

- **V1.0 (当前)**: 平台覆盖、配额系统、COS 上传、错误码标准化、隐私政策、嵌套分组、Google 登录、HTML 书签导入导出、深色模式、PWA 支持、性能优化
