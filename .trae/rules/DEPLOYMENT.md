---
alwaysApply: false
description: 服务器部署与更新规则 - 定义 LinkChest 项目的部署流程、环境配置和运维规范
---

# DEPLOYMENT.md — 服务器部署与更新规则

> 本文档定义 LinkChest 项目的服务器部署架构、更新流程和运维规范，确保所有代理能够正确执行部署操作。

> **🔴 Git-Only 策略（2026-05-22 起强制执行）**
> 所有服务器代码更新必须通过 `git pull`，禁止 rsync/scp/tar 推送代码。详见 [HIGH_RISK.md §2.0](HIGH_RISK.md)。

---

## 0. 前置条件（必须首先配置）

> 服务器基础信息权威来源：[HIGH_RISK.md §1](HIGH_RISK.md)

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

> **服务器 IP、架构、MCP 连接参数** → 唯一来源：[HIGH_RISK.md §1](HIGH_RISK.md)。此处仅保留部署流程特有内容。

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
│   │   ├── deploy.sh            # Git-Only 统一入口（推荐）
│   │   ├── update-server.sh     # 海外服务器端更新
│   │   ├── update-server-cn.sh  # 国内服务器端更新
│   │   ├── check-servers.sh     # 健康检查
│   │   ├── ecosystem.config.js  # PM2 配置
│   │   ├── start-api.sh         # API 启动脚本
│   │   ├── start-web.sh         # Web 启动脚本
│   │   ├── backup-db.sh         # 数据库备份
│   │   ├── debug-admin.sh       # 管理员诊断
│   │   ├── nginx/               # Nginx 配置
│   │   └── archived/            # 已废弃的旧脚本
│   └── docker-compose.yml       # Docker 服务编排
└── backups/               # 数据库备份目录
```

### 1.4 服务端口

> 端口映射 → 统一见 [HIGH_RISK.md §1.2](HIGH_RISK.md)。不在此重复。

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

# Cloudflare Worker 配置（海外直接访问）
# 海外服务器可直接访问 .workers.dev 域名，不需要代理
CLOUDFLARE_WORKER_URL="https://linkchest-metadata.lvmeta.workers.dev"
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

# 腾讯云配置（内容审核 + 邮件推送）
TENCENTCLOUD_SECRET_ID=your-secret-id
TENCENTCLOUD_SECRET_KEY=your-secret-key

# Cloudflare Worker 配置（国内专用代理方案）
# .workers.dev 域名在国内受限，国内服务器通过本地代理路由访问
# 海外服务器直接访问 Worker，不需要此配置
CLOUDFLARE_WORKER_URL="http://localhost:3001/api/collections/proxy-metadata"
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
| 远程仓库 | `git@github.com:moyuwudao/linkchest-new-.git` |
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
git clone https://github.com/moyuwudao/linkchest-new- d:\trae_projects\linkchest

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

**🔴 Git-Only：所有代码更新通过 `git pull`，禁止 rsync/scp/tar 推送。**

**方案一：统一入口脚本（推荐）**

```bash
# 从本地执行（自动 SSH 到服务器 → git pull → 构建 → 重启）
bash deploy/deploy.sh global
```

**方案二：直接在服务器上执行**

```bash
# SSH 到海外服务器后执行
ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api && bash deploy/update-server.sh"
```

**⚠️ 重要前提：代码必须先 `git commit && git push` 到远程仓库**

**脚本行为**：
1. 服务器执行 `git pull` 获取最新代码
2. 自动处理数据库迁移和 Schema 校验
3. 自动构建 Web 前端
4. 重启 PM2 服务并执行健康检查
5. 使用 `.env.global` 环境变量文件

### 3.5 国内服务器部署流程

**⚠️ 国内服务器是应用层 + 数据层分离架构，部署时必须同时考虑两台服务器。**

**🔴 Git-Only：所有代码更新通过 `git pull`，禁止 rsync/scp/tar 推送。**

**方案一：统一入口脚本（推荐）**

```bash
# 从本地执行（自动 SSH 到两台服务器 → git pull → 迁移 → 构建 → 重启）
bash deploy/deploy.sh china
```

**脚本行为**：
1. 服务器A（应用层）执行 `git pull` 获取最新代码
2. 服务器B（数据层）执行 `git pull` 获取最新代码
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
- **`public/` 目录必须提交到 Git**：遗漏会导致静态资源 404
- **`next.config.js` 必须提交到 Git**：遗漏会导致 rewrites 不生效
- **`NEXT_PUBLIC_API_URL` 必须在构建前注入**：创建 `.env.production` 文件
- **数据库操作必须在服务器B执行**：服务器A不运行 PostgreSQL
- **使用 `.env.china` 环境变量文件**：数据库连接串指向服务器B
- **Cloudflare Worker 代理配置（国内专用）**：
  - 国内服务器无法直接访问 `.workers.dev` 域名
  - 国内配置 `CLOUDFLARE_WORKER_URL=http://localhost:3001/api/collections/proxy-metadata`
  - 海外配置 `CLOUDFLARE_WORKER_URL=https://linkchest-metadata.lvmeta.workers.dev`
  - **禁止两地使用相同配置**：国内必须使用代理，海外直接访问

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

### 10.1 一键部署（最常用，Git-Only）

```bash
# 海外 — 从本地执行
bash deploy/deploy.sh global

# 国内 — 从本地执行
bash deploy/deploy.sh china
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

## 11. 本地修改部署经验

> **本地修改部署的详细经验和避坑指南已移入案例集锦：**
> - 常见部署错误与解决方案 → [CASE-S009](cases/service-build-errors.md#case-s009-部署后功能回退到旧版本)
> - SSH 配置与文件同步 → 使用 `deploy-linkchest` Skill 自动处理

---

## 12. 部署经验总结

> **部署最佳实践和经验总结已移入案例集锦和 Skill：**
> - 部署经验 → 使用 `deploy-linkchest` Skill 引导完整部署流程
> - 健康检查 → 使用 `check-servers` Skill 一键验证
> - 常见错误 → [服务构建异常案例集锦](cases/service-build-errors.md)

---

*最后更新：2026-05-26*
*版本：v2.4 — 强制 Git-Only 部署策略*
