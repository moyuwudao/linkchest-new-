---
name: "deploy-linkchest"
description: "LinkChest 部署自动化 - 引导完成海外(global)或国内(china)服务器的完整部署流程。当用户提到部署、deploy、上线、发布、ssh到服务器、pm2操作时自动触发。"
---

# Deploy LinkChest Skill

LinkChest 项目部署自动化，引导完成海外（global）或国内（china）服务器的完整部署流程。

## 核心原则：Git-Only 部署

**所有代码更新通过服务器端 `git pull`，禁止本地 rsync/scp 推送代码。**

部署流程：本地 `git push` → 服务器 `git pull` → 服务器端构建/重启。

## 触发时机

- 用户提到：部署、deploy、上线、发布、推送到服务器
- 用户执行：`ssh ubuntu@43.133.44.232`、`ssh ubuntu@43.136.82.88`
- 用户执行：`pm2 restart`、`pm2 start`
- 用户执行：`scp` 到服务器

## 深度绑定规则

- **必须加载**：`HIGH_RISK.md`（服务器信息 + 部署红线）
- **必须加载**：`DEPLOYMENT.md`（部署流程细节）
- **必须加载**：`BUILD_RED_LINES.md`（构建红线，如果涉及构建）
- **参考案例**：`cases/service-build-errors.md`

## 部署流程引导

### Step 1: 确认目标市场

| 市场 | 服务器 | 架构 |
|------|--------|------|
| 海外 (global) | IP: `43.133.44.232` | 单体架构（API + WEB + DB + Redis 同一台） |
| 国内 (china) | 应用层: `43.136.82.88`，数据层: `114.132.81.246` | 应用层 + 数据层分离 |

### Step 2: 部署前 Git 状态检查（GitHub MCP 增强）

在执行任何部署命令前，**必须**依次检查：

```bash
# 检查本地是否有未提交的更改
git status --porcelain

# 检查是否有未推送的提交
git log origin/master..HEAD --oneline
```

**GitHub MCP 增强检查**（当 GitHub MCP 可用时自动执行）：

- 使用 `mcp_GitHub_list_commits` 获取 master 分支最新 5 个 commit，与本地 HEAD 对比
- 使用 `mcp_GitHub_list_pull_requests` 检查是否有待合并的 PR
- 如发现远程有新 commit 而本地未 pull → **警告用户**先执行 `git pull --rebase`

- 如果有未提交的更改，**警告用户**：服务器不会获取到最新代码，请先 commit
- 如果有未推送的提交，**警告用户**：服务器不会获取到最新代码，请先 push

### Step 3: 部署前检查清单

- [ ] 本地无未提交的更改（`git status --porcelain` 为空）
- [ ] 本地无未推送的提交（`git log origin/master..HEAD` 为空）
- [ ] 确认目标服务器 IP
- [ ] 确认环境变量文件（`.env.global` / `.env.china`）
- [ ] 确认 PM2 进程名（海外: `linkchest-api-global`，国内: `linkchest-api-china`）
- [ ] 已查阅案例集锦 `cases/service-build-errors.md`

### Step 4: 执行部署

**统一入口（推荐）**：

```bash
bash deploy/deploy.sh global    # 海外
bash deploy/deploy.sh china     # 国内
```

**直接 SSH（适合已登录服务器时）**：

```bash
# 海外
ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api && git pull && bash deploy/update-server.sh"

# 国内
ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && git pull && bash deploy/update-server-cn.sh"
```

### Step 5: 部署后验证（Playwright MCP 增强）

**基础验证**：

```bash
# 海外
curl -s http://43.133.44.232:3001/api/health
ssh ubuntu@43.133.44.232 "pm2 status"

# 国内
curl -s http://43.136.82.88/api/health
ssh ubuntu@43.136.82.88 "pm2 status"
```

**Playwright MCP 增强验证**（当 Playwright MCP 可用时自动执行）：

| 验证项 | 操作 | 预期 |
|--------|------|------|
| 首页加载 | 打开 WEB 首页 URL | 页面正常渲染，无白屏 |
| 登录页面 | 打开 /login | 表单可交互 |
| API 代理 | 发起一个 API 请求 | 返回 200，无 CORS 错误 |
| 静态资源 | 加载 manifest.json | 返回 200 |

- 海外 WEB URL：`http://43.133.44.232:3003`
- 国内 WEB URL：`http://43.136.82.88`

**验证标准**：所有服务 `online`，API 返回 `200`，Playwright 页面验证通过，无 `Error` 或 `500`。

### Step 6: 异常处理

| 异常现象 | 可能原因 | 处理方式 |
|----------|----------|----------|
| API 返回 500 | 数据库 schema 不匹配 | 检查是否需要 `prisma migrate deploy` |
| WEB 返回 MODULE_NOT_FOUND | 依赖未安装 | 在服务器上重新 `npm install && npm run build` |
| git pull 失败 | 服务器有本地修改冲突 | SSH 到服务器执行 `git stash` 后重试 |
| 连接失败 | SSH 免密未配置或网络问题 | 检查 SSH 免密登录配置 |
| PM2 进程 offline | 启动失败 | `pm2 logs` 查看错误日志 |

详细异常处理请查阅 `cases/service-build-errors.md`。

## 绝对禁止（红线）

以下操作**严格禁止**，违反将破坏 Git-Only 部署策略：

| 禁止行为 | 原因 |
|----------|------|
| **rsync 本地代码到服务器** | 绕过 Git 版本控制，服务器状态不可追溯 |
| **scp 上传 .next/dist 构建产物** | 构建环境不一致，服务器无法复现 |
| **从海外服务器 rsync 到国内服务器** | 环境配置不同，可能导致配置污染 |
| **使用 sync-*.sh 补丁脚本** | 绕过 Git，补丁散落各处难以维护 |
| **tar 打包上传** | 绕过版本控制，无法追踪部署版本 |

唯一合法的代码传输路径：`git push` → `git pull`。

## GitHub 镜像加速（国内服务器）

国内服务器访问 GitHub 可能较慢，`deploy/update-server-cn.sh` 已内置镜像加速逻辑：

- **镜像地址**：`https://ghfast.top`
- **工作原理**：脚本自动检测 remote URL，若未配置镜像则自动切换为 `ghfast.top` 代理
- **无需手动操作**：首次部署时 `deploy/setup-server-cn.sh` 会自动完成配置
- **回退方案**：如镜像失效，SSH 到服务器手动修改 `git remote set-url origin`

## 脚本清单

| 脚本 | 用途 |
|------|------|
| `deploy/deploy.sh` | 统一入口（Git-Only） |
| `deploy/update-server.sh` | 海外服务器端更新 |
| `deploy/update-server-cn.sh` | 国内服务器端更新（含 GitHub 镜像加速） |
| `deploy/check-servers.sh` | 健康检查 |
| `deploy/setup-server.sh` | 海外首次初始化 |
| `deploy/setup-server-cn.sh` | 国内首次初始化 |

## ECC Skill 协同

部署过程中根据操作内容自动加载对应 ECC Skill：

| 操作内容 | 自动加载的 ECC Skill |
|----------|---------------------|
| 涉及数据库 schema 变更 | `database-migrations`（Prisma 迁移最佳实践） |
| 涉及 Nginx/Docker 配置 | `deployment-patterns`（CI/CD 最佳实践） |
| 涉及认证/安全相关代码 | `security-review`（安全漏洞检测） |

## 自动触发机制

当检测到部署关键词时，AI 必须：

1. 先加载 `HIGH_RISK.md` 获取服务器信息
2. 确认目标市场（global / china）
3. 执行 Git 状态检查（`git status --porcelain` + `git log origin/master..HEAD`）
4. 按本 Skill 流程引导
5. 每一步都验证结果再进入下一步

## 与规则的绑定关系

```
用户触发部署 → 加载本 Skill
    ↓
加载 HIGH_RISK.md（服务器信息 + 红线）
    ↓
GitHub MCP 检查（远程 commit 对比 + 待合并 PR）
    ↓
Git 状态检查（未提交？未推送？）
    ↓
加载 DEPLOYMENT.md（详细流程）
    ↓
执行 Git-Only 部署
    ↓
数据库变更？→ 加载 `database-migrations` ECC Skill
    ↓
验证：curl 健康检查 + Playwright MCP 页面验证
    ↓
异常时查案例集锦
```

## 使用示例

### 部署海外服务器

```
用户: 部署到海外服务器
AI: 1. 确认目标市场为 global
    2. 加载 HIGH_RISK.md 确认服务器信息
    3. 执行 Git 状态检查
    4. 执行 bash deploy/deploy.sh global
    5. 验证部署结果
```

### 部署国内服务器（含数据库变更）

```
用户: 部署到国内服务器，有数据库变更
AI: 1. 确认目标市场为 china
    2. 加载 HIGH_RISK.md 确认双服务器架构
    3. 执行 Git 状态检查
    4. 执行 bash deploy/deploy.sh china（应用层）
    5. 部署数据层（114.132.81.246）执行 prisma migrate
    6. 验证两端部署结果
```

## 常见问题

### Q: 为什么不能用 rsync/scp 直接推送代码？
A: Git-Only 策略保证每次部署都有版本记录，可以随时回滚。直接推送代码会导致服务器版本与 Git 历史脱节，出问题时无法追溯。

### Q: 海外和国内的部署方式为什么不同？
A: 海外是单体架构，所有服务在一台服务器上；国内是应用层 + 数据层分离，需要分别部署两台服务器。

### Q: 什么时候需要执行数据库迁移？
A: 当 Prisma schema 有变更时（`schema.prisma` 文件有修改），需要在数据层执行 `prisma migrate deploy`。

### Q: 部署失败后如何回滚？
A: 通过 `git checkout` 回退到上一个稳定版本，然后重新执行部署流程。
