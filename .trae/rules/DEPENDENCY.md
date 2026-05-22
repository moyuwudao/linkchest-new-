---
alwaysApply: false
description: 依赖管理规范 - npm 添加/更新依赖的流程和注意事项
---

# DEPENDENCY.md — 依赖管理规范

> 本文档定义 LinkChest 项目中的依赖添加、更新和维护规范。

---

## 1. 依赖类型

### 1.1 依赖分类

| 类型 | 说明 | 示例 |
|------|------|------|
| **dependencies** | 运行时必需的依赖 | `react`, `express`, `prisma` |
| **devDependencies** | 开发时使用的依赖 | `typescript`, `eslint`, `jest` |
| **peerDependencies** | 宿主环境提供的依赖 | （通常不使用） |

### 1.2 版本锁定

```json
// package.json
{
  "dependencies": {
    "react": "^18.2.0",
    "next": "14.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

| 版本前缀 | 含义 | 示例 |
|----------|------|------|
| `^` | 兼容更新 | `^18.2.0` → 18.x.x |
| `~` | 补丁更新 | `~18.2.0` → 18.2.x |
| 无 | 精确版本 | `14.0.0` → 14.0.0 |

---

## 2. 添加依赖

### 2.1 添加步骤

```bash
# 添加运行时依赖
npm install <package-name>

# 添加开发依赖
npm install -D <package-name>

# 添加精确版本
npm install <package-name>@<version>
```

### 2.2 添加前检查

| 检查项 | 说明 |
|--------|------|
| **是否真的需要** | 是否有内置方案或现有代码可替代 |
| **包质量** | 查看下载量、更新频率、维护状态 |
| **许可证** | 是否符合项目许可证要求 |
| **安全性** | 查看是否有已知安全漏洞 |
| **类型定义** | 是否有 @types 包或内置类型 |

### 2.3 添加后操作

```bash
# 安装依赖
npm install

# 更新锁文件
npm install (自动更新 package-lock.json)

# 运行检查
npm run lint
npm run typecheck
npm run test
```

---

## 3. 更新依赖

### 3.1 更新策略

| 策略 | 说明 | 频率 |
|------|------|------|
| **定期更新** | 每周检查一次依赖更新 | 每周 |
| **安全更新** | 立即更新有安全漏洞的依赖 | 即时 |
| **重大版本更新** | 谨慎评估后更新 | 按需 |

### 3.2 更新命令

```bash
# 查看过期依赖
npm outdated

# 更新单个依赖
npm update <package-name>

# 更新所有依赖（谨慎使用）
npm update

# 更新到指定版本
npm install <package-name>@<new-version>
```

### 3.3 更新流程

```
1. 查看 outdated 列表
    ↓
2. 创建更新分支 (feature/update-deps)
    ↓
3. 更新依赖
    ↓
4. 运行测试和检查
    ↓
5. 修复兼容性问题
    ↓
6. 创建 PR 合并
```

---

## 4. 删除依赖

### 4.1 删除步骤

```bash
# 删除依赖
npm uninstall <package-name>

# 删除开发依赖
npm uninstall -D <package-name>

# 清理未使用的依赖
npx depcheck
```

### 4.2 删除后检查

| 检查项 | 说明 |
|--------|------|
| **代码引用** | 确保没有代码引用该依赖 |
| **配置文件** | 确保配置文件中没有引用 |
| **测试通过** | 运行测试确保没有破坏功能 |

---

## 5. 安全管理

### 5.1 安全检查

```bash
# 检查安全漏洞
npm audit

# 修复安全漏洞
npm audit fix

# 查看详细报告
npm audit --json
```

### 5.2 安全策略

| 级别 | 处理方式 |
|------|----------|
| **Critical** | 立即修复 |
| **High** | 24小时内修复 |
| **Moderate** | 一周内修复 |
| **Low** | 定期批量修复 |

---

## 6. 私有依赖

### 6.1 使用私有仓库

```bash
# 设置私有仓库
npm config set @myorg:registry https://npm.pkg.github.com

# 登录私有仓库
npm login --scope=@myorg --registry=https://npm.pkg.github.com
```

### 6.2 配置 .npmrc

```ini
# .npmrc
@myorg:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

---

## 7. 依赖分析

### 7.1 分析工具

```bash
# 查看依赖树
npm ls

# 查看依赖大小
npx package-size

# 分析重复依赖
npx dedupe
```

### 7.2 优化建议

| 优化项 | 说明 |
|--------|------|
| **去重依赖** | 使用 `npm dedupe` 合并重复依赖 |
| **移除未使用** | 使用 `depcheck` 识别未使用依赖 |
| **替换重依赖** | 用轻量替代方案替换重量级依赖 |

---

## 8. 最佳实践

| 实践 | 说明 |
|------|------|
| **锁定版本** | 使用 package-lock.json 锁定版本 |
| **定期更新** | 每周检查并更新依赖 |
| **安全优先** | 立即修复 critical/high 级别漏洞 |
| **单一职责** | 每个依赖只解决一个问题 |
| **文档记录** | 在 PR 中说明依赖变更原因 |
| **测试验证** | 更新后运行完整测试套件 |

---

## 9. 检查清单

| 检查项 | 说明 |
|--------|------|
| **必要性** | 该依赖是否真的需要 |
| **安全性** | 是否有已知安全漏洞 |
| **兼容性** | 是否与现有依赖兼容 |
| **文档** | 是否有完善的文档 |
| **维护状态** | 包是否活跃维护 |
| **测试** | 更新后测试是否通过 |

---

*最后更新：2026-05-11*
*版本：v1.0*
