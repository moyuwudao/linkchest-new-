---
alwaysApply: false
description: Git工作流规范 - 分支策略、Commit规范、PR流程
---

# GIT_WORKFLOW.md — Git 工作流规范

> 本文档定义 LinkChest 项目中的 Git 分支策略、Commit 规范和 PR 流程。

---

## 1. 分支策略

### 1.1 分支类型

| 分支类型 | 命名格式 | 用途 | 示例 |
|----------|----------|------|------|
| **main** | `main` | 主分支，生产代码 | - |
| **develop** | `develop` | 开发分支，集成功能 | - |
| **feature** | `feature/{功能名}` | 新功能开发 | `feature/add-sharing` |
| **bugfix** | `bugfix/{bug描述}` | 修复线上bug | `bugfix/fix-login-error` |
| **hotfix** | `hotfix/{紧急修复}` | 紧急修复生产问题 | `hotfix/security-patch` |
| **release** | `release/{版本号}` | 发布准备 | `release/v1.0.0` |

### 1.2 分支流转图

```
main
  ↓ (merge)
develop ←─── feature/* ←─── bugfix/*
  ↓ (merge)
release/*
  ↓ (merge)
main
  ↓ (cherry-pick)
hotfix/*
  ↓ (merge)
main & develop
```

### 1.3 分支管理规则

| 操作 | 规则 |
|------|------|
| 创建 feature | 从 develop 分支创建 |
| 创建 bugfix | 从 develop 分支创建 |
| 创建 hotfix | 从 main 分支创建 |
| 创建 release | 从 develop 分支创建 |
| 合并到 develop | 通过 PR 合并 |
| 合并到 main | 通过 PR 合并 |

---

## 2. Commit 规范

### 2.1 Commit 消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| **feat** | 新功能 | `feat(auth): add OAuth2 login` |
| **fix** | 修复 bug | `fix(api): fix 404 error for collections` |
| **docs** | 文档更新 | `docs(readme): update installation guide` |
| **style** | 代码格式调整 | `style: format code with prettier` |
| **refactor** | 重构代码 | `refactor(utils): simplify URL parser` |
| **test** | 添加/修改测试 | `test(api): add unit tests for auth` |
| **chore** | 构建/工具更新 | `chore(deps): update react to v18` |
| **perf** | 性能优化 | `perf: optimize database queries` |
| **ci** | CI/CD 配置 | `ci: add GitHub Actions workflow` |

### 2.3 Scope 说明

| Scope | 说明 |
|-------|------|
| `api` | 后端 API |
| `web` | Web 前端 |
| `mobile` | 移动端 |
| `chrome-extension` | Chrome 扩展 |
| `shared` | 共享模块 |
| `docs` | 文档 |
| `infra` | 基础设施 |
| 空 | 通用变更 |

### 2.4 示例

```
feat(web): add collection sharing feature

- Add share button to collection card
- Generate unique share URL
- Add share modal with copy functionality

Closes #123
```

---

## 3. PR 流程

### 3.1 PR 创建规范

| 要求 | 说明 |
|------|------|
| **标题** | 清晰描述改动内容 |
| **描述** | 说明改动目的和影响 |
| **关联 Issue** | 使用 `Closes #xxx` 关联 |
| **检查清单** | 完成所有检查项 |

### 3.2 PR 模板

```markdown
## 描述
请简要描述本次改动的目的和内容。

## 改动类型
- [ ] 新功能 (Feature)
- [ ] Bug 修复 (Bug Fix)
- [ ] 代码重构 (Refactor)
- [ ] 文档更新 (Documentation)
- [ ] 构建/工具 (Build/Tooling)
- [ ] 测试 (Testing)

## 相关 Issue
Closes #xxx

## 改动内容
- 列出主要改动点

## 测试方法
请描述如何测试这些改动。

## 检查清单
- [ ] 代码已通过 lint 检查
- [ ] 代码已通过 typecheck
- [ ] 添加了必要的测试
- [ ] 测试全部通过
- [ ] 文档已更新
```

### 3.3 PR 审查流程

| 步骤 | 操作 |
|------|------|
| **创建 PR** | 开发者创建 PR 并请求审查 |
| **自动检查** | CI 自动运行 lint、typecheck、tests |
| **代码审查** | 至少 1 人审查通过 |
| **合并** | 通过后由作者合并 |
| **删除分支** | 合并后删除功能分支 |

---

## 4. 版本发布

### 4.1 版本号规则

遵循语义化版本（Semantic Versioning）：

```
vMAJOR.MINOR.PATCH
```

| 部分 | 说明 |
|------|------|
| **MAJOR** | 不兼容的 API 变更 |
| **MINOR** | 向后兼容的新功能 |
| **PATCH** | 向后兼容的 bug 修复 |

### 4.2 发布流程

```bash
# 1. 创建 release 分支
git checkout -b release/v1.0.0 develop

# 2. 更新版本号
# 修改 package.json、CHANGELOG.md 等

# 3. 合并到 main
git checkout main
git merge --no-ff release/v1.0.0

# 4. 添加 tag
git tag -a v1.0.0 -m "Release v1.0.0"

# 5. 合并到 develop
git checkout develop
git merge --no-ff release/v1.0.0

# 6. 删除 release 分支
git branch -d release/v1.0.0

# 7. 推送
git push origin main
git push origin develop
git push origin v1.0.0
```

### 4.3 CHANGELOG 规范

每次发布更新 `CHANGELOG.md`：

```markdown
## [1.0.0] - 2024-01-15

### Added
- 新增收藏分享功能
- 新增标签管理

### Fixed
- 修复登录页面样式问题
- 修复 API 响应超时问题

### Changed
- 优化首页加载性能
```

---

## 5. 常见操作

### 5.1 创建功能分支

```bash
# 从 develop 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/add-sharing
```

### 5.2 更新分支

```bash
# 从 develop 更新当前分支
git checkout feature/add-sharing
git merge develop
```

### 5.3 撤销提交

```bash
# 撤销最近一次提交（保留更改）
git reset HEAD~1

# 撤销最近一次提交（丢弃更改）
git reset --hard HEAD~1
```

### 5.4 强制推送

```bash
# 仅在本地分支重写后使用
git push -f origin feature/add-sharing
```

---

## 6. 最佳实践

| 实践 | 说明 |
|------|------|
| **小批量提交** | 每个 commit 只做一件事 |
| **频繁推送** | 定期 push 到远程仓库 |
| **编写有意义的消息** | Commit 消息清晰描述改动 |
| **及时合并** | 功能完成后尽快合并到 develop |
| **代码审查** | 所有代码提交前必须经过审查 |
| **保持分支清洁** | 定期删除已合并的分支 |

---

## 7. 检查清单

| 检查项 | 说明 |
|--------|------|
| **分支命名** | 符合命名规范 |
| **Commit 消息** | 符合格式规范 |
| **PR 描述** | 清晰完整 |
| **自动检查** | 全部通过 |
| **代码审查** | 至少 1 人通过 |
| **版本更新** | 版本号已更新 |

---

*最后更新：2026-05-11*
*版本：v1.0*
