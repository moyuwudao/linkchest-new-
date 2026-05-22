# RULE_LOADING.md — 规则智能加载方案

> 本文档说明 LinkChest 规则的智能加载机制，避免上下文爆掉。

---

## 1. 设计原理

### 1.1 问题背景
- **问题**：规则文档一次性加载会消耗大量 tokens
- **影响**：上下文空间不足，影响 AI 助手响应质量
- **目标**：根据任务类型动态加载相关规则，控制在 8,000 tokens 以内

### 1.2 解决方案
将规则分为三类，按需加载：

| 类型 | 加载时机 | Token 消耗 | 示例 |
|------|----------|------------|------|
| **always** | 始终加载 | ~3000 tokens | SOUL.md, RED_LINES.md |
| **context** | 需要项目上下文时 | ~3000 tokens | PROJECT_SENSE.md |
| **task** | 根据任务关键词 | ~1500-2500 tokens | CODE_STYLE.md, GIT_WORKFLOW.md |

---

## 2. 规则分类

### 2.1 Always 规则（始终加载）

这些规则定义了 AI 助手的基本行为，必须始终存在：

```
SOUL.md               - 身份定位、行为基调
USER.md               - 开发者画像与偏好
INTERACTION.md        - 交互方式、确认机制、构建/部署阻断
RED_LINES.md          - 安全红线、禁区
HIGH_RISK.md          - 高风险操作（部署+构建安全）
```

**Token 消耗**：~3500 tokens

### 2.2 Context 规则（按需加载）

这些规则提供项目上下文，首次访问项目时加载：

```
PROJECT_SENSE.md      - 项目结构、技术栈
```

**Token 消耗**：~2000 tokens

**触发条件**：
- 用户提到"项目结构"、"技术栈"
- 首次访问项目文件

### 2.3 Task 规则（动态加载）

这些规则根据任务类型动态加载：

| 规则文件 | 触发关键词 | Token 消耗 |
|-----------|-----------|------------|
| `CODE_STYLE.md` | 编写代码、代码风格、React、TypeScript | ~2000 tokens |
| `TESTING.md` | 测试、单元测试、jest、playwright | ~2000 tokens |
| `LINT.md` | lint、typecheck、ESLint、类型错误 | ~1500 tokens |
| `GIT_WORKFLOW.md` | git、commit、分支、PR、merge | ~2000 tokens |
| `BUILD.md` + `BUILD_RED_LINES.md` | 构建、build、APK、Android、iOS | ~3000 tokens |
| `CAUTION_ZONE.md` | 安全、CSP、XSS、应急响应、安全头 | ~1500 tokens |
| `DEPLOYMENT.md` | 部署、deploy、ssh、pm2 | ~2000 tokens |
| `MARKET-OPS.md` | 国内、海外、支付、登录 | ~2000 tokens |

---

## 3. 加载策略

### 3.1 加载优先级

```
1. Always 规则（始终加载）
   ↓
2. Context 规则（需要时加载）
   ↓
3. Task 规则（根据任务关键词加载）
```

### 3.2 Token 预算

| 规则类型 | Token 预算 | 说明 |
|----------|------------|------|
| Always 规则 | ~3500 | 固定消耗 |
| Context 规则 | ~2000 | 按需消耗 |
| Task 规则 | ~1500-2500 | 单个任务消耗 |
| **总安全限制** | **~8000** | 确保不超限 |

### 3.3 加载示例

**场景 1：编写新功能**
```
Always 规则（3000 tokens）
+ Context 规则（3000 tokens）
+ CODE_STYLE.md（2000 tokens）
+ GIT_WORKFLOW.md（2000 tokens）
= 10,000 tokens ⚠️ 超限
```

**优化方案**：只加载必要的 Task 规则
```
Always 规则（3000 tokens）
+ CODE_STYLE.md（2000 tokens）
= 5000 tokens ✅ 安全
```

**场景 2：构建 APK**
```
Always 规则（3000 tokens）
+ BUILD.md（2500 tokens）
= 5500 tokens ✅ 安全
```

---

## 4. 使用方式

### 4.1 AI 助手自动加载

AI 助手会根据用户输入的关键词自动判断需要加载哪些规则：

```javascript
// 伪代码示例
function loadRules(userInput) {
  const rules = [];

  // 1. 始终加载核心规则
  rules.push(loadAlwaysRules());

  // 2. 检测是否需要项目上下文
  if (needsProjectContext(userInput)) {
    rules.push(loadContextRules());
  }

  // 3. 根据任务关键词加载对应规则
  const taskType = detectTaskType(userInput);
  if (taskType) {
    rules.push(loadTaskRules(taskType));
  }

  return rules;
}
```

### 4.2 手动指定规则

如果自动检测不准确，用户可以手动指定需要加载的规则：

```
用户：帮我写一个 React 组件，请参考 CODE_STYLE.md

AI 助手：加载 CODE_STYLE.md，然后编写组件
```

### 4.3 规则切换

当任务类型变化时，AI 助手会自动切换规则：

```
用户：帮我写一个测试用例

AI 助手：[切换规则] 加载 TESTING.md
AI 助手：根据 TESTING.md 规范编写测试用例
```

---

## 5. 最佳实践

### 5.1 避免规则冲突

- **原则**：同一时间只加载 1-2 个 Task 规则
- **方法**：明确任务类型，避免混合多个任务

### 5.2 优化上下文

- **原则**：保持上下文简洁，避免重复加载
- **方法**：任务完成后，AI 助手会自动卸载不需要的规则

### 5.3 Token 监控

AI 助手会实时监控 token 消耗：

```
当前 token 消耗：6500 / 8000 (81%)
```

如果接近限制，会提示：

```
⚠️ Token 消耗接近限制，建议：
1. 完成当前任务后再开始新任务
2. 使用简洁的描述
```

---

## 6. 配置文件

### 6.1 rule-index.json

规则索引文件定义了所有规则的加载策略：

```json
{
  "rules": {
    "core": {
      "priority": "always",
      "files": ["SOUL.md", "USER.md", "INTERACTION.md"]
    },
    "safety": {
      "priority": "always",
      "files": ["RED_LINES.md"]
    },
    "coding": {
      "priority": "task",
      "files": ["CODE_STYLE.md"],
      "triggers": ["编写代码", "React", "TypeScript"]
    }
  }
}
```

### 6.2 修改配置

如需调整加载策略，编辑 `rule-index.json`：

```json
{
  "coding": {
    "priority": "always",  // 改为始终加载
    "files": ["CODE_STYLE.md"]
  }
}
```

---

## 7. 故障排除

### 7.1 规则未加载

**问题**：AI 助手没有加载预期的规则

**解决方案**：
1. 检查触发关键词是否匹配
2. 手动指定需要加载的规则
3. 检查 `rule-index.json` 配置

### 7.2 Token 超限

**问题**：上下文爆掉，响应中断

**解决方案**：
1. 简化任务描述
2. 分阶段完成任务
3. 使用"继续"命令恢复上下文

### 7.3 规则冲突

**问题**：多个规则给出冲突的建议

**解决方案**：
1. 检查 Always 规则是否覆盖了 Task 规则
2. 明确优先级（Always > Context > Task）
3. 手动指定使用哪个规则

---

## 8. 未来优化

### 8.1 智能缓存

- 缓存常用规则，减少重复加载
- 使用 LRU 算法管理缓存

### 8.2 规则压缩

- 压缩规则文件，减少 token 消耗
- 使用摘要版本代替完整内容

### 8.3 动态调整

- 根据实际 token 消耗动态调整加载策略
- 自适应优化规则加载时机

---

*最后更新：2026-05-22*
*版本：v1.1*
