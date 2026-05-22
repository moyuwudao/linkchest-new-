---
alwaysApply: false
description: Hooks 规范蓝图 - 定义期望的 Git Hooks 配置
---

# HOOKS.md — Git Hooks 规范蓝图

> 定义项目期望的 Git Hooks 配置和 Commit 规范。

---

## 1. 期望配置

| Hook | 时机 | 作用 |
|------|------|------|
| pre-commit | git commit 前 | lint-staged 格式化 + ESLint |
| commit-msg | 写入 commit message 后 | 验证 commit 规范 |
| pre-push | git push 前 | 运行测试 + typecheck |

## 2. 当前状态

- **状态**：未配置（项目使用 husky + lint-staged 但尚未初始化）
- **TODO**：首次部署到新服务器时执行 `npx husky install` 初始化

## 3. Commit 规范

| 类型 | 格式 | 示例 |
|------|------|------|
| feat | `feat: 描述` | `feat: 添加用户头像上传` |
| fix | `fix: 描述` | `fix: 修复登录超时问题` |
| docs | `docs: 描述` | `docs: 更新部署文档` |
| refactor | `refactor: 描述` | `refactor: 重构认证中间件` |
| chore | `chore: 描述` | `chore: 更新依赖版本` |

## 4. 工具链

| 工具 | 用途 | 配置位置 |
|------|------|----------|
| husky | Git hooks 管理 | `.husky/` |
| lint-staged | 暂存文件检查 | `package.json` |

---

*版本：v2.0 — 从虚构 Hooks 系统重写为 Git Hooks 蓝图*
*最后更新：2026-05-22*
