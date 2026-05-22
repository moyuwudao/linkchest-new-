---
alwaysApply: false
description: 开发工作流 - 定义从需求到提交的完整开发流程
---

# DEVELOPMENT_WORKFLOW.md — 开发工作流

> 本文档定义从需求分析到代码提交的完整开发流程，确保团队协作高效、质量可控。

---

## 1. 五步开发流程

### 1.1 流程概览

```
┌─────────────────────────────────────────────────────────────┐
│                    开发工作流（5步）                        │
├─────────────────────────────────────────────────────────────┤
│  1. Research    → 2. Plan      → 3. TDD                   │
│       ↓                ↓              ↓                    │
│  了解需求         设计方案        测试驱动开发               │
│       ↓                ↓              ↓                    │
│  4. Review      → 5. Commit                               │
│       ↓                ↓                                   │
│  代码审查         提交代码                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 步骤详解

| 步骤 | 名称 | 目标 | 输出 |
|------|------|------|------|
| **1** | Research（调研） | 理解需求、技术方案调研 | 需求文档、技术方案 |
| **2** | Plan（规划） | 拆分任务、预估时间 | 任务清单、时间计划 |
| **3** | TDD（测试驱动） | 先写测试、再实现功能 | 测试代码、实现代码 |
| **4** | Review（审查） | 代码质量检查、安全审查 | 审查报告、修复记录 |
| **5** | Commit（提交） | 代码提交、PR创建 | 提交记录、PR链接 |

---

## 2. Step 1: Research（调研）

### 2.1 需求分析

```
📋 需求分析清单
┌─────────────────────────────────────┐
│ 1. 需求来源：用户故事 / 产品需求文档   │
│ 2. 功能描述：具体要实现什么            │
│ 3. 边界条件：输入输出约束              │
│ 4. 验收标准：如何验证功能正确          │
│ 5. 依赖关系：需要哪些其他模块支持       │
└─────────────────────────────────────┘
```

### 2.2 技术调研

- 搜索现有代码是否有类似实现
- 评估技术方案可行性
- 确认第三方库依赖

---

## 3. Step 2: Plan（规划）

### 3.1 任务拆分

```typescript
// 示例：任务拆分
const tasks = [
  { id: 1, title: '设计数据库 schema', estimate: '2h' },
  { id: 2, title: '实现 API 接口', estimate: '4h' },
  { id: 3, title: '编写单元测试', estimate: '2h' },
  { id: 4, title: '实现前端 UI', estimate: '4h' },
];
```

### 3.2 分支创建

```bash
# 从 main 分支创建功能分支
git checkout -b feature/[feature-name]
```

---

## 4. Step 3: TDD（测试驱动开发）

### 4.1 TDD 流程

```
RED → GREEN → IMPROVE → VERIFY

1. RED: 编写失败的测试
2. GREEN: 实现代码使测试通过
3. IMPROVE: 重构代码
4. VERIFY: 验证覆盖率 ≥ 80%
```

### 4.2 AAA 测试模式

```typescript
test('calculates total correctly', () => {
  // Arrange - 准备测试数据
  const cart = new ShoppingCart();
  
  // Act - 执行被测代码
  cart.addItem({ id: '1', price: 100 });
  
  // Assert - 验证结果
  expect(cart.total).toBe(100);
});
```

---

## 5. Step 4: Review（代码审查）

### 5.1 审查流程

```
1. 运行 git diff 了解变更
2. 检查安全清单（RED_LINES.md）
3. 运行 lint 和 typecheck
4. 运行测试验证
5. 使用 code-reviewer agent 审查
6. 使用 security-reviewer agent 安全分析
```

### 5.2 审查检查清单

| 检查项 | 说明 |
|--------|------|
| ✅ 代码风格符合 CODE_STYLE.md |
| ✅ 测试覆盖率 ≥ 80% |
| ✅ 无安全漏洞（SQL注入、XSS等） |
| ✅ 错误处理完善 |
| ✅ 类型定义完整 |
| ✅ 注释清晰 |

---

## 6. Step 5: Commit（提交）

### 6.1 Commit 格式

```
<type>: <description>

<optional body>

Test Plan:
- [ ] Test case 1
- [ ] Test case 2
```

### 6.2 Commit 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **feat** | 新功能 | `feat: add user profile page` |
| **fix** | Bug修复 | `fix: resolve login error` |
| **refactor** | 重构 | `refactor: simplify data fetching` |
| **docs** | 文档 | `docs: update API documentation` |
| **test** | 测试 | `test: add unit tests for auth` |
| **chore** | 日常维护 | `chore: update dependencies` |

### 6.3 PR 创建

```
📋 PR 模板
┌─────────────────────────────────────┐
│ Title: [功能/修复名称]                │
│                                     │
│ Description:                        │
│ - 实现了什么功能                      │
│ - 解决了什么问题                      │
│                                     │
│ Changes:                            │
│ - 文件1: 修改说明                     │
│ - 文件2: 修改说明                     │
│                                     │
│ Test Plan:                          │
│ - [ ] 测试用例1                      │
│ - [ ] 测试用例2                      │
│                                     │
│ Related Issues: #123, #456          │
└─────────────────────────────────────┘
```

---

## 7. 常见场景工作流

### 7.1 新功能开发

```
planner → tdd-guide → code-reviewer → security-reviewer → PR
```

### 7.2 Bug 修复

```
代码分析 → 编写测试 → 修复代码 → code-reviewer → PR
```

### 7.3 代码重构

```
现状分析 → 重构计划 → 逐步修改 → 测试验证 → code-reviewer → PR
```

---

## 8. 工具辅助

| 工具 | 用途 | 触发时机 |
|------|------|----------|
| **planner** | 复杂功能规划 | 大型功能开发前 |
| **tdd-guide** | TDD 流程指导 | 新功能开发 |
| **code-reviewer** | 代码审查 | 代码完成后 |
| **security-reviewer** | 安全审查 | 提交前 |
| **typescript-reviewer** | TypeScript 审查 | TS/JS 代码 |

---

*最后更新：2026-05-11*
*版本：v1.0*