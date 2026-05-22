---
alwaysApply: false
description: ECC Skill 触发规则 - 定义何时自动加载平台提供的 ECC Skill
---

# ECC Skill 触发规则

> 本文档定义 LinkChest 项目中何时自动加载平台提供的 ECC Skill。
> ECC Skill 由 Trae 平台提供，无需本地安装，AI 根据场景自动调用。

## 触发矩阵

| ECC Skill | 触发场景 | 检测关键词/文件 |
|-----------|----------|----------------|
| `backend-patterns` | 设计 API 端点、编写中间件、优化数据库查询 | router/controller/middleware/prisma/express |
| `database-migrations` | 修改 Prisma schema、执行数据迁移 | schema.prisma/prisma migrate/db push |
| `security-review` | 涉及认证、支付、用户输入、密钥处理 | auth/token/password/jwt/payment/validator |
| `frontend-patterns` | 构建 React 组件、状态管理、表单处理 | component/hook/state/form/useEffect |
| `git-workflow` | 分支管理、合并冲突、rebase | git merge/git rebase/merge conflict |
| `docker-patterns` | docker-compose 配置、容器排障 | docker-compose/Dockerfile/container |
| `deployment-patterns` | 部署配置、CI/CD、Nginx、PM2 | nginx/pm2/deploy/CI/CD |

## 加载优先级

1. **自动加载**：检测到触发关键词时，AI 自动参考 ECC Skill 的最佳实践
2. **显式调用**：用户可以直接说"使用 backend-patterns Skill"
3. **Skill 协同**：项目自定义 Skill（deploy-linkchest 等）在流程中声明需要协同的 ECC Skill

## 与项目 Skill 的协同关系

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

*版本：v1.0 — 2026-05-22*
