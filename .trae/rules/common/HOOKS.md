---
alwaysApply: false
description: Hooks系统 - 定义Pre/Post/Stop钩子，实现自动化工作流
---

# HOOKS.md — Hooks 系统

> 本文档定义开发工作流中的自动化钩子，实现代码格式化、检查和验证的自动化。

---

## 1. Hooks 概述

### 1.1 Hooks 类型

| 类型 | 触发时机 | 用途 |
|------|----------|------|
| **PreToolUse** | 工具使用前 | 安全确认、条件检查 |
| **PostToolUse** | 工具使用后 | 格式化、验证、通知 |
| **Stop** | 任务结束时 | 最终验证、总结报告 |

### 1.2 Hooks 执行流程

```
┌─────────────────────────────────────────────────────┐
│                    Hooks 执行流程                   │
├─────────────────────────────────────────────────────┤
│                                                    │
│  PreToolUse                                        │
│    ↓                                               │
│  [用户操作] → [工具执行]                             │
│    ↓                                               │
│  PostToolUse                                       │
│    ↓                                               │
│  Stop (任务结束时)                                  │
│                                                    │
└─────────────────────────────────────────────────────┘
```

---

## 2. PreToolUse Hooks

### 2.1 安全敏感操作确认

```
⚠️ 操作确认 Hook
┌─────────────────────────────────────┐
│ 操作类型：[删除/修改/配置变更]        │
│ 影响范围：[文件/模块/配置]           │
│ 风险等级：[高/中/低]                │
│ 预期结果：[描述]                    │
└─────────────────────────────────────┘
确认执行？ [Y/N]
```

### 2.2 条件检查

| 检查项 | 触发条件 | 操作 |
|--------|----------|------|
| 分支保护 | 修改 main 分支 | 警告并确认 |
| 依赖冲突 | 安装新依赖 | 检查版本兼容性 |
| 测试状态 | 提交代码 | 检查测试覆盖率 |

---

## 3. PostToolUse Hooks

### 3.1 自动格式化

```typescript
// PostToolUse: 代码格式化
hooks.postToolUse.push({
  name: 'typescript-format',
  trigger: ['Edit', 'Write'],
  action: async (context) => {
    if (context.file.endsWith('.ts') || context.file.endsWith('.tsx')) {
      await runCommand('npx prettier --write ' + context.file);
    }
  }
});
```

### 3.2 自动检查

```typescript
// PostToolUse: 静态分析
hooks.postToolUse.push({
  name: 'typescript-analyze',
  trigger: ['Edit', 'Write'],
  action: async (context) => {
    if (context.file.endsWith('.ts') || context.file.endsWith('.tsx')) {
      await runCommand('npx tsc --noEmit');
    }
  }
});
```

### 3.3 自动测试

```typescript
// PostToolUse: 运行相关测试
hooks.postToolUse.push({
  name: 'run-tests',
  trigger: ['Edit', 'Write'],
  action: async (context) => {
    const testFile = context.file.replace('.ts', '.test.ts');
    if (fileExists(testFile)) {
      await runCommand(`npm test -- ${testFile}`);
    }
  }
});
```

---

## 4. Stop Hooks

### 4.1 最终验证清单

```
✅ 最终验证清单
┌─────────────────────────────────────┐
│ 任务完成验证：                        │
│                                     │
│ [ ] 代码格式化完成                    │
│ [ ] 类型检查通过                      │
│ [ ] 测试覆盖率 ≥ 80%                  │
│ [ ] 安全审查通过                      │
│ [ ] 无未提交的更改                    │
└─────────────────────────────────────┘
```

### 4.2 任务总结

```typescript
// Stop: 生成任务总结
hooks.stop.push({
  name: 'task-summary',
  action: async (context) => {
    const summary = generateSummary({
      tasks: context.completedTasks,
      files: context.modifiedFiles,
      timeSpent: context.duration,
      issues: context.issuesFound
    });
    await sendNotification(summary);
  }
});
```

---

## 5. Hooks 配置示例

### 5.1 完整配置

```json
{
  "hooks": {
    "preToolUse": [
      {
        "name": "safety-confirmation",
        "triggers": ["DeleteFile", "Edit"],
        "config": {
          "requireConfirmationFor": ["*.env", "package.json"]
        }
      }
    ],
    "postToolUse": [
      {
        "name": "auto-format",
        "triggers": ["Edit", "Write"],
        "config": {
          "formatter": "prettier",
          "extensions": [".ts", ".tsx", ".json"]
        }
      },
      {
        "name": "auto-lint",
        "triggers": ["Edit", "Write"],
        "config": {
          "linter": "eslint",
          "extensions": [".ts", ".tsx"]
        }
      }
    ],
    "stop": [
      {
        "name": "final-verification",
        "config": {
          "checkCoverage": true,
          "checkSecurity": true
        }
      }
    ]
  }
}
```

---

## 6. Hooks 优先级

### 6.1 执行顺序

| 优先级 | Hooks | 说明 |
|--------|-------|------|
| 1 | PreToolUse | 工具使用前检查 |
| 2 | 工具执行 | 用户请求的操作 |
| 3 | PostToolUse | 工具使用后处理 |
| 4 | Stop | 任务结束时 |

### 6.2 错误处理

| 场景 | 处理方式 |
|------|----------|
| PreToolUse 失败 | 中止操作，提示用户 |
| PostToolUse 失败 | 警告用户，但不中止 |
| Stop 失败 | 记录问题，完成任务 |

---

*最后更新：2026-05-11*
*版本：v1.0*