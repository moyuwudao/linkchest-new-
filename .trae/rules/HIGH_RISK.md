---
alwaysApply: true
description: 高风险操作规则 - 部署与构建安全（橙色区域）
---

# HIGH_RISK.md — 高风险操作（橙色区域）

> 本文档定义部署服务和构建APK时的高风险操作，违反可能导致服务中断或构建失败。
> **本规则 alwaysApply: true，任何Agent在任何场景下都必须遵守。**
> **案例与规则分离**：异常案例请查阅 [服务构建异常案例集锦](cases/service-build-errors.md)。

---

> **🔧 关联 Skill**：部署操作请使用 `deploy-linkchest` Skill（自动引导完整部署流程），服务器检查请使用 `check-servers` Skill（一键健康检查）。

---

## 1. 服务器信息速查表

> **本文件为服务器信息的唯一来源（Single Source of Truth）。**
> 其他文件（DEPLOYMENT.md、INTERACTION.md）应引用此处，不得重复声明。

### 1.0 服务器连接方式（优先使用 MCP）

**优先方式：`aliyun-servers` MCP**

| 操作 | MCP 工具 | 说明 |
|------|---------|------|
| 连接服务器 | `mcp_aliyun-servers_ssh_connect` | 建立持久 SSH 连接，返回 connectionId |
| 执行命令 | `mcp_aliyun-servers_ssh_exec` | 在已连接服务器上执行命令 |
| 文件读取 | `mcp_aliyun-servers_sftp_read` | 通过 SFTP 读取远程文件 |
| 文件写入 | `mcp_aliyun-servers_sftp_write` | 通过 SFTP 写入远程文件 |
| 目录列表 | `mcp_aliyun-servers_sftp_ls` | 列出远程目录内容 |
| 系统信息 | `mcp_aliyun-servers_ssh_system_info` | 获取系统概览（CPU、内存、磁盘） |
| 断开连接 | `mcp_aliyun-servers_ssh_disconnect` | 关闭指定连接 |
| 查看连接 | `mcp_aliyun-servers_ssh_list_connections` | 列出所有活跃连接 |

**MCP 连接参数速查：**

| 服务器 | host | username | port |
|--------|------|----------|------|
| 海外应用层（雅加达） | `43.157.240.68` | `ubuntu` | 22 |
| 海外数据层（新加坡） | `43.133.44.232` | `ubuntu` | 22 |
| 国内应用层 | `43.136.82.88` | `ubuntu` | 22 |
| 国内数据层 | `114.132.81.246` | `ubuntu` | 22 |

**使用示例：**

```
# 1. 连接服务器
mcp_aliyun-servers_ssh_connect(host="43.133.44.232", username="ubuntu")
→ 返回 connectionId

# 2. 执行命令
mcp_aliyun-servers_ssh_exec(connectionId="xxx", command="pm2 list")

# 3. 操作完成后断开
mcp_aliyun-servers_ssh_disconnect(connectionId="xxx")
```

**降级方案：传统 SSH 命令**

当 MCP 不可用时，使用标准 SSH 命令：
```bash
# 海外应用层
ssh ubuntu@43.157.240.68 "cd /opt/linkchest/api && pm2 list"

# 海外数据层
ssh ubuntu@43.133.44.232 "docker ps"
```

---

### 1.1 海外服务器（应用层 + 数据层分离）

| 服务器 | IP | 配置 | 用途 |
|--------|-----|------|------|
| 雅加达（应用层） | `43.157.240.68` | 2核4G30M | API + WEB + Redis + Nginx |
| 新加坡（数据层） | `43.133.44.232` | 2核2G | PostgreSQL 16 |

| 配置项 | 雅加达（应用层） | 新加坡（数据层） |
|--------|------------------|------------------|
| 正式域名 | `https://linkchest.net` | - |
| 临时测试地址 | `http://43.157.240.68:3003` | - |
| 区域 | 雅加达 (`ap-jakarta`) | 新加坡 (`ap-singapore`) |
| 用户 | `ubuntu` | `ubuntu` |
| 项目目录 | `/opt/linkchest/api` | `/opt/linkchest/api` |
| PM2 进程名 | `linkchest-api-global` | - |
| 环境变量文件 | `.env.global` | `.env.global` |
| PostgreSQL | - | `5432`（通过 SSH 隧道 5433 连接） |
| Redis | `6379` | - |
| 数据库隧道 | autossh → 新加坡 5432 | - |

### 1.2 国内服务器（应用层 + 数据层分离）

| 服务器 | IP | 配置 | 用途 |
|--------|-----|------|------|
| 服务器A（应用层） | `43.136.82.88` | 4核8G5M | API + WEB + Redis + Nginx |
| 服务器B（数据层） | `114.132.81.246` | 2核4G6M | PostgreSQL 16 |

| 配置项 | 服务器A（应用层） | 服务器B（数据层） |
|--------|------------------|------------------|
| 访问地址 | `http://43.136.82.88` | - |
| 用户 | `ubuntu` | `ubuntu` |
| 项目目录 | `/opt/linkchest/api` | `/opt/linkchest/api` |
| PM2 进程名 | `linkchest-api-china` | - |
| 环境变量文件 | `.env.china` | `.env.china` |
| PostgreSQL | - | `5432` |
| Redis | `6379` | - |

---

## 2. 部署安全红线

### 2.0 🔴 Git-Only 策略（强制）

> **所有服务器的代码更新必须通过 `git pull`，禁止从本地 rsync/scp 推送代码。**
> **⚠️ 任何例外情况必须先与用户确认，不得自行决策。**

| 规则 | 说明 |
|------|------|
| **唯一代码来源** | GitHub 仓库 master 分支 |
| **唯一更新方式** | 服务器上 `git pull`（国内通过 GitHub 镜像加速） |
| **构建位置** | 服务器上构建（`npm run build`），不在本地构建后上传 |
| **环境配置** | `.env` 文件在服务器上维护，不通过 rsync/scp 推送 |

**唯一允许的部署命令：**

```bash
# 海外应用层（雅加达）
ssh ubuntu@43.157.240.68 "cd /opt/linkchest/api && git pull && bash deploy/update-server.sh"

# 国内应用层
ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && git pull && bash deploy/update-server-cn.sh"
```

**绝对禁止的代码同步方式：**

| 禁止行为 | 原因 | 违规后果 |
|----------|------|----------|
| **rsync 本地代码到服务器** | 本地可能是旧代码、脏代码、错误分支 | 服务器运行非预期版本 |
| **scp 上传 .next/dist 构建产物** | 本地和服务器环境不同 | 运行时 MODULE_NOT_FOUND |
| **从海外服务器 rsync 到国内服务器** | 海外可能有未推送的本地修改 | 版本不一致、代码混合 |
| **使用 sync-*.sh 补丁脚本** | 补丁式部署容易遗漏文件 | 文件版本不一致 |
| **tar 打包上传** | 绕过版本控制，无法审计 | 无法回滚、版本混乱 |

### 2.1 通用禁止行为

| 禁止行为 | 原因 | 违规后果 |
|----------|------|----------|
| **未明确目标服务器直接部署** | 两套服务器配置完全不同 | 部署到错误服务器 |
| **未阅读 DEPLOYMENT.md 直接部署** | 不了解部署流程 | 部署错误、服务崩溃 |
| **在本地构建后复制 `node_modules` 到服务器** | 本地和服务器环境不同 | MODULE_NOT_FOUND |
| **在本地构建后复制 `dist` 或 `.next` 到服务器** | Node.js 版本、系统库可能不同 | 运行时错误 |
| **不使用 Git-Only 方式部署** | 绕过版本控制 | 功能回退、旧版本运行 |
| **跳过数据库迁移步骤** | schema 不匹配 | 500 错误 |
| **未备份数据库执行破坏性操作** | 数据不可恢复 | 数据永久丢失 |
| **在生产服务器直接修改代码** | 代码未经过版本控制 | 无法回滚 |

### 2.2 国内专属禁止行为

| 禁止行为 | 原因 | 违规后果 |
|----------|------|----------|
| **只部署服务器A而忽略服务器B** | 数据库在服务器B | 数据库未更新 |
| **在服务器A本地运行 PostgreSQL** | 数据库应在服务器B | 资源竞争 |
| **使用 `.env.global` 部署国内** | 国内需要 `.env.china` | 连接不到数据库 |
| **未同步 `public` 目录部署 WEB** | 遗漏导致静态资源 404 | manifest.json 404 |
| **未同步 `next.config.js` 部署 WEB** | rewrites 不生效 | API 请求 404 |
| **在 PM2 中设置 `NEXT_PUBLIC_*`** | 必须在构建时注入 | 环境变量不生效 |
| **未开放安全组端口** | 需显式配置 | 服务无法访问 |
| **使用 `Partitioned` Cookie** | HTTP 环境下不兼容 | 登录循环 |
| **.env.china 中缺少 COS 配置** | 封面/头像上传依赖 COS | 上传 503 错误 |
| **.env 文件未同步 `.env.china` 配置** | `start-api.sh` 只加载 `.env` | 上传提示"配置未完成" |
| **支付宝配置部署到海外服务器** | 支付宝仅支持国内版 | 海外服务器报错/配置冲突 |
| **支付宝 APPID 使用 PID** | APPID 和 PID 是不同的 | 支付宝提示"商家订单参数异常" |
| **支付宝密钥不匹配** | 商户私钥和上传到平台的公钥必须配对 | 支付宝验签失败，提示"商家订单参数异常" |
| **支付宝 SDK 未切换为正式环境** | 沙箱需 `EnvUtils.setEnv(SANDBOX)`，正式版必须移除 | 支付宝走错环境 |

### 2.3 海外专属禁止行为

| 禁止行为 | 原因 | 违规后果 |
|----------|------|----------|
| **只部署应用层而忽略数据层** | 数据库在新加坡数据层 | 数据库未更新 |
| **在应用层本地运行 PostgreSQL** | 数据库应在数据层 | 资源竞争、数据不一致 |
| **使用 `.env.china` 部署海外** | 海外需要 `.env.global` | Provider 配置错误 |
| **SSH 隧道未运行即部署** | 应用层无法连接数据层 | 数据库连接失败 |
| **.env.global 中缺少 COS 配置** | 封面/头像上传依赖 COS | 上传 503 错误 |
| **.env 文件未同步 `.env.global` / `.env.china` 配置** | `start-api.sh` 只加载 `.env` | 上传提示"配置未完成" |

---

## 3. 部署检查清单

### 3.1 确认目标服务器

- [ ] **目标市场已确认** — `global` 或 `china`
- [ ] **目标服务器 IP 已确认**：
  - 海外应用层（雅加达）：`43.157.240.68`
  - 海外数据层（新加坡）：`43.133.44.232`
  - 国内应用层：`43.136.82.88`
  - 国内数据层：`114.132.81.246`

### 3.2 海外检查清单

- [ ] **应用层 IP**：`43.157.240.68`
- [ ] **数据层 IP**：`43.133.44.232`
- [ ] **SSH 用户**：`ubuntu`
- [ ] **环境变量文件**：`.env.global`
- [ ] **PM2 进程名**：`linkchest-api-global`
- [ ] **SSH 隧道已运行**：`systemctl status autossh-tunnel`
- [ ] **部署脚本**：`bash deploy/deploy.sh global` 或 `bash update-server.sh`
- [ ] **数据库在数据层（新加坡）**
- [ ] **COS 对象存储已配置**：`.env.global` 中包含 `COS_SECRET_ID`、`COS_SECRET_KEY`、`COS_BUCKET`、`COS_REGION`
- [ ] **COS 连通性已验证**：部署后测试封面上传/头像上传功能正常

### 3.3 国内检查清单

- [ ] **应用层 IP**：`43.136.82.88`
- [ ] **数据层 IP**：`114.132.81.246`
- [ ] **环境变量文件**：`.env.china`
- [ ] **PM2 进程名**：`linkchest-api-china`
- [ ] **数据库在服务器B**
- [ ] **安全组端口已开放** — 80, 3001, 5432
- [ ] **WEB 部署文件清单**：`.next/`, `public/`, `package.json`, `next.config.js`, `.env.production`
- [ ] **COS 对象存储已配置**：`.env.china` 中包含 `COS_SECRET_ID`、`COS_SECRET_KEY`、`COS_BUCKET`、`COS_REGION`
- [ ] **COS 连通性已验证**：部署后测试封面上传/头像上传功能正常

### 3.4 数据库迁移确认

- [ ] **迁移方式已明确**：`prisma db push`（开发）或 `prisma migrate deploy`（生产）
- [ ] **已创建数据库备份**

### 3.5 环境变量完整性检查（🔴 新增）

> **部署前必须确认 `.env` 文件中包含以下核心配置，缺一不可。**

**API 层必填项：**

```bash
# 核心服务
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
REDIS_URL="redis://..."

# 对象存储 COS（封面/头像上传必需）
COS_SECRET_ID="..."
COS_SECRET_KEY="..."
COS_BUCKET="..."
COS_REGION="ap-singapore"  # 海外 | ap-nanjing / ap-guangzhou 国内

# 邮件推送 SES（验证码/通知必需）
TENCENTCLOUD_SECRET_ID="..."
TENCENTCLOUD_SECRET_KEY="..."
SES_FROM_EMAIL="noreply@linkchest.net"

# 支付宝支付（仅国内版必需）
ALIPAY_APP_ID="2021006160619404"  # 正式版 APPID
ALIPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"  # 商户 RSA2 私钥（PKCS#8）
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"  # 支付宝公钥（验签回调用）
ALIPAY_NOTIFY_URL="https://linkchest.cn/api/payments/alipay/notify"  # 异步通知地址
```

**`.env` 文件同步要求（🔴 关键）：**

`start-api.sh` 启动脚本只加载 `.env` 文件，不加载 `.env.global` 或 `.env.china`。因此：

```bash
# 海外：确保 .env 包含 .env.global 的所有配置
ssh ubuntu@43.157.240.68 "cat /opt/linkchest/api/project/apps/api/.env.global >> /opt/linkchest/api/project/apps/api/.env"

# 国内：确保 .env 包含 .env.china 的所有配置
ssh ubuntu@43.136.82.88 "cat /opt/linkchest/api/project/apps/api/.env.china >> /opt/linkchest/api/project/apps/api/.env"
```

> ⚠️ **注意**：追加前检查 `.env` 是否已有相同配置，避免重复。

**快速验证命令：**

```bash
# 验证 .env.global / .env.china 中有配置
ssh ubuntu@43.157.240.68 "grep -E 'COS_SECRET_ID|COS_SECRET_KEY|COS_BUCKET|COS_REGION|TENCENTCLOUD_SECRET_ID' /opt/linkchest/api/project/apps/api/.env.global"
ssh ubuntu@43.136.82.88 "grep -E 'COS_SECRET_ID|COS_SECRET_KEY|COS_BUCKET|COS_REGION|TENCENTCLOUD_SECRET_ID' /opt/linkchest/api/project/apps/api/.env.china"

# 验证 .env 中有配置（启动脚本实际加载的文件）
ssh ubuntu@43.157.240.68 "grep -E 'COS_SECRET_ID|COS_SECRET_KEY|COS_BUCKET|COS_REGION' /opt/linkchest/api/project/apps/api/.env"
ssh ubuntu@43.136.82.88 "grep -E 'COS_SECRET_ID|COS_SECRET_KEY|COS_BUCKET|COS_REGION' /opt/linkchest/api/project/apps/api/.env"

# 验证支付宝配置（仅国内版）
ssh ubuntu@43.136.82.88 "grep -E 'ALIPAY_APP_ID|ALIPAY_PRIVATE_KEY|ALIPAY_PUBLIC_KEY' /opt/linkchest/api/project/apps/api/.env"
```

**如果以上任何一项返回空，说明环境变量缺失，部署后对应功能将不可用。**

---

## 4. 允许的部署方式

### 4.1 海外部署

```bash
# 正确：统一入口脚本（推荐）
bash deploy/deploy.sh global

# 正确：服务器构建部署（在应用层执行）
ssh ubuntu@43.157.240.68 "cd /opt/linkchest/api && bash deploy/update-server.sh"
```

### 4.2 国内部署

```bash
# 正确：统一入口脚本（推荐）
bash deploy/deploy.sh china

# 正确：数据库操作在数据层执行
ssh ubuntu@114.132.81.246 "cd /opt/linkchest/api/apps/api && npx prisma migrate deploy"
```

### 4.3 严格禁止

- ❌ 手动 `scp` 单个文件到服务器
- ❌ 在本地 `npm run build` 后上传 `.next`
- ❌ 使用 `pm2 delete` 而非 `pm2 restart`
- ❌ 生产环境直接使用 `prisma db push`
- ❌ 国内部署时只更新服务器A而忽略服务器B

---

## 5. 部署后验证

### 5.1 海外验证

```bash
# 应用层验证
ssh ubuntu@43.157.240.68 "pm2 list"
curl -s http://43.157.240.68:3001/api/health
curl -s -o /dev/null -w "%{http_code}" http://43.157.240.68:3003

# 数据层验证
ssh ubuntu@43.133.44.232 "docker ps | grep postgres"
ssh ubuntu@43.157.240.68 "nc -zv 127.0.0.1 5433"

# COS 对象存储验证
ssh ubuntu@43.157.240.68 "grep -E 'COS_SECRET_ID|COS_SECRET_KEY|COS_BUCKET|COS_REGION' /opt/linkchest/api/project/apps/api/.env.global"
```

### 5.2 国内验证

```bash
ssh ubuntu@43.136.82.88 "pm2 list"
curl -s http://43.136.82.88/api/health
curl -s -o /dev/null -w "%{http_code}" http://43.136.82.88/login
curl -s -o /dev/null -w "%{http_code}" http://43.136.82.88/manifest.json
ssh ubuntu@43.136.82.88 "nc -zv 114.132.81.246 5432"

# COS 对象存储验证
ssh ubuntu@43.136.82.88 "grep -E 'COS_SECRET_ID|COS_SECRET_KEY|COS_BUCKET|COS_REGION' /opt/linkchest/api/project/apps/api/.env.china"
```

**必须确认**：所有服务 `online`，API `200`，WEB `200`，静态资源 `200`，无 `Error`、`500`。
**必须确认**：COS 环境变量 4 项齐全（SECRET_ID、SECRET_KEY、BUCKET、REGION），上传功能正常。

---

## 6. 构建安全红线

### 6.1 绝对禁止的构建行为

| 禁止行为 | 原因 | 违规后果 |
|----------|------|----------|
| **在 Windows 本地执行 Gradle/Expo 构建** | 必须使用 WSL | 环境不兼容、构建失败 |
| **使用 `clean` 相关命令** | 删除已缓存依赖 | 下次需重新下载 |
| **使用 `--clean` 参数** | 清除 Android 项目 | 需重新配置镜像和图标 |
| **使用 EAS 构建** | 未安装 eas-cli | 构建失败 |
| **从官方地址下载 Gradle** | 网络极慢或超时 | 构建卡住 |
| **未阅读 BUILD.md 直接构建** | 不了解配置要求 | 构建失败 |

### 6.2 强制检查清单

- [ ] **已阅读 BUILD.md**
- [ ] **确认 WSL 实例** — 国内版用 `linkchest-cn` / 海外版用 `linkchest-global`（必须先 `wsl --list --verbose` 确认实例存在）
- [ ] **验证镜像配置** — 国内镜像
- [ ] **启用缓存** — `org.gradle.caching=true`
- [ ] **禁止 clean**

### 6.3 唯一允许的构建方式

> **WSL distro 说明**：项目使用两个独立 WSL 实例分别构建国内/海外版，distro 名称为 `linkchest-cn` 和 `linkchest-global`。执行前先运行 `wsl --list --verbose` 确认实例可用。

```bash
# 正确：构建国内版 APK（CHINA 市场，package: com.linkchest.app）
wsl -d linkchest-cn -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh

# 正确：构建海外版 APK（GLOBAL 市场，package: com.linkchest.app）
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
```

**禁止**：
- ❌ `npx expo prebuild --platform android --clean`
- ❌ `cd android && ./gradlew assembleRelease`
- ❌ `eas build --platform android`
- ❌ Windows PowerShell/CMD 中执行构建

---

## 7. 阻断机制

### 7.1 部署阻断关键词

- `ssh ubuntu@43.157.240.68`、`ssh ubuntu@43.133.44.232`、`ssh ubuntu@43.136.82.88`、`ssh ubuntu@114.132.81.246`
- `scp`、`rsync`
- `pm2 restart`、`pm2 start`、`pm2 delete`
- `prisma db push`、`prisma migrate deploy`
- `deploy/deploy.sh`

### 7.2 构建阻断关键词

- `gradlew`、`gradle`、`assembleRelease`
- `expo prebuild`、`eas build`
- `clean` + `gradle`/`build`

### 7.3 阻断确认模板

```
⚠️ 高风险操作阻断
┌──────────────────────────────────────────────────┐
│ 检测到 [部署/构建] 操作                           │
│                                                   │
│ 【确认目标】                                        │
│   ⬜ 海外应用层 (43.157.240.68) / 国内 (43.136.82.88) │
│   ⬜ 海外数据层 (43.133.44.232) / 国内 (114.132.81.246) │
│   ⬜ 已选择正确环境变量文件                         │
│   ⬜ 已明确数据库迁移方式                           │
│   ⬜ 已查阅案例集锦                                │
│                                                   │
│ 未全部确认前，禁止执行！                           │
└──────────────────────────────────────────────────┘

请确认 [Y/N]
```

---

*最后更新：2026-06-01*  
*版本：v1.2 — 新增环境变量完整性检查（§3.5）、COS配置验证、部署后COS检查命令*
