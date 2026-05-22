---
alwaysApply: false
description: common 目录说明 - 通用规则说明
---

# Common Rules Directory

本目录包含适用于所有项目的通用规则，这些规则与特定语言或框架无关。

## 目录结构

```
common/
├── DEVELOPMENT_WORKFLOW.md  # 开发工作流（Research→Plan→TDD→Review→Commit）
├── CODE_REVIEW.md           # 代码审查标准（审查清单、严重性分级）
├── HOOKS.md                 # Hooks 系统（PreToolUse/PostToolUse/Stop）
├── AGENTS.md                # Agents 使用指南
├── PERFORMANCE.md           # 性能优化策略
├── patterns.md              # 通用设计模式（Repository、API响应格式）
├── security.md              # 通用安全指南
├── coding-style.md          # 通用代码风格原则
├── testing.md               # 通用测试要求
├── git-workflow.md          # Git 工作流规范
└── README.md                # 本文件
```

## 规则优先级

通用规则是规则体系的基础层，优先级最低：

```
项目特定规则 > 语言特定规则 > 通用规则
```

## 使用方式

这些规则会根据任务类型自动加载：

| 规则 | 触发场景 |
|------|----------|
| `development-workflow.md` | 首次访问项目、开发流程相关 |
| `code-review.md` | 代码审查、PR |
| `hooks.md` | 配置自动化工作流 |
| `agents.md` | 使用 AI 工具 |
| `performance.md` | 性能优化、性能问题 |
| `patterns.md` | 架构设计、代码模式 |
| `security.md` | 安全检查、安全审查 |
| `coding-style.md` | 编写代码 |
| `testing.md` | 编写测试 |
| `git-workflow.md` | Git 操作 |

## 维护

- 通用规则应保持语言无关性
- 特定语言的规则应放在 `typescript/`、`dart/` 等目录
- 项目特定的规则应放在根目录

## 参考

- 规则总览：`../INDEX.md`
- TypeScript 特定规则：`../typescript/`
