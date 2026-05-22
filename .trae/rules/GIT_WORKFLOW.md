---
alwaysApply: false
description: Git工作流规范 - Trunk-Based分支策略、Commit规范、推送规范
---

# GIT_WORKFLOW.md — Git 工作流规范

> 本文档定义 LinkChest 项目的 Git 分支策略、Commit 规范和推送规范。
> 项目采用 **Trunk-Based Development**，直接在 master 上开发。

---

## 1. 分支策略

### 1.1 实际工作流：Trunk-Based

| 分支 | 用途 | 说明 |
|------|------|------|
| **master** | 主分支 = 生产代码 | 直接推送，保持可部署状态 |

- 不使用 develop/release 分支
- 功能开发直接在 master 上 commit + push
- 大功能使用 feature 分支，完成后 merge 回 master

### 1.2 分支使用场景

| 场景 | 分支 | 操作 |
|------|------|------|
| 日常开发 | master | 直接 commit + push |
| 大功能开发 | feature/{名称} | 开发完成后 merge 回 master |
| 紧急修复 | master | 直接修复 + push |
| 实验性代码 | experiment/{名称} | 验证后决定 merge 或删除 |

---

## 2. Commit 规范

| 类型 | 格式 | 示例 |
|------|------|------|
| feat | `feat: 描述` | `feat: 添加用户头像上传` |
| fix | `fix: 描述` | `fix: 修复登录超时问题` |
| deploy | `deploy: 描述` | `deploy: 更新海外服务器` |
| docs | `docs: 描述` | `docs: 更新部署文档` |
| refactor | `refactor: 描述` | `refactor: 重构认证中间件` |
| chore | `chore: 描述` | `chore: 更新依赖版本` |
| build | `build: 描述` | `build: APK v1.2.0` |

### 2.1 Commit 消息规则

- 使用中文描述
- 类型前缀 + 冒号 + 空格 + 描述
- 描述不超过 50 个字符
- 不添加空行

---

## 3. 推送规范

| 规则 | 说明 |
|------|------|
| 推送前确认 | `git status` 检查工作区干净 |
| 部署前推送 | 部署前必须确保代码已 push 到 master |
| 禁止 force push | `git push --force` 绝对禁止 |
| 服务器端拉取 | 服务器上只用 `git pull`，不用 `git reset --hard` |

---

## 4. 服务器代码同步

所有服务器通过 `git pull` 从 GitHub master 获取最新代码：

- 海外：`ssh ubuntu@43.133.44.232 "cd /opt/linkchest/api && git pull"`
- 国内：`ssh ubuntu@43.136.82.88 "cd /opt/linkchest/api && git pull"`

详见 [HIGH_RISK.md §2.0](HIGH_RISK.md) Git-Only 策略。

---

*最后更新：2026-05-22*
*版本：v2.0*
