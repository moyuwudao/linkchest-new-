---
alwaysApply: false
description: typescript 目录说明 - TypeScript/React 特定规则
---

# TypeScript/React Rules Directory

本目录包含 TypeScript 和 React 项目特定的规则。

## 目录结构

```
typescript/
├── CODING_STYLE.md           # TypeScript 代码风格规范
└── README.md                 # 本文件
```

## 规则优先级

TypeScript 规则优先级高于通用规则，但低于项目特定规则：

```
项目特定规则 > TypeScript 规则 > 通用规则
```

## 使用方式

这些规则会在编写 TypeScript/React 代码时自动加载。

| 规则 | 内容 |
|------|------|
| `CODING_STYLE.md` | TypeScript 语法规范、React 最佳实践、类型安全 |

## 维护

- TypeScript 特定规则应放在此目录
- 通用规则应放在 `common/` 目录
- 项目特定规则应放在根目录

## 参考

- 规则总览：`../INDEX.md`
- 通用规则：`../common/`
