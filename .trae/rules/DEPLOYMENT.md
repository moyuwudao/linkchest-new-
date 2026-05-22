---
alwaysApply: false
description: 服务器部署与更新规则 - 定义 LinkChest 项目的部署流程、环境配置和运维规范
---

# DEPLOYMENT.md — 服务器部署与更新规则

> 本文档定义 LinkChest 项目的服务器部署架构、更新流程和运维规范，确保所有代理能够正确执行部署操作。

---

## 0. 前置条件（必须首先配置）

### 0.1 SSH 连接配置

**⚠️ 重要：所有部署操作依赖 SSH 连接，必须在执行部署前完成以下配置**

#### 方案 A：SSH 密钥免密登录（推荐）

**适用场景**：Windows 本地开发机连接到 Linux 服务器

**配置步骤**：

```powershell
# 1. 检查是否已有 SSH 密钥
ls $env:USERPROFILE\.ssh\

# 如果 id_ed25519 已存在，跳过步骤 2
# 如果不存在，生成 SSH 密钥对
ssh-keygen -t ed25519 -N '""' -f $env:USERPROFILE\.ssh\id_ed25519
```

```powershell
# 2. 查看公钥内容（复制此内容到服务器）
cat $env:USERPROFILE\.ssh\id_ed25519.pub
# 输出示例：ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHhz20Dkl9wU2YlT5aVWN4B1rhrelh6oHA4TY8WGSgyl your_email
```

**⚠️ 重要：Trae 终端不支持交互式密码输入**
- 上述 `type ... | ssh ...` 命令在 Trae 中会卡住等待密码
- **正确做法**：手动复制公钥内容到服务器的 `~/.ssh/authorized_keys`

**服务器端配置（手动执行）**：
```bash
# 在服务器上执行
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 将本地公钥内容添加到 authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHhz20Dkl9wU2YlT5aVWN4B1rhrelh6oHA4TY8WGSgyl your_email" >> ~/.ssh/authorized_keys

chmod 600 ~/.ssh/authorized_keys
```

```powershell
# 3. 配置 SSH 客户端（Windows）
# 编辑 $env:USERPROFILE\.ssh\config 文件，添加：
Host 43.133.44.232
    HostName 43.133.44.232
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
```

```powershell
# 4. 验证免密登录
ssh ubuntu@43.133.44.232 "whoami"
# 预期输出：ubuntu（无需输入密码）
```

**验证命令**：
```bash
# 测试 SSH 免密登录
ssh -o StrictHostKeyChecking=accept-new ubuntu@43.133.44.232 "echo 'SSH OK'"
```

#### 方案 B：使用密码认证（临时方案）

**⚠️ 不推荐：Trae 终端不支持交互式密码输入，会导致命令卡住**

**常见问题**：
- 现象：执行 SSH/SCP 命令后终端卡住，没有输出
- 原因：命令正在等待密码输入，但 Trae 终端无法交互式输入
- 解决：使用方案 A 配置免密登录，或手动在服务器上配置

如果必须使用密码，请使用以下方式：
```powershell
# 使用 plink 工具（需先安装 PuTTY）
plink -pw "你的密码" ubuntu@43.133.44.232 "命令"

# 或使用 sshpass（Linux/Mac）
sshpass -p "你的密码" ssh ubuntu@43.133.44.232 "命令"
```

### 0.4 SSH 连接调试指南

**当其他 AGENT 报告 SSH 无法连接时，按以下步骤排查：**

#### 步骤 1：使用详细模式检查连接
```powershell
# 使用 -v 参数查看详细调试信息
ssh -v ubuntu@43.133.44.232 "whoami"
```

**关键日志解读**：
```
# ✅ 正常情况
debug1: Offering public key: ... id_ed25519 ... explicit
debug1: Server accepts key: ... id_ed25519 ... explicit
Authenticated to 43.133.44.232 using "publickey".

# ❌ 公钥未配置或配置错误
debug1: Authentications that can continue: publickey,password
# 然后提示输入密码
```

#### 步骤 2：检查本地 SSH 配置
```powershell
# 检查 SSH 配置文件
cat $env:USERPROFILE\.ssh\config

# 确认包含以下内容：
Host 43.133.44.232
    HostName 43.133.44.232
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
```

#### 步骤 3：检查本地密钥文件
```powershell
# 确认密钥文件存在
ls $env:USERPROFILE\.ssh\

# 查看公钥内容（应与服务器 authorized_keys 匹配）
cat $env:USERPROFILE\.ssh\id_ed25519.pub
```

#### 步骤 4：检查服务器端配置
```bash
# 在服务器上执行
cat ~/.ssh/authorized_keys
# 确认包含本地公钥内容

ls -la ~/.ssh/
# 确认权限：
# - ~/.ssh 目录权限应为 700 (drwx------)
# - ~/.ssh/authorized_keys 文件权限应为 600 (-rw-------)
```

#### 步骤 5：最简单的验证命令
```powershell
# 其他 AGENT 应使用最简单的 SSH 命令
ssh ubuntu@43.133.44.232 "whoami"
# 预期输出：ubuntu

# 避免使用复杂参数，如：
# ❌ ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL ...
# ✅ ssh ubuntu@43.133.44.232 "whoami"
```

#### 常见错误及解决方案

| 错误现象 | 可能原因 | 解决方案 |
|----------|----------|----------|
| 终端卡住无输出 | 等待密码输入 | 配置免密登录 |
| Permission denied | 密钥权限错误 | 检查 ~/.ssh 目录权限为 700，authorized_keys 为 600 |
| No such file or directory | SSH 配置错误 | 检查 IdentityFile 路径是否正确 |
| Connection refused | 服务器未运行 SSH | 检查服务器 SSH 服务状态 |
| Host key verification failed | known_hosts 冲突 | 删除 known_hosts 中对应条目 |

#### AGENT 使用 SSH 的最佳实践

1. **使用简单命令**：`ssh ubuntu@43.133.44.232 "命令"`
2. **依赖 SSH 配置文件**：不要在命令中指定复杂参数
3. **先验证再执行**：部署前先运行 `whoami` 验证连接
4. **避免交互式操作**：Trae 终端不支持密码输入

### 0.2 服务器连接信息

**⚠️ LinkChest 同时运行国内和海外两套服务器，部署前必须明确目标服务器。**

#### 海外服务器（单体架构）

| 项目 | 值 | 说明 |
|------|-----|------|
| 服务器 IP | `43.133.44.232` | 腾讯云新加坡 |
| SSH 用户 | `ubuntu` | **不是 root** |
| 架构 | 单体 | API + WEB + DB + Redis 同一台 |
| 项目根目录 | `/opt/linkchest/api` | Git 仓库根目录 |
| WEB 代码目录 | `/opt/linkchest/api/apps/web` | 在 api 目录下的 apps/web |
| API 代码目录 | `/opt/linkchest/api/apps/api` | 在 api 目录下的 apps/api |
| PM2 进程名 | `linkchest-api-global` | 海外版本进程名 |
| 环境变量文件 | `.env.global` | 海外市场配置 |

#### 国内服务器（应用层 + 数据层分离）

| 服务器 | IP | 配置 | 用途 |
|--------|-----|------|------|
| 服务器A（应用层） | `43.136.82.88` | 4核8G5M | API + WEB + Redis + Nginx |
| 服务器B（数据层） | `114.132.81.246` | 2核4G6M | PostgreSQL 16 |

| 项目 | 服务器A（应用层） | 服务器B（数据层） |
|------|------------------|------------------|
| SSH 用户 | `ubuntu` | `ubuntu` |
| 项目根目录 | `/opt/linkchest/api` | `/opt/linkchest/api` |
| PM2 进程名 | `linkchest-api-china` | - |
| 环境变量文件 | `.env.china` | `.env.china` |
| 数据库 | - | PostgreSQL 5432 |
| Redis | 6379 | - |

### 0.3 环境检查清单

#### 海外服务器检查

- [ ] SSH 免密登录已配置（`ssh ubuntu@43.133.44.232 "whoami"` 无需密码）
- [ ] 服务器上 Git 仓库已初始化（`/opt/linkchest/api` 存在且是 git 仓库）
- [ ] 服务器上 Docker 和 Docker Compose 已安装
- [ ] 服务器上 PM2 已安装（`npm install -g pm2`）
- [ ] 本地开发环境可以正常构建（`npm run build` 无错误）

#### 国内服务器检查

- [ ] SSH 免密登录已配置（`ssh ubuntu@43.136.82.88 "whoami"` 和 `ssh ubuntu@114.132.81.246 "whoami"` 无需密码）
- [ ] 两台服务器上 Git 仓库已初始化
- [ ] 服务器A上 Docker、PM2、Nginx 已安装
- [ ] 服务器B上 Docker、PostgreSQL 已安装
- [ ] 安全组端口已开放（80, 3001, 5432）
- [ ] 服务器A能连通服务器B的 5432 端口（内网通信）
- [ ] 本地开发环境可以正常构建（`npm run build` 无错误）

---

## 1. 部署架构概览

### 1.1 双服务器架构

LinkChest 同时运行 **海外（global）** 和 **国内（china）** 两套服务器：

```
┌─────────────────────────────────────────────────────────────────┐
│                         海外服务器 (单体架构)                     │
│  IP: 43.133.44.232                                              │
│  区域: 新加坡 (ap-singapore)                                     │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   API   │  │   WEB   │  │   DB    │  │  Redis  │            │
│  │ (3001)  │  │ (3003)  │  │ (5432)  │  │ (6379)  │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                    Nginx (80/443)                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         国内服务器 (分离架构)                     │
│                                                                 │
│  ┌─────────────────────────┐                                    │
│  │   服务器A (应用层)        │                                    │
│  │   IP: 43.136.82.88       │                                    │
│  │   4核8G5M               │                                    │
│  │                         │                                    │
│  │  ┌─────────┐ ┌────────┐ │                                    │
│  │  │   API   │ │  WEB   │ │                                    │
│  │  │ (3001)  │ │ (3003) │ │                                    │
│  │  └────┬────┘ └────────┘ │                                    │
│  │       │    ┌─────────┐  │                                    │
│  │       └───>│  Redis  │  │                                    │
│  │            │ (6379)  │  │                                    │
│  │            └────┬────┘  │                                    │
│  │                 │       │                                    │
│  │            Nginx (80)   │                                    │
│  └─────────────────────────┘                                    │
│                 │                                               │
│                 │ 内网通信 (<1ms延迟)                             │
│                 ▼                                               │
│  ┌─────────────────────────┐                                    │
│  │   服务器B (数据层)        │                                    │
│  │   IP: 114.132.81.246     │                                    │
│  │   2核4G6M               │                                    │
│  │                         │                                    │
│  │      PostgreSQL (5432)  │                                    │
│  └─────────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 组件 | 技术 | 海外部署方式 | 国内部署方式 |
|------|------|-------------|-------------|
| API 服务 | Express + TypeScript (tsx) | PM2 进程管理 | PM2 进程管理 |
| Web 前端 | Next.js | PM2 进程管理 | PM2 进程管理 |
| 数据库 | PostgreSQL 16 | Docker 容器（本机） | Docker 容器（服务器B） |
| 缓存 | Redis 7 | Docker 容器（本机） | Docker 容器（服务器A） |
| 反向代理 | Nginx | 系统服务 | 系统服务（服务器A） |
| 进程管理 | PM2 | 全局 npm 包 | 全局 npm 包（服务器A） |

### 1.3 服务器目录结构（通用）

```
/opt/linkchest/
├── api/                    # 应用代码根目录（Git 仓库）
│   ├── apps/
│   │   ├── api/           # API 服务
│   │   │   ├── src/
│   │   │   ├── prisma/    # 数据库 Schema
│   │   │   └── .env       # API 环境变量
│   │   └── web/           # Web 前端
│   │       ├── src/
│   │       └── .next/     # 构建输出
│   ├── deploy/            # 部署脚本目录
│   │   ├── ecosystem.config.js   # PM2 配置
│   │   ├── start-api.sh         # API 启动脚本
│   │   ├── start-web.sh         # Web 启动脚本
│   │   ├── update-server.sh     # 服务器端更新（推荐）
│   │   ├── update.sh            # 一键更新脚本
│   │   ├── backup-db.sh         # 数据库备份
│   │   ├── debug-admin.sh       # 管理员诊断
│   │   └── nginx/               # Nginx 配置
│   └── docker-compose.yml       # Docker 服务编排
└── backups/               # 数据库备份目录
```

### 1.4 服务端口

| 服务 | 端口 | 海外位置 | 国内位置 |
|------|------|----------|----------|
| API | 3001 | 本机 | 服务器A |
| Web | 3003 | 本机 | 服务器A |
| PostgreSQL | 5432 | 本机 Docker | 服务器B Docker |
| Redis | 6379 | 本机 Docker | 服务器A Docker |
| Nginx | 80/443 | 本机 | 服务器A |

---

## 2. 环境配置

### 2.1 环境变量文件区分

**⚠️ 国内和海外使用不同的环境变量文件，禁止混用。**

#### 海外服务器环境变量 (`.env.global`)

**API 环境变量**: `apps/api/.env.global`

```env
# 数据库（本机 Docker）
DATABASE_URL="postgresql://linkchest:linkchest123@localhost:5432/linkchest?schema=public"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# 服务端口
PORT=3001

# 前端 URL
SHARE_BASE_URL="https://linkchest.net"
WEB_BASE_URL="https://linkchest.net"

# CORS
CORS_ORIGIN="https://linkchest.net"

# 环境标识
NODE_ENV=production
MARKET=global

# 管理员用户 ID 列表（逗号分隔）
ADMIN_USER_IDS="user-id-1,user-id-2"

# 海外支付配置
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# 海外登录配置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Web 环境变量**: `apps/web/.env.production`

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_MARKET=global
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

#### 国内服务器环境变量 (`.env.china`)

**API 环境变量**: `apps/api/.env.china`

```env
# 数据库（服务器B，内网通信）
DATABASE_URL="postgresql://linkchest:linkchest123@114.132.81.246:5432/linkchest?schema=public"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# 服务端口
PORT=3001

# 前端 URL（未备案期间使用 IP）
SHARE_BASE_URL="http://43.136.82.88"
WEB_BASE_URL="http://43.136.82.88"

# CORS
CORS_ORIGIN="http://43.136.82.88"

# 环境标识
NODE_ENV=production
MARKET=china

# 管理员用户 ID 列表（逗号分隔）
ADMIN_USER_IDS="user-id-1,user-id-2"

# 国内支付配置
WECHAT_PAY_APP_ID=your-wechat-app-id
WECHAT_PAY_MCH_ID=your-wechat-mch-id
ALIPAY_APP_ID=your-alipay-app-id
ALIPAY_PRIVATE_KEY=your-alipay-private-key

# 国内登录配置
WECHAT_APP_ID=your-wechat-app-id
ALIPAY_AUTH_APP_ID=your-alipay-auth-app-id

# 腾讯云配置（内容审核 + 邮件推送）
TENCENTCLOUD_SECRET_ID=your-secret-id
TENCENTCLOUD_SECRET_KEY=your-secret-key
```

**Web 环境变量**: `apps/web/.env.production`

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_MARKET=china
```

> **重要**：`NEXT_PUBLIC_*` 变量必须在构建前注入，不能通过 PM2 运行时设置。

### 2.2 环境变量优先级

```
1. 系统环境变量（最高优先级）
2. .env 文件
3. .env.example 默认值（最低优先级）
```

---

## 3. Git 工作流规范

### 3.1 仓库信息

| 项目 | 值 |
|------|-----|
| 远程仓库 | `git@github.com:moyuwudao/linkchest.git` |
| 默认分支 | `master` |
| 本地路径 | `d:\trae_projects\linkchest` |
| 服务器路径 | `/opt/linkchest/api` |

### 3.2 标准开发部署流程

```
[本地开发]        [Git 仓库]        [服务器]
     │                │                │
     │ 1. 开发完成    │                │
     │───────────────>│                │
     │ git add .      │                │
     │ git commit     │                │
     │ git push       │                │
     │                │                │
     │                │ 2. 服务器更新  │
     │                │<───────────────│
     │                │ git pull       │
     │                │                │
     │                │ 3. 执行部署    │
     │                │ bash deploy/   │
     │                │ update-server.sh│
```

### 3.3 本地开发环境设置

**首次设置**:
```bash
# 1. 克隆仓库
git clone git@github.com:moyuwudao/linkchest_new_.git d:\trae_projects\linkchest

# 2. 进入项目目录
cd d:\trae_projects\linkchest

# 3. 安装依赖
cd project
npm install

# 4. 配置环境变量
copy apps\api\.env.example apps\api\.env
# 编辑 .env 文件配置本地数据库等
```

**日常开发**:
```bash
# 1. 开始工作前拉取最新代码
git pull origin master

# 2. 开发完成后提交代码
git add .
git commit -m "feat: 描述本次修改"
git push origin master
```

### 3.4 海外服务器部署流程

**方案一：服务器端一键更新（推荐）**

**脚本**: `deploy/update-server.sh`

**执行位置**: 海外服务器 (`43.133.44.232`) 上直接运行

**⚠️ 重要前提：代码必须先提交并推送到 Git 仓库**

**执行命令**:
```bash
# 在海外服务器上执行
ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api && bash deploy/update-server.sh"
```

**特点**:
- **代码必须通过 Git 仓库同步**：服务器通过 `git pull` 获取最新代码
- **本地修改必须先提交**：未提交的修改无法通过此方案部署
- 自动处理数据库迁移和 Schema 校验
- 自动构建 Web 前端
- 包含健康检查和 Nginx 配置同步
- 使用 `.env.global` 环境变量文件

### 3.5 国内服务器部署流程

**⚠️ 国内服务器是应用层 + 数据层分离架构，部署时必须同时考虑两台服务器。**

**方案一：使用国内部署脚本（推荐）**

**脚本**: `deploy/deploy.sh`

**执行位置**: 本地开发机

**执行命令**:
```bash
# 部署国内版本（应用层 + 数据层）
bash deploy/deploy.sh 43.136.82.88 china
```

**脚本行为**：
1. 同步代码到服务器A（应用层）
2. 同步代码到服务器B（数据层）
3. 在服务器B执行数据库迁移
4. 在服务器A构建并重启服务

**方案二：分步手动部署**

```bash
# 步骤1：更新应用层代码（服务器A）
ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && git pull"

# 步骤2：更新数据层代码（服务器B）
ssh ubuntu@114.132.81.246 "cd /opt/linkchest/api && git pull"

# 步骤3：在数据层执行数据库迁移（服务器B）
ssh ubuntu@114.132.81.246 "cd /opt/linkchest/api/apps/api && npx prisma migrate deploy"

# 步骤4：在应用层构建并重启（服务器A）
ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && npm run build && pm2 restart linkchest-api-china"
```

**国内部署专属注意事项**：
- **必须同步 `public/` 目录**：遗漏会导致静态资源 404
- **必须同步 `next.config.js`**：遗漏会导致 rewrites 不生效
- **`NEXT_PUBLIC_API_URL` 必须在构建前注入**：创建 `.env.production` 文件
- **数据库操作必须在服务器B执行**：服务器A不运行 PostgreSQL
- **使用 `.env.china` 环境变量文件**：数据库连接串指向服务器B

### 3.6 方案三：服务器初始化

**脚本**: `deploy/setup-server.sh`

**用途**: 首次在服务器上运行，安装基础环境

**安装内容**:
- Node.js 20.x LTS
- PM2 进程管理器
- Docker
- 防火墙配置 (UFW)
- PM2 日志轮转

---

## 4. 数据库管理

### 4.1 数据库迁移

```bash
# 生成迁移文件（开发环境）
npx prisma migrate dev

# 部署迁移（生产环境）
npx prisma migrate deploy

# 或使用 db push（无迁移文件时）
npx prisma db push --skip-generate
```

### 4.2 数据库备份

**脚本**: `deploy/backup-db.sh`

**手动备份**:
```bash
bash deploy/backup-db.sh
```

**自动备份**（推荐配置 crontab）:
```bash
# 每日凌晨 3 点自动备份
0 3 * * * /opt/linkchest/api/deploy/backup-db.sh
```

**备份文件位置**: `/opt/linkchest/backups/linkchest_YYYYMMDD_HHMMSS.sql.gz`

**保留策略**: 自动保留 30 天，删除更早的备份

### 4.3 数据库恢复

```bash
# 解压备份文件
gunzip linkchest_20260511_030000.sql.gz

# 恢复数据库
docker exec -i linkchest-db psql -U linkchest -d linkchest < linkchest_20260511_030000.sql
```

---

## 5. 服务管理

### 5.1 PM2 进程管理

| 操作 | 命令 |
|------|------|
| 查看状态 | `pm2 status` |
| 查看 API 日志 | `pm2 logs linkchest-api` |
| 查看 Web 日志 | `pm2 logs linkchest-web` |
| 重启 API | `pm2 restart linkchest-api` |
| 重启 Web | `pm2 restart linkchest-web` |
| 重启全部 | `pm2 restart all` |
| 停止服务 | `pm2 stop linkchest-api` |
| 删除进程 | `pm2 delete linkchest-api` |
| 保存进程列表 | `pm2 save` |
| 查看监控 | `pm2 monit` |

### 5.2 Docker 容器管理

| 操作 | 命令 |
|------|------|
| 查看容器 | `docker ps -a` |
| 查看数据库日志 | `docker logs linkchest-db` |
| 重启数据库 | `docker restart linkchest-db` |
| 进入数据库 | `docker exec -it linkchest-db psql -U linkchest -d linkchest` |
| 查看 Redis | `docker logs linkchest-redis` |

### 5.3 Nginx 管理

| 操作 | 命令 |
|------|------|
| 检查配置 | `sudo nginx -t` |
| 重载配置 | `sudo systemctl reload nginx` |
| 查看状态 | `sudo systemctl status nginx` |
| 查看错误日志 | `sudo tail -f /var/log/nginx/error.log` |

---

## 6. 健康检查

### 6.1 API 健康检查

```bash
curl http://localhost:3001/health
```

**期望响应**:
```json
{"status": "ok"}
```

### 6.2 Web 健康检查

```bash
# 检查页面响应
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/login

# 检查静态文件
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/_next/static/chunks/main.js
```

### 6.3 数据库健康检查

```bash
# 检查 PostgreSQL 是否就绪
docker exec linkchest-db pg_isready -U linkchest

# 检查 Redis
docker exec linkchest-redis redis-cli ping
```

---

## 7. 常见问题排查

### 7.1 管理员无法登录

**检查步骤**:
1. 查询用户数据库 ID:
   ```bash
   docker exec linkchest-db psql -U linkchest -d linkchest -c "SELECT id, email FROM users WHERE email = 'user@example.com';"
   ```
2. 检查 `ADMIN_USER_IDS` 环境变量是否包含该 ID
3. 重启 API 服务使配置生效

**诊断脚本**:
```bash
bash deploy/debug-admin.sh
```

### 7.2 服务启动失败

**检查清单**:
- [ ] 环境变量文件是否存在且配置正确
- [ ] 数据库容器是否运行
- [ ] 端口是否被占用
- [ ] 依赖是否安装完整
- [ ] 日志中是否有错误信息

### 7.3 数据库连接失败

**检查步骤**:
1. 检查 PostgreSQL 容器状态: `docker ps | grep linkchest-db`
2. 检查数据库是否就绪: `docker exec linkchest-db pg_isready -U linkchest`
3. 检查环境变量中的 DATABASE_URL 是否正确
4. 检查防火墙是否允许 5432 端口

### 7.4 静态文件 404

**检查步骤**:
1. 确认 Web 服务已构建: `ls -la apps/web/.next/`
2. 检查 Nginx 配置中的静态文件路径
3. 检查 PM2 进程的工作目录是否正确

---

## 8. 安全规范

### 8.1 环境变量安全

- **禁止**将 `.env` 文件提交到 Git 仓库
- **必须**使用强密码（≥16位，含大小写+数字+符号）
- **必须**定期更换 JWT_SECRET
- **建议**使用环境变量注入而非硬编码

### 8.2 数据库安全

- **禁止**直接暴露数据库端口到公网
- **必须**定期备份数据库
- **建议**启用数据库连接池限制

### 8.3 服务安全

- **必须**配置防火墙，仅开放必要端口
- **必须**使用 HTTPS（Nginx 配置 SSL）
- **建议**配置 fail2ban 防止暴力破解

---

## 9. 部署检查清单

### 9.1 部署前检查

- [ ] 代码已通过测试
- [ ] 数据库迁移文件已准备
- [ ] 环境变量已更新
- [ ] 备份已完成

### 9.2 部署后检查

- [ ] API 健康检查通过
- [ ] Web 服务响应正常
- [ ] 数据库连接正常
- [ ] 静态文件可正常访问
- [ ] Nginx 配置已同步
- [ ] PM2 进程已保存

---

## 10. 快速参考

### 10.1 一键更新（最常用）

```bash
# 在服务器上执行
cd /opt/linkchest/api
bash deploy/update-server.sh
```

### 10.2 紧急重启

```bash
# 重启 API
pm2 restart linkchest-api

# 重启 Web
pm2 restart linkchest-web

# 重启全部
pm2 restart all
```

### 10.3 查看日志

```bash
# 实时查看 API 日志
pm2 logs linkchest-api --lines 100

# 查看错误日志
pm2 logs linkchest-api --err

# 查看 Nginx 错误
sudo tail -f /var/log/nginx/error.log
```

### 10.4 数据库操作

```bash
# 进入数据库命令行
docker exec -it linkchest-db psql -U linkchest -d linkchest

# 执行 SQL 文件
docker exec -i linkchest-db psql -U linkchest -d linkchest < script.sql

# 导出数据
docker exec linkchest-db pg_dump -U linkchest linkchest > backup.sql
```

---

---

## 11. 本地修改部署至服务器（关键教训）

> 以下内容为 2026-05-12 部署实践总结，记录从本地推送未提交修改到服务器的完整流程和避坑指南。

### 11.1 部署前必须确认的信息

| 项目 | 值 | 说明 |
|------|-----|------|
| 服务器 IP | `43.133.44.232` | 腾讯云服务器 |
| SSH 用户 | `ubuntu` | **不是 root** |
| WEB 服务端口 | `3003` | **不是 3000** |
| 项目根目录 | `/opt/linkchest/api` | **不是 /opt/linkchest/web** |
| WEB 代码目录 | `/opt/linkchest/api/apps/web` | 在 api 目录下的 apps/web |

### 11.2 本地修改未提交时的部署流程

当本地有大量修改但未提交到 Git 时，`git pull` 无法拉取本地修改。此时应使用 **文件同步方案**：

```bash
# 1. 在本地 WSL 中打包 web 目录（排除 node_modules）
cd /mnt/d/trae_projects/linkchest/project/apps/web
tar czf /mnt/d/trae_projects/linkchest/web-src.tar.gz \
  src/ package.json next.config.js tsconfig.json \
  postcss.config.js tailwind.config.ts next-env.d.ts public/

# 2. 上传到服务器
scp web-src.tar.gz ubuntu@43.133.44.232:/tmp/

# 3. 在服务器上解压替换
cd /opt/linkchest/api/apps/web
rm -rf src
tar xzf /tmp/web-src.tar.gz

# 4. 重新构建
npm run build

# 5. 重启服务
pm2 restart linkchest-web
```

### 11.3 常见错误与解决方案

#### 错误 1：SSH 连接需要密码

**现象**：每次 SSH/SCP 都要求输入密码

**解决**：配置 SSH 密钥免密登录
```bash
# 在本地 WSL 生成密钥
ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519

# 将公钥添加到服务器（在服务器上执行）
echo "ssh-ed25519 xxx..." >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### 错误 2：找不到模块（Cannot find module）

**现象**：`Cannot find module './LazyImage'`

**根因**：服务器上的旧文件未被清理，新旧代码混合导致
- 旧文件：`src/app/(main)/CollectionList.tsx`（引用 `./LazyImage`）
- 新文件：`src/components/CollectionList.tsx`（正确位置）

**解决**：
1. **不要只同步单个文件**，必须同步完整的 `src/` 目录
2. 解压前先 `rm -rf src/` 清理旧代码
3. 确保所有组件文件都在正确的位置

#### 错误 3：构建成功但优化未生效

**现象**：WEB 页面看不到最新修改

**根因**：
1. 文件同步到了错误路径（如 `/opt/linkchest/web/` 而非 `/opt/linkchest/api/apps/web/`）
2. 构建成功但没有重启 PM2 服务
3. Next.js 使用了旧的 `.next` 缓存

**解决**：
```bash
# 1. 确认文件在正确位置
ls -la /opt/linkchest/api/apps/web/src/components/

# 2. 清理构建缓存后重新构建
cd /opt/linkchest/api/apps/web
rm -rf .next
cd /opt/linkchest/api
bash deploy/update-server.sh  # 或使用完整同步方案

# 3. 重启服务
pm2 restart linkchest-web

# 4. 验证服务状态
pm2 status
pm2 logs linkchest-web --lines 20
```

#### 错误 4：SCP 上传失败

**现象**：`scp: dest open "...": No such file or directory`

**解决**：先创建目标目录再上传
```bash
ssh ubuntu@43.133.44.232 'mkdir -p /opt/linkchest/api/apps/web/src/components'
scp file.tsx ubuntu@43.133.44.232:/opt/linkchest/api/apps/web/src/components/
```

### 11.4 部署检查清单（本地修改场景）

- [ ] 确认服务器 IP、用户名、项目路径
- [ ] 确认 SSH 免密登录已配置
- [ ] 打包完整的 src/ 目录（不是单个文件）
- [ ] 服务器端先 `rm -rf src/` 清理旧代码
- [ ] 解压后检查关键文件是否存在
- [ ] 执行 `npm run build` 构建
- [ ] 构建成功后重启 PM2 服务
- [ ] 检查 PM2 日志确认服务正常启动
- [ ] 浏览器刷新验证优化生效

### 11.5 推荐部署策略

| 场景 | 推荐方案 | 说明 |
|------|----------|------|
| 日常小更新 | `update-server.sh` | 代码已提交到 Git，服务器直接拉取 |
| 大量本地修改未提交 | **完整 src 同步** | 按 11.2 流程执行 |
| 紧急热修复 | 单文件 SCP + PM2 重启 | 仅修改单个文件时使用 |
| 首次部署 | `setup-server.sh` | 服务器环境初始化 |

---

## 12. 部署最佳实践与经验总结

> 本节整理自 2026-05-21 实际部署实践，记录关键经验和避坑指南。

### 12.1 SSH 免密登录配置（关键经验）

**问题背景**：Trae 终端不支持交互式密码输入，导致 SSH/SCP 命令会卡住。

**解决方案**：必须配置 SSH 密钥免密登录。

**完整配置流程**：

```powershell
# 1. 检查本地密钥
ls $env:USERPROFILE\.ssh\id_ed25519

# 2. 如果没有密钥，生成新密钥
ssh-keygen -t ed25519 -N '""' -f $env:USERPROFILE\.ssh\id_ed25519

# 3. 查看公钥内容
cat $env:USERPROFILE\.ssh\id_ed25519.pub
```

**服务器端配置**（手动执行）：
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICedLu31sU+zVrSaZqApF3IQYneFJ2AexPw8APPSXfHM walle@changji.com" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**SSH 配置文件**（`~/.ssh/config`）：
```
Host 43.133.44.232
    HostName 43.133.44.232
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new

Host 43.136.82.88
    HostName 43.136.82.88
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking accept-new
```

**验证命令**：
```bash
ssh ubuntu@43.133.44.232 "whoami"
# 预期输出：ubuntu（无需输入密码）
```

### 12.2 国内服务器 Git 仓库优化

**问题背景**：国内服务器访问 GitHub 速度慢，直接 git clone 经常超时。

**解决方案**：从海外服务器同步代码（rsync）。

**同步脚本**：
```bash
# 从海外服务器同步代码到国内服务器
ssh ubuntu@43.133.44.232 "rsync -avz --exclude='node_modules' --exclude='.git' /opt/linkchest/api/ ubuntu@43.136.82.88:/opt/linkchest/api_new/"

# 同步 Git 仓库
ssh ubuntu@43.133.44.232 "rsync -avz /opt/linkchest/api/.git/ ubuntu@43.136.82.88:/opt/linkchest/api_new/.git/"

# 切换目录
ssh ubuntu@43.136.82.88 "mv /opt/linkchest/api /opt/linkchest/api_old && mv /opt/linkchest/api_new /opt/linkchest/api"
```

**后续更新命令**：
```bash
# 海外服务器
ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api && git pull && bash deploy/update-server.sh"

# 国内服务器（已配置完整 Git 仓库）
ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && git pull && npm run build && pm2 restart all"
```

### 12.3 国内服务器环境配置要点

**数据库连接**：
```env
# 国内服务器数据库在服务器B
DATABASE_URL="postgresql://linkchest:LinkChest_DB_2026!@114.132.81.246:5432/linkchest"
```

**PM2 配置**（`ecosystem.config.js`）：
```javascript
{
name: 'linkchest-api',
script: '/opt/linkchest/api/deploy/start-api.sh',
env: {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://linkchest:LinkChest_DB_2026!@114.132.81.246:5432/linkchest',
    MARKET: 'china',
}
}
```

**WEB 环境变量**（必须在构建前注入）：
```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_MARKET=china
```

### 12.4 部署验证清单（新增）

**部署前检查**：
- [ ] SSH 免密登录已配置
- [ ] Git 仓库已初始化且远程配置正确
- [ ] 环境变量文件存在且配置正确
- [ ] 数据库连接测试通过
- [ ] 代码已提交并推送到 Git 仓库

**部署后验证**：
- [ ] API 健康检查通过（`curl http://localhost:3001/health`）
- [ ] WEB 服务响应正常（HTTP 200）
- [ ] 静态资源可正常访问（manifest.json, favicon.ico）
- [ ] PM2 进程状态为 online
- [ ] 数据库连接正常
- [ ] Nginx 配置已同步

**健康检查脚本**：
```bash
# 一键验证脚本
echo "=== 健康检查 ==="
echo "API: $(curl -s http://localhost:3001/health | jq -r '.status')"
echo "WEB: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/login)"
echo "DB: $(docker exec linkchest-db pg_isready -U linkchest 2>&1 || echo 'N/A')"
echo "Redis: $(docker exec linkchest-redis redis-cli ping 2>&1 || echo 'N/A')"
echo "PM2: $(pm2 status linkchest-api | grep -o 'online\|errored')"
```

### 12.5 常见错误与解决方案（新增）

| 错误现象 | 根因 | 解决方案 |
|----------|------|----------|
| SSH 命令卡住无输出 | 等待密码输入 | 配置 SSH 免密登录 |
| Git clone 超时 | 国内访问 GitHub 慢 | 从海外服务器 rsync 同步 |
| 服务启动失败 | 环境变量错误 | 检查 .env 文件配置 |
| WEB 显示旧版本 | 构建缓存未清理 | `rm -rf .next && npm run build` |
| 数据库连接失败 | 连接串错误 | 确认数据库地址和端口 |
| 静态资源 404 | 目录结构不一致 | 同步 public/ 和 next.config.js |

### 12.6 服务器间文件同步最佳实践

**场景 1：快速同步代码**（不包含 node_modules）：
```bash
rsync -avz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.turbo' \
    --exclude='dist' \
    /opt/linkchest/api/ \
    ubuntu@43.136.82.88:/opt/linkchest/api/
```

**场景 2：同步 Git 仓库**：
```bash
rsync -avz /opt/linkchest/api/.git/ ubuntu@43.136.82.88:/opt/linkchest/api/.git/
```

**场景 3：仅同步 WEB 代码**：
```bash
rsync -avz /opt/linkchest/api/apps/web/ ubuntu@43.136.82.88:/opt/linkchest/api/apps/web/
```

### 12.7 部署策略对比

| 场景 | 推荐方案 | 说明 |
|------|----------|------|
| 海外服务器日常更新 | `bash deploy/update-server.sh` | 一键更新，包含健康检查 |
| 国内服务器日常更新 | `git pull && npm run build && pm2 restart all` | 直接更新 |
| 大规模代码变更 | rsync 从海外同步 | 避免国内 GitHub 访问慢 |
| 首次部署 | `bash deploy/setup-server.sh` | 环境初始化 |
| 紧急热修复 | 单文件 SCP + PM2 重启 | 快速修复 |

---

*最后更新：2026-05-21*
*版本：v2.1 — 新增部署最佳实践与经验总结*
