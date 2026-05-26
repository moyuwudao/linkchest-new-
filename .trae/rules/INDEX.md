---
alwaysApply: false
description: 规则体系总览 - 快速查找指南和规则层次结构
---

# 规则体系总览

## 规则层次结构

```
┌─────────────────────────────────────────────────────────┐
│                   LinkChest 项目特定规则                 │
│  (最高优先级 - 覆盖所有下层规则)                         │
├─────────────────────────────────────────────────────────┤
│  SOUL.md          │ 合作灵魂和基调                      │
│  USER.md          │ 用户信息和偏好                      │
│  INTERACTION.md   │ 交互规则（何时问、何时做）           │
│  RED_LINES.md     │ 安全红线（含部署安全，绝对不能做的）  │
│  HIGH_RISK.md     │ 高风险操作（部署+构建安全）          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   TypeScript/React 规则                  │
│  (中优先级 - 覆盖通用规则)                               │
├─────────────────────────────────────────────────────────┤
│  CODE_STYLE.md     │ TypeScript 代码风格、格式化         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                      通用规则                            │
│  (基础层 - 适用于所有项目)                               │
├─────────────────────────────────────────────────────────┤
│  CODE_REVIEW.md        │ 代码审查标准                   │
│  DEVELOPMENT_WORKFLOW.md │ 开发工作流（Research→Deploy）│
│  HOOKS.md              │ Hooks 系统配置                 │
│  AGENTS.md             │ Agents 使用指南                │
│  PERFORMANCE.md        │ 性能优化、模型选择             │
└─────────────────────────────────────────────────────────┘
```

## 规则优先级

**当规则冲突时：**

```
项目特定规则 > 语言特定规则 > 通用规则
```

### 示例

**场景**: 代码格式化

1. **通用规则** (`common/coding-style.md`): "使用自动化格式化工具"
2. **TypeScript 规则** (`typescript/CODING_STYLE.md`): "使用 Prettier，100 字符行限制"
3. **项目规则** (无特定覆盖)

**结果**: 使用 `npx prettier --write .`，100 字符限制

---

## 快速查找指南

### 我要...

| 需求 | 查看规则 |
|-----|---------|
| **写代码** | `CODE_STYLE.md` + **Context7 MCP**（查最新 API） |
| **写测试** | `TESTING.md` |
| **提交代码** | `GIT_WORKFLOW.md` |
| **代码审查** | `common/CODE_REVIEW.md` |
| **安全检查** | `RED_LINES.md` → `CAUTION_ZONE.md` |
| **性能分析** | `common/PERFORMANCE.md` + **Chrome DevTools MCP**（Trace） + **PostgreSQL MCP**（EXPLAIN） |
| **调试问题** | **Chrome DevTools MCP**（Console + Network） + **PostgreSQL MCP**（数据验证） |
| **构建APK** | `BUILD_RED_LINES.md` → `BUILD.md` |
| **部署更新** | `HIGH_RISK.md` → `DEPLOYMENT.md` |
| **国内外运营** | `MARKET-OPS.md` |
| **Skill/MCP 查询** | `common/AGENTS.md` |

### 安全问题优先级

**安全相关规则优先级最高**：

1. `RED_LINES.md` - 绝对不能做的（数据库、认证、密钥）
2. `HIGH_RISK.md` - 部署和构建安全
3. `CAUTION_ZONE.md` - 应急响应和 Web 安全（任务触发）
4. `common/CODE_REVIEW.md` - 安全检查清单

---

## Agents 和 Commands

### 推荐 Agents

| 场景 | Agent | 说明 |
|-----|-------|------|
| 新功能开发 | `tdd-guide` | TDD 流程指导 |
| 代码审查 | `code-reviewer` | 代码审查 |
| TypeScript审查 | `typescript-reviewer` | TS/JS 代码审查 |
| 规划功能 | `planner` | 实现计划制定 |
| 构建错误 | `build-error-resolver` | 编译错误修复 |
| 安全检查 | `security-reviewer` | 安全漏洞审查 |

### 推荐 Commands

| Command | 用途 |
|---------|------|
| `/review` | 代码审查 |
| `/security` | 安全审查 |
| `/plan` | 功能规划 |
| `/tdd` | TDD 流程 |
| `/build-fix` | 构建错误修复 |
| `/quality-gate` | 质量门禁检查 |
| `/test-coverage` | 测试覆盖率检查 |
| `/optimize` | 性能优化 |

---

## 规则文件清单

### LinkChest 项目特定（15 个）

```
.trae/rules/
├── INDEX.md                 ✅ 规则总览
├── SOUL.md                  ✅ 我们的灵魂
├── USER.md                  ✅ 用户信息
├── INTERACTION.md           ✅ 交互规则
├── RED_LINES.md             ✅ 安全红线（Zero Tolerance）
├── HIGH_RISK.md             ✅ 高风险操作（部署+构建）
├── CAUTION_ZONE.md          ✅ 警告区域（应急+Web安全）[任务触发]
├── BUILD_RED_LINES.md       ✅ 构建红线 [任务触发]
├── PROJECT_SENSE.md         ✅ 项目感知
├── CODE_STYLE.md            ✅ 代码风格（含命名约定）
├── TESTING.md               ✅ 测试规范
├── LINT.md                  ✅ Lint 检查
├── GIT_WORKFLOW.md          ✅ Git 规范
├── BUILD.md                 ✅ 构建规范（含APK）
├── DEPLOYMENT.md            ✅ 部署更新
└── MARKET-OPS.md            ✅ 国内外分运营
```

### 通用规则（5 个）

```
.trae/rules/common/
├── DEVELOPMENT_WORKFLOW.md  ✅ 开发工作流
├── CODE_REVIEW.md           ✅ 代码审查标准
├── HOOKS.md                 ✅ Hooks 系统
├── AGENTS.md                ✅ Agents 指南
└── PERFORMANCE.md           ✅ 性能优化
```

### 案例集锦（3 个）

```
.trae/rules/cases/
├── CASES_INDEX.md           ✅ 案例索引
├── apk-build-errors.md      ✅ APK 构建异常
└── service-build-errors.md  ✅ 服务构建异常
```

---

## 规则验证

### rule-validator Skill

项目已集成 `rule-validator` Skill，用于自动验证规则文件规范。

**触发时机：**
- 创建新的规则文件时
- 修改现有规则文件后
- 用户要求"验证规则"时

**验证内容：**
1. **文件头规范** - `alwaysApply` 和 `description` 字段
2. **文件名规范** - 大写字母、连字符分隔
3. **注册状态** - 是否在 `rule-index.json` 中注册
4. **内容规范** - 标题、更新日期、版本号
5. **交叉引用** - 文件引用是否有效
6. **INDEX.md 同步** - 文件清单是否与实际一致

**使用方式：**
```
用户: 验证 BUILD_RED_LINES.md
AI: 调用 rule-validator Skill → 输出验证报告
```

### 规则质量门禁

创建或修改规则文件时，必须：
1. ✅ 通过 rule-validator 验证
2. ✅ 更新 `rule-index.json`（如新增规则）
3. ✅ 更新 `INDEX.md` 规则清单（如新增规则）
4. ✅ 更新本文件最后更新日期
5. ✅ 运行 `rules-consistency-check.sh` 一致性检查

### 一致性检查脚本

项目提供了 `rules-consistency-check.sh` 用于自动化审计：

```bash
bash .trae/rules-consistency-check.sh
```

**检查内容：**
- 所有 .md 文件是否在 rule-index.json 中注册
- rule-index.json 中注册的文件是否存在
- INDEX.md 列出的文件是否存在
- alwaysApply:true 的文件是否在 always/safety 组中

---

## 更新日志

### 2026-05-25 — MCP 能力深度集成

- ✅ 新增 3 个 MCP 工具：Context7（实时文档）/ Chrome DevTools（性能+调试）/ PostgreSQL（只读数据查询）
- ✅ 重写 `common/AGENTS.md`（v3.0）：新增 MCP 工具清单 + 协同矩阵 + 增强场景推荐
- ✅ 重写 `common/PERFORMANCE.md`（v2.0）：新增 Chrome DevTools 性能追踪 + PostgreSQL EXPLAIN §2
- ✅ 升级 `deploy-linkchest` Skill：Step 5 新增 Chrome DevTools 深度验证 + PostgreSQL 数据库验证
- ✅ 升级 `check-servers` Skill：新增 Chrome DevTools（方式3，替代 Playwright 成为推荐）+ PostgreSQL 直连检查（方式5）
- ✅ `rule-index.json` 注册 6 个 MCP（aliyun-servers / GitHub / Playwright / Chrome DevTools / Context7 / PostgreSQL）
- ✅ `INTERACTION.md` §6 新增 MCP 降级策略（4 条优先级规则）
- ✅ `ECC_SKILLS.md` 新增 MCP 协同说明
- ✅ `INDEX.md` 快速查找表新增性能分析/调试问题入口

### 2026-05-22 - 第二轮深度优化

- ✅ 修复 BUILD_RED_LINES.md / CAUTION_ZONE.md / RED_LINES.md 的 alwaysApply 矛盾
- ✅ 重写 AGENTS.md（397→97行），反映实际 4 Skill + 7 ECC Skill
- ✅ 精简 HOOKS.md（498→46行），移除虚构的 Hooks 实现
- ✅ 更新 GIT_WORKFLOW.md 为 trunk-based（匹配实际工作流）
- ✅ 更新 PROJECT_SENSE.md（移除 Vercel/eas.json，加入双 WSL + Git-Only）
- ✅ INTERACTION.md 注册 ECC Skill 触发条件
- ✅ 创建 deploy-linkchest / build-error-diagnose / check-servers 三个 Skill
- ✅ 强制 Git-Only 部署策略（HIGH_RISK.md §2.0）
- ✅ 删除 9 个低价值文件 + 归档 6 个旧部署脚本
- ✅ BUILD.md §7 去重，DEPLOYMENT.md §11-12 精简

### 2026-05-22 - 第一轮精简

- ✅ 删除 9 个文件（DEBUG/DEPENDENCY/CONTEXT/BASE-INFO/common-security-patterns-README/typescript-README/NAMING_CONVENTIONS）
- ✅ BUILD_RED_LINES.md + CAUTION_ZONE.md 降为 alwaysApply: false
- ✅ 合并 NAMING_CONVENTIONS.md → CODE_STYLE.md
- ✅ 服务器信息去重（仅保留 HIGH_RISK.md）

---

## 如何使用

### 新项目

1. 复制 `common/` 目录（通用规则）
2. 复制语言特定目录（如 `typescript/`）
3. 创建项目特定规则（参考 `SOUL.md`, `USER.md` 等）

### 现有项目

1. 查看 `INDEX.md` 了解规则体系
2. 根据需要逐步采用规则
3. 优先采用高优先级规则（安全、测试、代码风格）

### 规则冲突处理

1. 检查规则优先级
2. 项目特定规则优先
3. 如无明确优先级，采用更具体的规则

---

## 维护

- **通用规则** - 定期同步 `.trae-cn/rules/common/`
- **项目规则** - 根据项目进展更新
- **月度审计** - 每月执行 `rules-consistency-check.sh` 验证完整性

---

*最后更新：2026-05-25*
*版本：v2.6 — MCP 能力深度集成*