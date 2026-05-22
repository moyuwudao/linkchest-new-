---
alwaysApply: false
description: 项目感知规则 - 帮助快速理解项目结构、技术栈和开发环境
---

# PROJECT_SENSE.md — 项目感知规则

> 本文档帮助快速理解 LinkChest 项目结构和技术栈，是新开发者的入门指南。

---

## 1. 项目概览

### 1.1 项目定位
LinkChest 是一款**跨平台收藏聚合管理工具**，帮助用户集中存储、整理、检索来自各大平台的好内容，并可生成公开网页链接分享给朋友。

### 1.2 产品形态
| 产品 | 说明 | 技术栈 |
|------|------|--------|
| **安卓 APP** | 主要使用入口，支持添加、管理、分享收藏 | React Native + Expo SDK 51 |
| **网页管理后台** | 电脑端管理收藏，支持嵌套分组、批量操作 | Next.js 14 + React + Tailwind CSS |
| **公开分享页** | 无需登录即可查看分享的收藏列表 | Next.js SSR |
| **Chrome 扩展** | 快速收藏网页内容 | React + Vite |

---

## 2. 项目结构

### 2.1 目录结构
```
linkchest/
├── .trae/                    # TRAE 配置和规则文档
│   └── rules/                # 规则文档目录
│       ├── SOUL.md           # AI 助手身份与基调
│       ├── USER.md           # 开发者画像与偏好
│       ├── INTERACTION.md    # 交互基础规则
│       ├── RED_LINES.md      # 安全红线规则
│       └── ...
└── project/                  # 实际项目代码
    ├── apps/                 # 应用目录（4个子项目）
    │   ├── api/              # 后端 API 服务 (端口 3001)
    │   ├── web/              # Next.js 网页端 (端口 3003)
    │   ├── mobile/           # React Native 移动端
    │   └── chrome-extension/ # Chrome 浏览器扩展
    ├── packages/             # 共享包
    │   └── i18n/             # 国际化包
    ├── docker-compose.yml    # 本地开发环境配置
    ├── package.json          # 根项目配置 (monorepo)
    └── turbo.json            # Turbo 构建配置
```

### 2.2 应用职责边界

| 应用 | 职责 | 核心模块 |
|------|------|----------|
| **api** | 后端 API 服务 | 路由、业务逻辑、数据库操作、平台识别、元数据抓取 |
| **web** | 网页管理后台 | 用户界面、状态管理、API 调用、响应式布局 |
| **mobile** | 移动端 APP | 用户界面、离线存储、推送通知、原生能力集成 |
| **chrome-extension** | 浏览器扩展 | 快速收藏、页面解析、API 同步 |

---

## 3. 技术栈详解

### 3.1 后端技术栈 (api)

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 语言 | TypeScript | ^5.3.0 | 类型安全 |
| 框架 | Express | ^4.18.2 | Web 框架 |
| ORM | Prisma | ^5.7.0 | 数据库访问 |
| 数据库 | PostgreSQL | - | 主数据库 |
| 缓存 | Redis | - | 元数据缓存、锁 |
| 对象存储 | 腾讯云 COS | - | 封面图片存储 |
| 认证 | JWT | - | 用户认证 |

### 3.2 前端技术栈 (web)

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Next.js | 14.1.0 | 全栈框架 |
| UI | React | ^18.2.0 | 前端框架 |
| 样式 | Tailwind CSS | ^3.4.0 | CSS 框架 |
| 图标 | Lucide React | ^0.303.0 | 图标库 |
| 状态管理 | TanStack Query | ^5.17.0 | 数据获取与缓存 |
| 部署 | 自托管 | - | PM2 + Nginx |

### 3.3 移动端技术栈 (mobile)

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React Native | 0.74.0 | 移动端框架 |
| SDK | Expo | ~51.0.0 | 原生能力封装 |
| 导航 | React Navigation | ^6.x | 页面导航 |
| 状态管理 | Zustand | ^4.4.7 | 状态管理 |
| 数据获取 | TanStack Query | ^5.17.0 | API 调用 |
| 存储 | AsyncStorage | ^1.23.1 | 本地存储 |

### 3.4 Chrome 扩展技术栈

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | ^18.2.0 | UI 框架 |
| 构建 | Vite | ^5.0.0 | 构建工具 |
| 语言 | TypeScript | ^5.3.0 | 类型安全 |

---

## 4. 核心业务模块

### 4.1 模块列表

| 模块 | 说明 | 所在位置 |
|------|------|----------|
| **auth** | 用户认证（登录、注册、Google OAuth） | `apps/api/src/routes/auth.ts` |
| **collections** | 收藏管理（增删改查） | `apps/api/src/routes/collections.ts` |
| **tags** | 标签管理 | `apps/api/src/routes/tags.ts` |
| **lists** | 列表管理 | `apps/api/src/routes/lists.ts` |
| **shares** | 分享管理（生成分享页） | `apps/api/src/routes/shares.ts` |
| **platforms** | 平台识别（抖音、小红书等） | `apps/api/src/services/platforms.ts` |
| **metadata** | 元数据抓取 | `apps/api/src/services/metadata.ts` |
| **quota** | 配额管理 | `apps/api/src/services/quota.ts` |

### 4.2 核心数据库模型

| 模型 | 说明 | 关键字段 |
|------|------|----------|
| **User** | 用户表 | id, email, phone, userTier, status |
| **Collection** | 收藏表 | id, userId, url, title, platform, coverImage, rating, deletedAt |
| **Tag** | 标签表 | id, userId, name, nameCn, nameEn |
| **List** | 列表表 | id, userId, name, description |
| **Share** | 分享表 | id, userId, password, expiresAt, status |
| **ShareItem** | 分享内容表 | id, shareId, collectionId |

---

## 5. 开发环境快速启动

### 5.1 前置条件
- Node.js >= 18.0.0
- Docker（用于运行 PostgreSQL 和 Redis）
- WSL（Windows 用户）

### 5.2 启动步骤

```bash
# 1. 进入项目目录
cd d:\trae_projects\linkchest\project

# 2. 启动数据库
docker-compose up -d

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env，配置 DATABASE_URL 等

# 5. 初始化数据库
cd apps/api && npx prisma generate && npx prisma migrate dev

# 6. 启动后端
npm run dev:api

# 7. 启动网页端（新开终端）
npm run dev:web

# 8. 启动移动端（新开终端）
npm run dev:mobile
```

### 5.3 服务端口

| 服务 | 端口 | 访问地址 |
|------|------|----------|
| API | 3001 | http://localhost:3001 |
| Web | 3003 | http://localhost:3003 |
| Prisma Studio | 5555 | http://localhost:5555 |

---

## 6. 关键配置文件

| 文件 | 用途 | 位置 |
|------|------|------|
| `.env` | 环境变量 | `apps/api/.env` |
| `schema.prisma` | 数据库 schema | `apps/api/prisma/schema.prisma` |
| `turbo.json` | Turbo 构建配置 | `project/turbo.json` |
| `build-gradle.sh` | APK Gradle 构建脚本 | `apps/mobile/build-gradle.sh` |
| `vite.config.ts` | Chrome 扩展构建配置 | `apps/chrome-extension/vite.config.ts` |

---

## 7. 常用命令

### 7.1 根项目命令
```bash
npm run dev:api      # 启动后端
npm run dev:web      # 启动网页端
npm run dev:mobile   # 启动移动端
npm run build        # 构建所有应用
npm run lint         # 代码检查
npm run db:generate  # 生成 Prisma 客户端
npm run db:migrate   # 执行数据库迁移
npm run db:studio    # 打开 Prisma Studio
```

### 7.2 API 服务命令
```bash
npm run dev          # 开发模式
npm run build        # 构建
npm run start        # 生产模式运行
npm run test         # 运行测试
npm run lint         # ESLint 检查
```

### 7.5 构建与部署命令

#### APK 构建（WSL）
```bash
.\project\apps\mobile\build-apk.ps1           # 并行构建双版本（推荐）
.\project\apps\mobile\build-apk.ps1 global    # 只构建国际版
.\project\apps\mobile\build-apk.ps1 china     # 只构建国内版
```

#### 双 WSL 架构
| WSL 实例 | 用途 | Flavor |
|----------|------|--------|
| linkchest-global | 国际版 APK | global |
| linkchest-cn | 国内版 APK | china |

#### 部署（Git-Only）
```bash
bash deploy/deploy.sh global    # 部署海外
bash deploy/deploy.sh china     # 部署国内
```

---

## 8. 学习路径建议

### 8.1 入门顺序
1. **理解项目结构**：先看 README.md 和目录结构
2. **跑通开发环境**：按照 5.2 步骤启动服务
3. **理解认证流程**：查看 `apps/api/src/routes/auth.ts`
4. **理解收藏流程**：查看 `apps/api/src/routes/collections.ts`
5. **学习平台识别**：查看 `apps/api/src/services/platforms.ts`

### 8.2 核心文件推荐
| 文件 | 学习价值 |
|------|----------|
| `apps/api/src/index.ts` | API 入口，理解中间件配置 |
| `apps/api/src/middleware/auth.ts` | 认证中间件 |
| `apps/api/src/services/platforms.ts` | 平台识别核心逻辑 |
| `apps/web/src/app/page.tsx` | 网页端首页 |
| `apps/mobile/App.tsx` | 移动端入口 |

---

## 9. 设计模式

### 9.1 Repository 模式

数据访问层使用 Repository 模式封装：

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: UserCreateInput): Promise<User>;
  update(id: string, data: UserUpdateInput): Promise<User>;
  delete(id: string): Promise<boolean>;
  findMany(options?: FindManyOptions): Promise<User[]>;
}
```

### 9.2 服务层模式

业务逻辑在服务层处理，依赖注入 Repository：

```typescript
class UserService {
  constructor(private userRepository: UserRepository) {}

  async register(data: UserCreateInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ValidationError('Email already exists', 'email');
    }
    return this.userRepository.create(data);
  }
}
```

---

## 10. API 响应格式规范

### 10.1 成功响应

```typescript
interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}
```

### 10.2 错误响应

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 10.3 分页响应

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

---

*最后更新：2026-05-11*
*版本：v1.1 — 更新构建部署信息*
