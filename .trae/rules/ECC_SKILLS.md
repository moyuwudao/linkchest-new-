---
alwaysApply: false
description: ECC Skill 触发规则 - 定义何时自动加载平台提供的 ECC Skill
---

# ECC Skill 触发规则

> 本文档定义 LinkChest 项目中 ECC Skill 的可选参考清单。
> **⚠️ 触发策略**：ECC Skill **不自动触发**。仅当用户显式说「使用 xx Skill」或任务明确符合单个 ECC Skill 的精确场景时才加载。

## 触发策略

| 方式 | 条件 | 说明 |
|------|------|------|
| **用户显式调用** | 用户说「用 backend-patterns」「调用 security-review」 | 直接加载 |
| **精确匹配** | 任务恰好只命中 1 个 ECC Skill 的精确场景 | 可建议调用，但不自动加载 |
| **宽泛匹配** | 任务模糊命中多个 Skill 的触发条件 | **不加载任何 ECC Skill**，避免上下文膨胀 |

## Skill 清单（7 个，按需调用）

| ECC Skill | 触发场景 | 检测关键词/文件 |
|-----------|----------|----------------|
| `backend-patterns` | 设计 API 端点、编写中间件、优化数据库查询 | router/controller/middleware/prisma/express |
| `database-migrations` | 修改 Prisma schema、执行数据迁移 | schema.prisma/prisma migrate/db push |
| `security-review` | 涉及认证、支付、用户输入、密钥处理 | auth/token/password/jwt/payment/validator |
| `frontend-patterns` | 构建 React 组件、状态管理、表单处理 | component/hook/state/form/useEffect |
| `git-workflow` | 分支管理、合并冲突、rebase | git merge/git rebase/merge conflict |
| `docker-patterns` | docker-compose 配置、容器排障 | docker-compose/Dockerfile/container |
| `deployment-patterns` | 部署配置、CI/CD、Nginx、PM2 | nginx/pm2/deploy/CI/CD |

## 使用方式

- **显式调用**：用户说「使用 database-migrations Skill」
- **项目 Skill 协同**：项目自定义 Skill（deploy-linkchest 等）在自身 SKILL.md 中声明需要协同的 ECC Skill

| 项目 Skill | 协同的 ECC Skill | 协同时机 |
|-----------|-----------------|----------|
| `deploy-linkchest` | `database-migrations`, `deployment-patterns`, `security-review` | 部署涉及数据库/Nginx/安全时 |
| `build-error-diagnose` | `docker-patterns` | 构建错误涉及 Docker 时 |
| `check-servers` | `docker-patterns`, `deployment-patterns`, `security-review` | 检查发现容器/Nginx/安全异常时 |
| `rule-validator` | 无 | 独立运行 |

## 注意事项

- ECC Skill 是平台级知识，不替代项目特定规则
- 当 ECC Skill 建议与项目规则冲突时，**以项目规则为准**
- ECC Skill 的加载不消耗项目规则的 token 预算
- **Context7 MCP 协同**：编写代码涉及库 API 时，建议同时调用 Context7 MCP 获取版本匹配的官方文档，避免使用过时 API
- **Chrome DevTools MCP 协同**：部署后验证或性能分析时，优先使用 Chrome DevTools MCP 的 `performance_start_trace` 和 `list_console_messages`

*版本：v1.0 — 2026-05-22*
