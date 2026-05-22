---
alwaysApply: false
description: 可用 Skill 与 ECC Skill 指南 - 定义实际可用的自动化工具
---
# AGENTS.md — Skill 与工具指南

> 本文档列出项目中**实际可用**的 Skill 和 ECC Skill，帮助开发者快速找到合适的工具。

---

## 1. 项目自定义 Skill（4 个）

| Skill | 用途 | 触发时机 | 绑定规则 |
|-------|------|----------|----------|
| `deploy-linkchest` | 部署自动化引导 | 部署/deploy/上线/ssh ubuntu@/pm2 | HIGH_RISK.md + DEPLOYMENT.md |
| `build-error-diagnose` | 构建错误自动诊断 | 构建失败/编译错误/gradle | BUILD_RED_LINES.md + BUILD.md |
| `check-servers` | 服务器健康检查 | 检查服务器/服务状态/健康检查 | HIGH_RISK.md |
| `rule-validator` | 规则文件验证 | 验证规则/创建规则 | INDEX.md |

### deploy-linkchest

- **触发关键词**：部署、deploy、上线、发布、ssh ubuntu@、pm2 restart
- **执行流程**：确认目标服务器（海外/国内）→ 引导 git pull → 执行部署脚本 → 验证服务状态
- **关联案例**：[service-build-errors.md](../cases/service-build-errors.md)

### build-error-diagnose

- **触发关键词**：构建失败、编译错误、build error、gradle 报错
- **执行流程**：解析错误日志 → 匹配案例集锦 → 输出修复方案
- **关联案例**：[apk-build-errors.md](../cases/apk-build-errors.md)

### check-servers

- **触发关键词**：检查服务器、服务器状态、健康检查、服务是否正常
- **执行流程**：SSH 连接目标服务器 → 检查 PM2/API/WEB 状态 → 输出健康报告
- **关联案例**：[service-build-errors.md](../cases/service-build-errors.md)

### rule-validator

- **触发关键词**：验证规则、创建规则、修改规则文件
- **执行流程**：检查文件头格式 → 验证命名规范 → 确认注册状态
- **关联规则**：[INDEX.md](../INDEX.md)

---

## 2. 可用 ECC Skill（7 个推荐）

ECC（Everything Claude Code）Skill 是平台级技能，在 Trae 中可直接调用。

| ECC Skill | 用途 | 触发时机 | 推荐度 |
|-----------|------|----------|--------|
| `backend-patterns` | Node.js/Express 架构模式 | 设计API/中间件/数据库查询 | ★★★★★ |
| `database-migrations` | Prisma 迁移最佳实践 | schema变更/数据迁移 | ★★★★★ |
| `security-review` | 安全漏洞检测 | 认证/支付/用户输入/密钥 | ★★★★☆ |
| `frontend-patterns` | React/Next.js 模式 | 组件/状态管理/性能优化 | ★★★★☆ |
| `git-workflow` | Git 最佳实践 | 分支/commit/合并冲突 | ★★★☆☆ |
| `docker-patterns` | Docker 最佳实践 | docker-compose/容器配置 | ★★★☆☆ |
| `deployment-patterns` | CI/CD 最佳实践 | 部署配置/健康检查/回滚 | ★★★☆☆ |

### 调用说明

- **backend-patterns** — 设计 REST API、编写 Express 中间件、优化数据库查询时调用
- **database-migrations** — 修改 Prisma schema、创建迁移文件、执行数据迁移时调用
- **security-review** — 涉及认证授权、用户输入处理、密钥管理、支付功能时调用
- **frontend-patterns** — 构建 React 组件、设计状态管理方案、优化前端性能时调用
- **git-workflow** — 规划分支策略、规范 commit message、处理合并冲突时调用
- **docker-patterns** — 编写 Dockerfile、配置 docker-compose、容器网络调试时调用
- **deployment-patterns** — 配置 CI/CD 流水线、设计健康检查、规划回滚策略时调用

---

## 3. 场景推荐配置

| 场景 | 调用 |
|------|------|
| 部署更新 | `deploy-linkchest` Skill |
| 构建失败 | `build-error-diagnose` Skill |
| 检查服务器 | `check-servers` Skill |
| 开发 API | `backend-patterns` ECC Skill |
| 修改数据库 | `database-migrations` ECC Skill |
| 涉及安全代码 | `security-review` ECC Skill |
| 开发前端组件 | `frontend-patterns` ECC Skill |
| 创建/修改规则 | `rule-validator` Skill |

---

## 4. MCP 工具

| MCP | 用途 |
|-----|------|
| GitHub | PR管理、Issue追踪、代码搜索、部署前检查 |
| Playwright | 部署后自动验证WEB页面、E2E测试 |

---

*最后更新：2026-05-22*
*版本：v2.0 — 移除虚构 Agent，仅保留实际可用工具*
