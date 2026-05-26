---
name: "check-servers"
description: "服务器健康检查 - 一键检查所有 LinkChest 服务器状态（海外/国内）。当用户提到检查服务器、服务器状态、健康检查、服务是否正常时自动触发。"
---

# Check Servers Skill

一键检查所有 LinkChest 服务器状态，覆盖海外单体服务器和国内双服务器架构。

## 触发时机

- 用户提到：检查服务器、服务器状态、健康检查、服务是否正常
- 部署前后需要验证服务器状态
- 用户打开 check-servers.sh 文件时

## 深度绑定规则

- **必须加载**：`HIGH_RISK.md`（服务器信息速查表 §1）

## 服务器清单

| 名称 | IP | 市场 | 架构 |
|------|-----|------|------|
| linkchest-global | `43.133.44.232` | 海外 | 单体（API+WEB+DB+Redis） |
| linkchest-cn-app | `43.136.82.88` | 国内-应用层 | API+WEB+Redis+Nginx |
| linkchest-cn-db | `114.132.81.246` | 国内-数据层 | PostgreSQL 16 |

## 检查项目

### 海外服务器检查

1. SSH 连接 → `ssh ubuntu@43.133.44.232`
2. PM2 进程状态 → `pm2 status`
3. API 健康检查 → `curl http://43.133.44.232:3001/api/health`
4. WEB 页面 → `curl http://43.133.44.232:3003`
5. 数据库 → `docker exec linkchest-db pg_isready`
6. Redis → `docker exec linkchest-redis redis-cli ping`

### 国内应用层检查

1. SSH 连接 → `ssh ubuntu@43.136.82.88`
2. PM2 进程状态 → `pm2 status`
3. API 健康检查 → `curl http://43.136.82.88/api/health`（通过 Nginx）
4. WEB 页面 → `curl http://43.136.82.88/login`
5. Redis → `docker exec linkchest-redis redis-cli ping`
6. 数据库连接 → `nc -zv 114.132.81.246 5432`

### 国内数据层检查

1. SSH 连接 → `ssh ubuntu@114.132.81.246`
2. PostgreSQL → `docker exec linkchest-db pg_isready`

## 快速执行方式

### 方式 1：一键脚本（推荐）

```bash
bash project/deploy/check-servers.sh
```

```bash
bash project/deploy/check-servers.sh global
```

```bash
bash project/deploy/check-servers.sh china
```

### 方式 2：AI 逐步检查

AI 按照上述检查项目逐项执行，汇总报告。

### 方式 3：Chrome DevTools MCP 深度验证（推荐）

Chrome DevTools MCP 可检测 curl 和 Playwright 无法发现的问题：

| 验证项 | MCP 操作 | 预期 |
|--------|----------|------|
| 页面渲染 | `navigate_page(WEB_URL)` + `take_screenshot` | 无白屏，元素正常 |
| Console 日志 | `list_console_messages` | 无 Error/404/500 |
| API 代理 | `list_network_requests` 过滤 API | 所有请求 200 |
| 静态资源 | `list_network_requests` 过滤 manifest/static | manifest.json 200 |
| CORS | `list_console_messages` 过滤 CORS | 无跨域报错 |

- 海外 WEB URL：`http://43.133.44.232:3003`
- 国内 WEB URL：`http://43.136.82.88`

### 方式 4：Playwright MCP 页面验证（降级方案）

当 Chrome DevTools MCP 不可用时使用：

| 验证项 | URL | 预期 |
|--------|-----|------|
| 海外首页 | `http://43.133.44.232:3003` | 页面正常渲染 |
| 海外登录 | `http://43.133.44.232:3003/login` | 表单可交互 |
| 国内首页 | `http://43.136.82.88` | 页面正常渲染 |
| 国内登录 | `http://43.136.82.88/login` | 表单可交互 |
| 静态资源 | `/manifest.json` | 返回 200 |

### 方式 5：PostgreSQL MCP 数据库健康检查（本地开发）

当本地 Docker PostgreSQL 可用时，直接通过 MCP 检查数据库：

| 检查项 | PostgreSQL MCP 操作 | 预期 |
|--------|---------------------|------|
| 连接状态 | `SELECT 1` | 返回 1 |
| 表统计 | `SELECT relname, n_live_tup FROM pg_stat_user_tables` | 核心表存在 |
| 迁移状态 | `SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3` | 最新迁移已应用 |
| 慢查询检测 | `SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5` | 定位慢查询 |

## 输出报告格式

```
🖥️ 服务器健康检查报告
========================================

▶ 海外服务器（单体）
  SSH:       ✓ 正常
  PM2:       ✓ 运行中
  API:       ✓ 200 OK
  WEB curl:  ✓ 200 OK
  WEB 页面:  ✓ Playwright 渲染正常
  DB:        ✓ 就绪
  Redis:     ✓ PONG

▶ 国内-应用层
  SSH:       ✓ 正常
  PM2:       ✓ 运行中
  API:       ✓ 200 OK
  WEB curl:  ✓ 200 OK
  WEB 页面:  ✓ Playwright 渲染正常
  Redis:     ✓ PONG
  DB连接:    ✓ 可达

▶ 国内-数据层
  SSH:       ✓ 正常
  DB:        ✓ 就绪

========================================
总结: 3/3 服务器正常 ✓
```

## 异常处理

- SSH 失败 → 检查免密登录配置
- PM2 异常 → `pm2 logs` 查看错误日志
- API 500 → 检查数据库连接和 Prisma
- WEB 异常 → 检查 .next 构建状态
- DB 不可达 → 检查 Docker 容器状态

## ECC Skill 协同

健康检查过程中根据发现的异常自动加载对应 ECC Skill：

| 发现的异常 | 自动加载的 ECC Skill |
|-----------|---------------------|
| Docker 容器异常 | `docker-patterns`（容器配置与排障） |
| Nginx 配置问题 | `deployment-patterns`（部署配置最佳实践） |
| 安全头缺失 | `security-review`（安全配置检测） |

## 自动触发机制

当用户要求检查服务器时，AI 必须：

1. 先加载 `HIGH_RISK.md` 获取服务器信息
2. 按本 Skill 检查清单执行
3. 输出汇总报告
4. 如有异常，给出修复建议

## 与规则的绑定关系

```
用户触发检查 → 加载本 Skill
    ↓
加载 HIGH_RISK.md（服务器信息）
    ↓
执行 check-servers.sh 或逐项检查
    ↓
curl 健康检查通过？
    ↓ 是
Chrome DevTools MCP 深度页面验证（Console/Network/Screenshot）
    ↓  若 Chrome DevTools 不可用，降级到 Playwright MCP
PostgreSQL MCP 数据库验证（本地开发）
    ↓
输出报告
    ↓
Docker 异常？→ 加载 `docker-patterns` ECC Skill
Nginx 异常？→ 加载 `deployment-patterns` ECC Skill
安全头缺失？→ 加载 `security-review` ECC Skill
    ↓
给出修复建议
```
