---
alwaysApply: false
description: 可用 Skill 与 MCP 工具指南 - 定义实际可用的自动化工具
---
# AGENTS.md — Skill 与 MCP 工具指南（唯一来源）

> **本文档为 Skill / MCP 工具定义的唯一来源（Single Source of Truth）。**
> 其他文件（INTERACTION.md 等）应引用此处，不得重复声明 Skill 触发条件或 MCP 清单。
> 本文档列出项目中**实际可用**的 Skill、ECC Skill 和 MCP 工具，帮助开发者快速找到合适的工具。

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
- **关联 MCP**：aliyun-servers（SSH执行）+ GitHub（commit检查）+ Chrome DevTools（页面验证）+ PostgreSQL（DB验证）
- **关联案例**：[service-build-errors.md](../cases/service-build-errors.md)

### build-error-diagnose

- **触发关键词**：构建失败、编译错误、build error、gradle 报错
- **执行流程**：解析错误日志 → 匹配案例集锦 → 输出修复方案
- **关联案例**：[apk-build-errors.md](../cases/apk-build-errors.md)

### check-servers

- **触发关键词**：检查服务器、服务器状态、健康检查、服务是否正常
- **执行流程**：SSH 连接目标服务器 → 检查 PM2/API/WEB 状态 → 输出健康报告
- **关联 MCP**：aliyun-servers（SSH）+ Chrome DevTools（页面验证）+ PostgreSQL（DB健康）
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

> **⚠️ ECC Skill 不自动触发。** 仅在用户显式调用或任务精确命中单个 Skill 场景时加载（详见 [ECC_SKILLS.md](../ECC_SKILLS.md)）。

- **backend-patterns** — 设计 REST API、编写 Express 中间件、优化数据库查询时调用
- **database-migrations** — 修改 Prisma schema、创建迁移文件、执行数据迁移时调用
- **security-review** — 涉及认证授权、用户输入处理、密钥管理、支付功能时调用
- **frontend-patterns** — 构建 React 组件、设计状态管理方案、优化前端性能时调用
- **git-workflow** — 规划分支策略、规范 commit message、处理合并冲突时调用
- **docker-patterns** — 编写 Dockerfile、配置 docker-compose、容器网络调试时调用
- **deployment-patterns** — 配置 CI/CD 流水线、设计健康检查、规划回滚策略时调用

---

## 3. MCP 工具（6 个）

### 3.1 已有 MCP

| MCP | 用途 | 典型场景 |
|-----|------|----------|
| **aliyun-servers** | SSH 服务器管理、远程命令执行、SFTP 文件读写 | 部署、健康检查、日志查看 |
| **GitHub** | 仓库操作、Issue/PR 管理、代码搜索 | 部署前 commit 检查、代码审查 |
| **Playwright** | 浏览器自动化、E2E 测试 | 部署后页面验证、交互测试 |

### 3.2 新增 MCP（2026-05-25）

| MCP | 核心能力 | 典型场景 |
|-----|----------|----------|
| **Chrome DevTools** | 性能追踪（LCP/CLS/INP）、Console 日志、网络请求检查、DOM 操作、截图 | **性能分析**：录制 Performance Trace → 定位瓶颈<br>**调试**：读取控制台错误 → 复现白屏<br>**部署验证**：打开页面检查渲染/API/CORS |
| **Context7** | 实时拉取 npm 库官方文档（版本匹配） | **编程辅助**：写 Prisma/Next.js/Express/Tailwind 代码时获取最新 API 用法，消除"这个 API 不存在"的幻觉 |
| **PostgreSQL** | 只读查询（SELECT）、EXPLAIN 分析、Schema 内省 | **数据排查**：查用户数据分布<br>**性能调优**：EXPLAIN 分析慢查询<br>**部署验证**：migrate 后检查表状态<br>⚠️ 只读：无法执行 INSERT/UPDATE/DELETE/DDL |

### 3.3 MCP 协同矩阵

| 开发场景 | aliyun-servers | GitHub | Playwright | Chrome DevTools | Context7 | PostgreSQL |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| **部署上线** | ◆◆◆ | ◆◆ | ◆◆ | ◆◆ | - | ◆ |
| **性能分析** | - | - | - | ◆◆◆ | - | ◆◆ |
| **调试白屏** | ◆ | - | ◆ | ◆◆◆ | - | - |
| **写代码** | - | - | - | - | ◆◆◆ | - |
| **数据排查** | ◆ | - | - | - | - | ◆◆◆ |
| **健康检查** | ◆◆◆ | - | ◆ | ◆◆ | - | ◆ |
| **安全审计** | - | - | - | - | - | ◆◆ |

---

## 4. 编程场景推荐配置（MCP 增强版）

| 场景 | 推荐调用 |
|------|----------|
| **部署更新** | `deploy-linkchest` Skill + Chrome DevTools（页面验证） + PostgreSQL（DB验证） |
| **构建失败** | `build-error-diagnose` Skill |
| **检查服务器** | `check-servers` Skill + Chrome DevTools（深度验证） + PostgreSQL（DB健康） |
| **性能优化** | Chrome DevTools（录制 Trace） + PostgreSQL（EXPLAIN 慢查询） + `performance-optimizer` Agent |
| **开发 API** | Context7（查 Express/Prisma 最新 API） + `backend-patterns` ECC Skill |
| **开发前端** | Context7（查 Next.js/Tailwind 最新 API） + `frontend-patterns` ECC Skill |
| **修改数据库** | Context7（查 Prisma schema 语法） + `database-migrations` ECC Skill |
| **安全相关** | `security-review` ECC Skill |
| **创建/修改规则** | `rule-validator` Skill |
| **调试问题** | Chrome DevTools（Console + Network） + PostgreSQL（数据验证） |

---

*最后更新：2026-05-25*
*版本：v3.0 — 新增 Context7 / Chrome DevTools / PostgreSQL MCP，重写场景推荐*
