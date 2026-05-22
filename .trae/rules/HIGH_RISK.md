---
alwaysApply: true
description: 高风险操作规则 - 部署与构建安全（橙色区域）
---

# HIGH_RISK.md — 高风险操作（橙色区域）

> 本文档定义部署服务和构建APK时的高风险操作，违反可能导致服务中断或构建失败。
> **本规则 alwaysApply: true，任何Agent在任何场景下都必须遵守。**
> **案例与规则分离**：异常案例请查阅 [服务构建异常案例集锦](cases/service-build-errors.md)。

---

## 1. 服务器信息速查表

### 1.1 海外服务器（单体架构）

| 配置项 | 值 |
|--------|-----|
| IP | `43.133.44.232` |
| 区域 | 新加坡 (`ap-singapore`) |
| 用户 | `ubuntu` |
| 架构 | 单体（API + WEB + DB + Redis 同一台） |
| 项目目录 | `/opt/linkchest/api` |
| PM2 进程名 | `linkchest-api-global` |
| 环境变量文件 | `.env.global` |

### 1.2 国内服务器（应用层 + 数据层分离）

| 服务器 | IP | 配置 | 用途 |
|--------|-----|------|------|
| 服务器A（应用层） | `43.136.82.88` | 4核8G5M | API + WEB + Redis + Nginx |
| 服务器B（数据层） | `114.132.81.246` | 2核4G6M | PostgreSQL 16 |

| 配置项 | 服务器A（应用层） | 服务器B（数据层） |
|--------|------------------|------------------|
| 用户 | `ubuntu` | `ubuntu` |
| 项目目录 | `/opt/linkchest/api` | `/opt/linkchest/api` |
| PM2 进程名 | `linkchest-api-china` | - |
| 环境变量文件 | `.env.china` | `.env.china` |
| PostgreSQL | - | `5432` |
| Redis | `6379` | - |

---

## 2. 部署安全红线

### 2.1 通用禁止行为

| 禁止行为 | 原因 | 违规后果 |
|----------|------|----------|
| **未明确目标服务器直接部署** | 两套服务器配置完全不同 | 部署到错误服务器 |
| **未阅读 DEPLOYMENT.md 直接部署** | 不了解部署流程 | 部署错误、服务崩溃 |
| **在本地构建后复制 `node_modules` 到服务器** | 本地和服务器环境不同 | MODULE_NOT_FOUND |
| **在本地构建后复制 `dist` 或 `.next` 到服务器** | Node.js 版本、系统库可能不同 | 运行时错误 |
| **不使用部署脚本手动部署** | 容易遗漏步骤 | 功能回退、旧版本运行 |
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

### 2.3 海外专属禁止行为

| 禁止行为 | 原因 | 违规后果 |
|----------|------|----------|
| **使用两服务器架构部署海外** | 海外是单体架构 | 过度复杂化 |
| **使用 `.env.china` 部署海外** | 海外需要 `.env.global` | Provider 配置错误 |

---

## 3. 部署检查清单

### 3.1 确认目标服务器

- [ ] **目标市场已确认** — `global` 或 `china`
- [ ] **目标服务器 IP 已确认**：
  - 海外：`43.133.44.232`
  - 国内应用层：`43.136.82.88`
  - 国内数据层：`114.132.81.246`

### 3.2 海外检查清单

- [ ] **服务器 IP**：`43.133.44.232`
- [ ] **SSH 用户**：`ubuntu`
- [ ] **环境变量文件**：`.env.global`
- [ ] **PM2 进程名**：`linkchest-api-global`
- [ ] **部署脚本**：`bash deploy-api.sh` 或 `bash update-server.sh`

### 3.3 国内检查清单

- [ ] **应用层 IP**：`43.136.82.88`
- [ ] **数据层 IP**：`114.132.81.246`
- [ ] **环境变量文件**：`.env.china`
- [ ] **PM2 进程名**：`linkchest-api-china`
- [ ] **数据库在服务器B**
- [ ] **安全组端口已开放** — 80, 3001, 5432
- [ ] **WEB 部署文件清单**：`.next/`, `public/`, `package.json`, `next.config.js`, `.env.production`

### 3.4 数据库迁移确认

- [ ] **迁移方式已明确**：`prisma db push`（开发）或 `prisma migrate deploy`（生产）
- [ ] **已创建数据库备份**

---

## 4. 允许的部署方式

### 4.1 海外部署

```bash
# 正确：代码拷贝部署
bash deploy-api.sh

# 正确：服务器构建部署
bash update-server.sh
```

### 4.2 国内部署

```bash
# 正确：使用国内部署脚本
bash deploy/deploy.sh 43.136.82.88 china

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
ssh ubuntu@43.133.44.232 "pm2 list"
curl -s http://43.133.44.232:3001/api/health
curl -s -o /dev/null -w "%{http_code}" http://43.133.44.232:3003
```

### 5.2 国内验证

```bash
ssh ubuntu@43.136.82.88 "pm2 list"
curl -s http://43.136.82.88/api/health
curl -s -o /dev/null -w "%{http_code}" http://43.136.82.88/login
curl -s -o /dev/null -w "%{http_code}" http://43.136.82.88/manifest.json
ssh ubuntu@43.136.82.88 "nc -zv 114.132.81.246 5432"
```

**必须确认**：所有服务 `online`，API `200`，WEB `200`，静态资源 `200`，无 `Error`、`500`。

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
- [ ] **确认 WSL 实例** — `linkchest`
- [ ] **验证镜像配置** — 国内镜像
- [ ] **启用缓存** — `org.gradle.caching=true`
- [ ] **禁止 clean**

### 6.3 唯一允许的构建方式

```bash
# 正确：通过 WSL 执行构建脚本
wsl -d linkchest -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
```

**禁止**：
- ❌ `npx expo prebuild --platform android --clean`
- ❌ `cd android && ./gradlew assembleRelease`
- ❌ `eas build --platform android`
- ❌ Windows PowerShell/CMD 中执行构建

---

## 7. 阻断机制

### 7.1 部署阻断关键词

- `ssh ubuntu@43.133.44.232`、`ssh ubuntu@43.136.82.88`、`ssh ubuntu@114.132.81.246`
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
│   ⬜ 海外 (43.133.44.232) / 国内 (43.136.82.88)   │
│   ⬜ 已选择正确环境变量文件                         │
│   ⬜ 已明确数据库迁移方式                           │
│   ⬜ 已查阅案例集锦                                │
│                                                   │
│ 未全部确认前，禁止执行！                           │
└──────────────────────────────────────────────────┘

请确认 [Y/N]
```

---

*最后更新：2026-05-20*
*版本：v1.0 — 从 RED_LINES.md 拆分独立*
