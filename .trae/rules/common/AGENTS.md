---
alwaysApply: false
description: Agents使用指南 - 定义可用的Agents及其使用场景
---
# AGENTS.md — Agents 使用指南

> 本文档定义项目中可用的 AI Agents 和技能，帮助开发者选择合适的工具完成任务。

---

## 1. Agents 概览

### 1.1 可用 Agents 列表

| Agent | 分类 | 用途 | 推荐度 |
|-------|------|------|--------|
| **planner** | 规划 | 复杂功能规划 | ✅ 强烈建议 |
| **architect** | 设计 | 系统架构设计 | ✅ 建议 |
| **tdd-guide** | 开发 | TDD 流程指导 | ✅ 强烈建议 |
| **code-reviewer** | 审查 | 通用代码审查 | ✅ 强烈建议 |
| **security-reviewer** | 安全 | 安全审查 | ✅ 强烈建议 |
| **typescript-reviewer** | 审查 | TypeScript 代码审查 | ✅ 建议 |
| **build-error-resolver** | 调试 | 构建错误修复 | ✅ 建议 |
| **refactor-cleaner** | 重构 | 死代码清理 | ⚠️ 可选 |
| **performance-optimizer** | 优化 | 性能优化 | ⚠️ 可选 |

---

## 2. 技能列表 (Skills)

### 2.1 可用技能

| 技能名称 | 分类 | 用途 | 触发时机 | 推荐度 |
|---------|------|------|---------|--------|
| **security-review** | 安全 | 安全漏洞检测和最佳实践检查 | 添加认证、处理用户输入、使用密钥、创建API端点、实现支付功能 | ✅ 强烈建议 |
| **tdd-workflow** | 测试 | 测试驱动开发流程指导 | 编写新功能、修复Bug、重构代码 | ✅ 强烈建议 |
| **backend-patterns** | 后端 | Node.js/Express 架构模式 | 设计API端点、实现中间件、优化数据库查询 | ✅ 强烈建议 |
| **frontend-patterns** | 前端 | React/Next.js 模式和最佳实践 | 构建组件、状态管理、性能优化、表单处理 | ✅ 强烈建议 |
| **database-migrations** | 数据库 | Prisma迁移最佳实践 | 创建/修改表结构、数据迁移、零停机部署 | ✅ 建议 |
| **deployment-patterns** | 部署 | CI/CD和Docker最佳实践 | 配置CI/CD流水线、Docker容器化、健康检查 | ✅ 建议 |
| **architecture-decision-records** | 架构 | ADR记录和管理 | 架构决策、技术选型讨论 | ✅ 建议 |
| **blueprint** | 规划 | 复杂项目蓝图 | 大型功能开发前的详细规划 | ⚠️ 可选 |
| **e2e-testing** | 测试 | Playwright端到端测试 | 关键用户流程测试 | ⚠️ 可选 |
| **benchmark** | 性能 | 性能基准测试 | 性能问题分析、优化验证 | ⚠️ 可选 |

---

## 3. 技能详细说明

### 3.1 安全类

#### security-review
- **用途**：安全漏洞检测和最佳实践检查
- **触发场景**：添加认证、处理用户输入、使用密钥、创建API端点、实现支付功能
- **输出**：安全问题清单、修复建议、安全检查清单验证

### 3.2 测试类

#### tdd-workflow
- **用途**：测试驱动开发流程指导
- **触发场景**：编写新功能、修复Bug、重构代码
- **输出**：测试用例设计、TDD步骤指导、覆盖率验证

#### e2e-testing
- **用途**：端到端测试指导
- **触发场景**：关键用户流程测试
- **输出**：Playwright测试用例、测试执行建议

### 3.3 后端类

#### backend-patterns
- **用途**：Node.js/Express架构模式
- **触发场景**：设计API端点、实现中间件、优化数据库查询
- **输出**：设计模式建议、代码示例、性能优化建议

#### database-migrations
- **用途**：数据库迁移最佳实践
- **触发场景**：创建/修改表结构、数据迁移、零停机部署
- **输出**：迁移策略、SQL示例、安全检查清单

### 3.4 前端类

#### frontend-patterns
- **用途**：React/Next.js模式和最佳实践
- **触发场景**：构建组件、状态管理、性能优化、表单处理
- **输出**：组件设计模式、状态管理方案、性能优化建议

### 3.5 部署类

#### deployment-patterns
- **用途**：CI/CD和Docker最佳实践
- **触发场景**：配置CI/CD流水线、Docker容器化、健康检查
- **输出**：Dockerfile模板、CI配置示例、健康检查端点设计

### 3.6 架构类

#### architecture-decision-records
- **用途**：ADR记录和管理
- **触发场景**：架构决策、技术选型讨论
- **输出**：ADR文档模板、决策记录、索引管理

#### blueprint
- **用途**：复杂项目蓝图规划
- **触发场景**：大型功能开发前的详细规划
- **输出**：实现蓝图、任务拆分、时间预估

### 3.7 性能类

#### benchmark
- **用途**：性能基准测试
- **触发场景**：性能问题分析、优化验证
- **输出**：基准测试方案、性能指标、优化建议

---

## 4. Agent 详细说明

### 4.1 规划类

#### planner
- **用途**：复杂功能的实现规划
- **触发场景**：大型功能开发前
- **输出**：任务拆分、时间预估、实现方案

#### architect
- **用途**：系统架构设计
- **触发场景**：架构决策时
- **输出**：架构图、模块划分、技术选型建议

### 2.2 开发类

#### tdd-guide
- **用途**：测试驱动开发流程指导
- **触发场景**：新功能开发
- **输出**：测试用例设计、TDD 步骤指导

### 2.3 审查类

#### code-reviewer
- **用途**：通用代码质量审查
- **触发场景**：任何代码改动后
- **输出**：审查报告、问题修复建议

#### security-reviewer
- **用途**：安全漏洞审查
- **触发场景**：认证、支付、用户数据相关代码
- **输出**：安全问题清单、修复建议

#### typescript-reviewer
- **用途**：TypeScript 特定代码审查
- **触发场景**：TS/JS 代码改动后
- **输出**：类型问题、最佳实践建议

### 2.4 调试类

#### build-error-resolver
- **用途**：构建错误诊断和修复
- **触发场景**：构建失败时
- **输出**：错误原因分析、修复方案

### 2.5 优化类

#### refactor-cleaner
- **用途**：代码重构和死代码清理
- **触发场景**：技术债务清理时
- **输出**：重构建议、死代码列表

#### performance-optimizer
- **用途**：性能问题分析和优化
- **触发场景**：性能问题排查时
- **输出**：性能瓶颈分析、优化建议

---

## 5. 场景推荐配置

### 5.1 新功能开发

```
推荐流程：planner → tdd-workflow → code-reviewer → security-review

1. planner: 规划功能实现
2. tdd-workflow: 指导 TDD 开发
3. code-reviewer: 代码质量审查
4. security-review: 安全审查
```

### 5.2 Bug 修复

```
推荐流程：code-reviewer → tdd-workflow

1. code-reviewer: 分析问题代码
2. tdd-workflow: 编写测试用例
3. 修复代码
4. code-reviewer: 验证修复
```

### 5.3 代码审查

```
推荐流程：code-reviewer → security-review → typescript-reviewer

1. code-reviewer: 通用代码审查
2. security-review: 安全审查
3. typescript-reviewer: TypeScript 专项审查
```

### 5.4 构建失败

```
推荐流程：build-error-resolver

1. build-error-resolver: 分析错误原因
2. 执行修复建议
3. 验证构建
```

### 5.5 性能优化

```
推荐流程：benchmark → backend-patterns/frontend-patterns

1. benchmark: 分析性能瓶颈
2. backend-patterns/frontend-patterns: 实施优化方案
3. benchmark: 验证性能改进
```

### 5.6 数据库变更

```
推荐流程：database-migrations

1. database-migrations: 设计迁移方案
2. 编写迁移文件
3. 测试迁移
4. 部署迁移
```

### 5.7 架构决策

```
推荐流程：architecture-decision-records → architect

1. architecture-decision-records: 记录决策上下文
2. architect: 设计架构方案
3. architecture-decision-records: 记录最终决策
```

---

## 6. 技能分类总览

### 6.1 按技术领域分类

| 领域 | 技能 |
|------|------|
| **安全** | security-review |
| **测试** | tdd-workflow, e2e-testing |
| **后端** | backend-patterns |
| **前端** | frontend-patterns |
| **数据库** | database-migrations |
| **部署** | deployment-patterns |
| **架构** | architecture-decision-records, blueprint |
| **性能** | benchmark |

### 6.2 按推荐级别分类

| 推荐级别 | 技能 |
|---------|------|
| **强烈建议** | security-review, tdd-workflow, backend-patterns, frontend-patterns |
| **建议** | database-migrations, deployment-patterns, architecture-decision-records |
| **可选** | blueprint, e2e-testing, benchmark |

---

## 7. 技能与Agent对应关系

### 7.1 技能与Agent配合使用

| 场景 | Agent | 技能 |
|------|-------|------|
| 新功能开发 | planner, tdd-guide | tdd-workflow, backend-patterns, frontend-patterns |
| 安全审查 | security-reviewer | security-review |
| 代码审查 | code-reviewer, typescript-reviewer | - |
| 数据库设计 | architect | database-migrations |
| 部署配置 | - | deployment-patterns |
| 架构决策 | architect | architecture-decision-records |

---

## 8. 自动调用规则

### 8.1 Agent 自动触发场景

| 场景 | 自动调用 Agent |
|------|---------------|
| 复杂功能请求 | planner |
| 代码编写完成 | code-reviewer |
| 修复 Bug | tdd-guide |
| 架构决策 | architect |
| 涉及安全代码 | security-reviewer |
| 构建失败 | build-error-resolver |

### 8.2 技能自动触发场景

| 场景 | 自动调用技能 |
|------|-------------|
| 添加认证/授权代码 | security-review |
| 处理用户输入/表单 | security-review |
| 使用密钥/环境变量 | security-review |
| 创建API端点 | backend-patterns, security-review |
| 实现支付功能 | security-review |
| 编写新功能 | tdd-workflow |
| 修复Bug | tdd-workflow |
| 重构代码 | tdd-workflow |
| 设计数据库schema | database-migrations |
| Prisma迁移 | database-migrations |
| 配置CI/CD | deployment-patterns |
| Docker容器化 | deployment-patterns |
| 架构决策讨论 | architecture-decision-records |
| 技术选型 | architecture-decision-records |
| 构建React组件 | frontend-patterns |
| 状态管理设计 | frontend-patterns |

### 8.3 手动调用方式

```
// 手动调用 Agent
/user agent code-reviewer --file src/auth.ts
/user agent security-reviewer --file src/payment.ts
/user agent planner --task "实现用户头像上传功能"

// 手动调用技能
/user skill security-review --file src/auth.ts
/user skill tdd-workflow --task "实现用户登录功能"
/user skill backend-patterns --topic "REST API设计"
/user skill frontend-patterns --topic "React状态管理"
/user skill database-migrations --task "添加用户头像字段"
/user skill deployment-patterns --topic "Docker容器化"
/user skill architecture-decision-records --task "记录技术选型决策"
```

---

## 9. Agent & 技能调用流程

### 9.1 标准流程

```
┌─────────────────────────────────────────────────────┐
│               Agent & 技能调用流程                  │
├─────────────────────────────────────────────────────┤
│                                                    │
│  1. 触发条件检测                                    │
│       ↓                                            │
│  2. 选择合适的 Agent 或技能                        │
│       ↓                                            │
│  3. 收集上下文信息                                  │
│       ↓                                            │
│  4. 调用 Agent 或技能                              │
│       ↓                                            │
│  5. 处理输出                                       │
│       ↓                                            │
│  6. 生成报告/建议                                  │
│                                                    │
└─────────────────────────────────────────────────────┘
```

---

## 10. 最佳实践

### 10.1 Agent & 技能组合使用

| 组合 | 用途 |
|------|------|
| planner + tdd-workflow | 大型功能开发 |
| code-reviewer + security-review | PR 审查 |
| backend-patterns + database-migrations | API和数据库设计 |
| frontend-patterns + tdd-workflow | React组件开发 |
| deployment-patterns + backend-patterns | 后端部署配置 |
| architecture-decision-records + planner | 架构决策 |

### 10.2 使用建议

- **新功能**：先用 planner 规划，再用 tdd-workflow 开发
- **代码提交前**：至少运行 code-reviewer 和 security-review
- **构建失败**：立即调用 build-error-resolver
- **性能问题**：使用 benchmark 分析
- **数据库变更**：使用 database-migrations 确保安全迁移
- **架构决策**：使用 architecture-decision-records 记录

---

*最后更新：2026-05-11*
*版本：v1.0*