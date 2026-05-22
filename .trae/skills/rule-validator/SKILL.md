---
name: "rule-validator"
description: "自动验证规则文件是否符合规范，检查文件头、命名、注册状态。Invoke when creating new rule files, modifying existing rules, or when user asks to validate rules."
---

# Rule Validator Skill

自动验证 `.trae/rules/` 目录下的规则文件是否符合项目规范。

## 触发时机

- 创建新的规则文件时
- 修改现有规则文件后
- 用户要求"验证规则"、"检查规则规范"时
- 规则文件出现格式问题时

## 验证项目

### 1. 文件头规范（Frontmatter）

**必须包含：**
```yaml
---
alwaysApply: true|false
description: "规则描述 - 简短说明规则用途"
---
```

**检查项：**
- [ ] 文件头以 `---` 开头和结尾
- [ ] 包含 `alwaysApply` 字段（布尔值）
- [ ] 包含 `description` 字段（字符串，不超过 100 字）
- [ ] `description` 不为空且有意义

**错误示例：**
```yaml
---
# ❌ 缺少 alwaysApply
# ❌ 缺少 description
---
```

**正确示例：**
```yaml
---
alwaysApply: true
description: "构建和部署红线规则 - 绝对禁止的行为"
---
```

### 2. 文件名规范

**检查项：**
- [ ] 文件名使用大写字母（如 `BUILD.md`）
- [ ] 使用连字符 `-` 分隔单词（如 `BUILD_RED_LINES.md`）
- [ ] 扩展名为 `.md`
- [ ] 不使用中文文件名

**例外：**
- `README.md` 可以使用小写
- `INDEX.md` 可以使用小写

### 3. 规则注册状态

**检查项：**
- [ ] 如果 `alwaysApply: true`，必须在 `rule-index.json` 的 `always` 或 `safety` 组中
- [ ] 如果 `alwaysApply: false`，必须在 `rule-index.json` 的某个 task 组中
- [ ] `rule-index.json` 中的文件路径必须与实际文件一致

### 4. 内容规范

**检查项：**
- [ ] 文件包含标题（`# ` 开头）
- [ ] 标题与文件名相关（如 `BUILD.md` 包含构建相关标题）
- [ ] 包含最后更新日期
- [ ] 包含版本号

### 5. 案例集锦特殊规范

**检查项：**
- [ ] 案例文件包含 YAML frontmatter（id, category, severity, frequency, first_seen, last_seen, status）
- [ ] 案例编号格式正确（CASE-001, CASE-S001, CASE-E001）
- [ ] 包含现象、根因、解决、预防四个章节

## 验证流程

```
开始验证
    ↓
1. 扫描 .trae/rules/ 目录下所有 .md 文件
    ↓
2. 对每个文件执行验证检查
    - 文件头规范
    - 文件名规范
    - 注册状态
    - 内容规范
    ↓
3. 生成验证报告
    - 通过项 ✅
    - 失败项 ❌（附详细说明）
    - 警告项 ⚠️（建议优化）
    ↓
4. 输出修复建议
```

## 验证报告格式

```
📋 规则验证报告
========================================

验证文件: [文件名]
验证时间: [时间]

✅ 通过项:
   - 文件头规范
   - 文件名规范

❌ 失败项:
   - 未在 rule-index.json 中注册
     建议: 在 rule-index.json 的 [组名] 中添加 "[文件名]"

⚠️ 警告项:
   - description 超过 100 字
     当前: 120 字
     建议: 精简为 "简要描述"

========================================
验证结果: [通过/失败]
```

## 自动修复

对于可自动修复的问题，提供修复选项：

**可自动修复：**
- 缺少 `description` → 根据文件名生成默认描述
- 文件名大小写错误 → 提示重命名
- 缺少最后更新日期 → 自动添加

**需手动修复：**
- `alwaysApply` 值错误
- 内容不符合规范
- 案例编号冲突

## 使用示例

### 验证单个文件

```
用户: 验证 BUILD_RED_LINES.md
AI: 执行 rule-validator skill
    检查 BUILD_RED_LINES.md
    输出验证报告
```

### 验证所有规则

```
用户: 验证所有规则文件
AI: 执行 rule-validator skill
    扫描 .trae/rules/ 目录
    检查所有 .md 文件
    输出完整验证报告
```

### 创建新规则时自动验证

```
用户: 创建新规则文件
AI: 1. 创建文件
    2. 执行 rule-validator skill
    3. 如果验证失败，提示修复
    4. 修复后重新验证
```

## 集成到工作流

### 创建规则文件时

```
用户要求创建规则
    ↓
1. 创建规则文件
2. 自动调用 rule-validator
3. 如果验证失败:
   - 显示错误
   - 提供修复建议
   - 等待用户确认修复
4. 验证通过后:
   - 更新 rule-index.json
   - 通知用户完成
```

### 修改规则文件时

```
用户修改规则
    ↓
1. 应用修改
2. 自动调用 rule-validator
3. 检查是否引入新问题
4. 如果有问题，提示修复
```

## 高级验证（v2.0 新增）

### 6. 交叉引用验证

检查规则文件中的文件引用是否有效：

- [ ] 所有 `参考 xxx.md` 引用的文件是否存在
- [ ] 所有 `见 xxx.md` 引用的文件是否存在
- [ ] **禁止引用已删除的文件**（如 `linkchest-build-apk.md`、`RIVERPOD.md`）
- [ ] 引用的路径格式正确

### 7. INDEX.md 同步检查

验证 `INDEX.md` 规则清单与实际磁盘文件的一致性：

- [ ] INDEX.md 中列出的每个文件是否真实存在
- [ ] 磁盘上每个 .md 文件是否在 INDEX.md 中被列出
- [ ] INDEX.md 中的文件计数是否准确
- [ ] **不存在的文件不得出现在 INDEX.md 中**

### 8. 一致性检查集成

创建新规则后，自动调用 `rules-consistency-check.sh` 进行完整审计：

```bash
bash .trae/rules-consistency-check.sh
```

**检查清单：**
- [ ] 所有 .md 文件在 `rule-index.json` 中注册
- [ ] `rule-index.json` 所有条目对应文件存在
- [ ] `alwaysApply: true` 文件在 always/safety 组
- [ ] INDEX.md 清单与磁盘文件一致
- [ ] 无循环引用、无死链

### 9. 批量验证模式

```bash
# 验证所有规则文件
bash .trae/rules-consistency-check.sh --verbose

# 输出 JSON 格式报告（供 CI 使用）
bash .trae/rules-consistency-check.sh --json
```

## 规则文件清单（当前）v2.3

### Always 规则（始终加载）
- `SOUL.md`
- `USER.md`
- `INTERACTION.md`
- `RED_LINES.md`
- `HIGH_RISK.md`

### Context 规则（上下文触发）
- `PROJECT_SENSE.md`
- `INDEX.md`

### Task 规则（任务触发）
- `BUILD.md`（含 APK 构建 + 时间戳命名）
- `BUILD_RED_LINES.md`（构建红线，build 组）
- `CODE_STYLE.md`
- `TESTING.md`
- `LINT.md`
- `GIT_WORKFLOW.md`
- `DEPLOYMENT.md`
- `MARKET-OPS.md`
- `CAUTION_ZONE.md`（安全/应急响应，security 组）

### 通用规则（common/）
- `DEVELOPMENT_WORKFLOW.md`
- `CODE_REVIEW.md`
- `HOOKS.md`
- `AGENTS.md`
- `PERFORMANCE.md`

### 已删除文件（禁止引用）
- `linkchest-build-apk.md` — 已合并至 BUILD.md（2026-05-19）
- `RIVERPOD.md` — 不存在的文件，禁止引用
- `DEBUG.md` — 已移除（2026-05-22）
- `DEPENDENCY.md` — 已移除（2026-05-22）
- `CONTEXT.md` — 已移除（2026-05-22）
- `BASE-INFO.md` — 已移除（2026-05-22）
- `NAMING_CONVENTIONS.md` — 已合并至 CODE_STYLE.md（2026-05-22）
- `common/security.md` — 已移除（2026-05-22）
- `common/patterns.md` — 已移除（2026-05-22）
- `common/README.md` — 已移除（2026-05-22）
- `typescript/README.md` — 已移除（2026-05-22）

### 案例集锦
- `cases/CASES_INDEX.md`
- `cases/apk-build-errors.md`
- `cases/service-build-errors.md`
- `cases/env-dependency-errors.md`

## 常见问题

### Q: 为什么 alwaysApply: true 的规则必须注册到 rule-index.json？
A: 因为 rule-index.json 是规则加载的索引文件，AI Agent 根据这个文件决定加载哪些规则。如果未注册，即使 alwaysApply: true 也不会被加载。

### Q: 案例集锦文件需要 alwaysApply 吗？
A: 不需要。案例集锦是参考文档，不是行为规则，通常设置为 `alwaysApply: false`。

### Q: 验证失败时可以强制保存吗？
A: 可以，但会提示风险。建议修复后再保存，确保规则质量。
