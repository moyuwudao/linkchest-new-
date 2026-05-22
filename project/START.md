# LinkChest 启动指南

## 环境要求

- Node.js >= 18
- Docker (用于本地数据库和 Redis)
- npm 或 yarn

## 快速启动

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

# 编辑 .env 文件，根据需要进行修改
# 必填项：DATABASE_URL, JWT_SECRET
# 选填项：COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET（封面上传功能）
```

### 3. 初始化数据库

```bash
# 安装根目录依赖
npm install

# 生成 Prisma 客户端
cd apps/api && npx prisma generate

# 执行数据库迁移
npx prisma migrate dev

# （可选）导入测试数据
npx prisma db seed
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

## 测试账号

开发环境可使用邮箱注册并登录（验证码将发送至邮箱）。

## 项目结构

```
linkchest/
├── apps/
│   ├── api/                  # 后端 API (Node.js + Express)
│   │   ├── prisma/           # 数据库模型和迁移
│   │   └── src/
│   │       ├── routes/       # API 路由模块 (10个, 52个端点)
│   │       ├── services/     # 业务逻辑
│   │       ├── lib/          # 工具、配置、错误码
│   │       └── middleware/   # 中间件
│   ├── mobile/               # 安卓应用 (React Native + Expo)
│   └── web/                  # 网页端 (Next.js, 端口3003)
├── deploy/                   # 部署脚本和 Nginx 配置
├── docker-compose.yml        # 本地开发环境 (PostgreSQL + Redis)
└── package.json              # 根项目配置 (workspaces: apps/*)
```

## 常用命令

```bash
# 根目录命令
npm run dev:api      # 启动后端
npm run dev:web      # 启动网页端
npm run dev:mobile   # 启动移动端
npm run build        # 全量构建

# 数据库命令（在 apps/api 目录下执行）
npx prisma studio         # 打开数据库管理界面
npx prisma migrate dev    # 创建迁移
npx prisma migrate deploy # 部署迁移（生产环境）
npx prisma generate       # 生成 Prisma Client
npx prisma db seed        # 导入种子数据
```

## 部署说明

### 后端部署

1. 准备 PostgreSQL 和 Redis
2. 设置环境变量 (DATABASE_URL, JWT_SECRET, COS 配置等)
3. 执行 `npx prisma migrate deploy`
4. 使用 `npm run build && npm start` 启动，或 PM2 管理

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

## 注意事项

1. 开发时确保手机和电脑在同一网络，以便移动端访问后端
2. 修改 `apps/mobile/src/lib/api.ts` 中的 `API_BASE_URL` 为实际 IP 地址
3. 生产环境务必修改 JWT_SECRET、数据库密码和 COS 密钥
