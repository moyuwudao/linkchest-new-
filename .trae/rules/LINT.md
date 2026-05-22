---
alwaysApply: false
description: Lint检查规则 - ESLint/TypeScript 检查配置与要求
---

# LINT.md — Lint/Typecheck 检查要求

> 本文档定义 LinkChest 项目中的代码检查规范和配置要求。

---

## 1. ESLint 配置

### 1.1 基础配置

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    // 自定义规则
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    'no-console': 'warn',
  },
};
```

### 1.2 核心规则

| 规则 | 级别 | 说明 |
|------|------|------|
| `no-unused-vars` | error | 禁止未使用的变量 |
| `no-explicit-any` | warn | 禁止显式使用 any 类型 |
| `prefer-const` | error | 优先使用 const |
| `no-console` | warn | 禁止 console 语句 |
| `no-var` | error | 禁止 var 声明 |
| `prefer-arrow-callback` | error | 优先使用箭头函数 |

### 1.3 TypeScript 特定规则

| 规则 | 级别 | 说明 |
|------|------|------|
| `@typescript-eslint/no-empty-interface` | warn | 禁止空接口 |
| `@typescript-eslint/no-namespace` | error | 禁止命名空间 |
| `@typescript-eslint/explicit-function-return-type` | off | 不强制显式返回类型 |
| `@typescript-eslint/explicit-module-boundary-types` | off | 不强制模块边界类型 |

---

## 2. TypeScript 配置

### 2.1 tsconfig.json 基础配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.2 严格模式选项

| 选项 | 值 | 说明 |
|------|-----|------|
| `strict` | true | 启用所有严格检查 |
| `noImplicitAny` | true | 禁止隐式 any |
| `noImplicitThis` | true | 禁止隐式 this |
| `strictNullChecks` | true | 严格的 null 检查 |
| `strictFunctionTypes` | true | 严格的函数类型检查 |
| `strictPropertyInitialization` | true | 严格的属性初始化检查 |

---

## 3. 运行命令

### 3.1 基础命令

```bash
# 运行 ESLint
npm run lint

# 运行 ESLint 并自动修复
npm run lint -- --fix

# 运行 TypeScript 类型检查
npm run typecheck

# 运行所有检查（lint + typecheck）
npm run check
```

### 3.2 package.json 配置

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "check": "npm run lint && npm run typecheck"
  }
}
```

---

## 4. 常见问题与解决方案

### 4.1 ESLint 常见问题

| 问题 | 解决方案 |
|------|----------|
| `'window' is not defined` | 添加 `browser: true` 到 env 配置 |
| `'console' is not defined` | 添加 `node: true` 到 env 配置 |
| `import/no-unresolved` | 配置 `resolve` 别名 |

### 4.2 TypeScript 常见问题

| 问题 | 解决方案 |
|------|----------|
| `Cannot find module '@/*'` | 配置 `baseUrl` 和 `paths` |
| `Property does not exist on type` | 检查类型定义或使用类型断言 |
| `Object is possibly 'null'` | 添加 null 检查或使用可选链 |

---

## 5. 编辑器集成

### 5.1 VS Code 配置

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.validate": ["typescript", "typescriptreact"]
}
```

### 5.2 禁用规则

如果确实需要禁用某些规则，可以使用注释：

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = await fetchData();

/* eslint-disable @typescript-eslint/no-unused-vars */
function tempFunction() {
  const unused = 'value';
}
/* eslint-enable @typescript-eslint/no-unused-vars */
```

---

## 6. CI/CD 集成

### 6.1 GitHub Actions 配置

```yaml
# .github/workflows/lint.yml
name: Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint
      - run: npm run typecheck
```

### 6.2 检查失败处理

- **开发阶段**：修复所有 error 级别问题
- **PR 阶段**：禁止有 error 级别问题的代码合并
- **警告级别**：建议修复，但不阻止合并

---

## 7. 检查清单

| 检查项 | 说明 |
|--------|------|
| **ESLint 通过** | 没有 error 级别问题 |
| **TypeScript 通过** | 没有类型错误 |
| **自动修复** | 可自动修复的问题已修复 |
| **编辑器配置** | 已配置自动修复 |
| **CI 集成** | 已集成到 CI/CD 流程 |

---

*最后更新：2026-05-11*
*版本：v1.0*
