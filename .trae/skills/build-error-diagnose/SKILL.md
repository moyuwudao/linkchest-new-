---
name: "build-error-diagnose"
description: "构建错误自动诊断 - 输入错误日志，自动匹配案例集锦并给出修复方案。当构建失败、编译错误、build error 时自动触发。"
---

# Build Error Diagnose Skill

构建错误自动诊断系统，输入错误日志，自动匹配案例集锦并给出修复方案。

## 触发时机

- 构建失败（APK 构建、API/Web 构建、Chrome 扩展构建）
- 编译错误、TypeScript 类型错误
- 用户提到：构建失败、build error、编译报错
- 检测到错误关键词（Gradle、MODULE_NOT_FOUND、heap out of memory 等）

## 深度绑定规则

- **必须加载**：`BUILD_RED_LINES.md`（构建红线 + 关键词匹配表 §4.2）
- **必须加载**：`BUILD.md`（构建流程细节）
- **参考案例**：
  - `cases/apk-build-errors.md`（APK 构建案例）
  - `cases/service-build-errors.md`（服务构建案例）
  - `cases/env-dependency-errors.md`（环境依赖案例）

## 自动诊断流程

### Step 1: 捕获错误日志

```bash
# APK 构建日志
cat /tmp/build-*.log | tail -50

# 服务构建日志
npm run build 2>&1 | tail -50
```

### Step 2: 关键词匹配

使用 `BUILD_RED_LINES.md` §4.2 的关键词匹配表：

| 错误关键词 | 案例编号 | 自动修复 | 需确认 |
|-----------|---------|---------|--------|
| `services.gradle.org` | CASE-001 | 自动恢复镜像配置 | ❌ 自动 |
| `clean` + `cache` | CASE-002 | 提示禁止 clean，重新构建 | ✅ 需确认 |
| `prebuild` + `icon` | CASE-003 | 自动恢复图标文件 | ❌ 自动 |
| `download` + `gradle`/`dependency` | CASE-004 | 检查镜像和缓存配置 | ✅ 需确认 |
| `offline` + `No cached` | CASE-005 | 移除 --offline 参数 | ❌ 自动 |
| `JAVA_HOME` | CASE-006 | 设置环境变量 | ❌ 自动 |
| `incompatible` + `Kotlin`/`Gradle` | CASE-007 | 更新版本配置 | ✅ 需确认 |
| `quote` + `escape`/`PowerShell` | CASE-008 | 使用 bash 脚本构建 | ✅ 需确认 |
| `different` + `sync`/`directory` | CASE-009 | 同步代码目录 | ✅ 需确认 |
| `EBUSY` + `rmdir`/`locked` | CASE-010 | 关闭占用进程后重试 | ✅ 需确认 |
| `eas` + `login`/`cli` | CASE-011 | 禁止 EAS，改用 WSL 构建 | ❌ 自动 |
| `exports is not defined` / `__dirname is not defined` | CASE-013 | app.config.js 改为 CommonJS | ❌ 自动 |
| `usesCleartextTraffic` + 连接失败 | CASE-014 | 修改 expo-build-properties 配置 | ❌ 自动 |
| `.env.market` 缺失 / MARKET 错误 | CASE-016 | 检查并创建 .env.market 文件 | ❌ 自动 |
| `MODULE_NOT_FOUND` | CASE-S009 | 服务器本地重新构建 | ✅ 需确认 |
| `500` + `database`/`prisma` | CASE-S009 相关 | 执行 prisma db push | ✅ 需确认 |
| `heap out of memory` | CASE-S007 | 增加 Node.js 内存限制 | ❌ 自动 |
| `port` + `already in use` | CASE-S008 | 更换端口或关闭占用进程 | ❌ 自动 |

### Step 3: 输出诊断报告

```
🔧 构建错误诊断报告
========================================
错误类型: [APK/服务/环境]
匹配案例: [CASE-XXX]
错误信息: [具体错误]
修复方案: [具体步骤]
是否需要确认: [是/否]
========================================
```

### Step 4: 执行修复

- 无需确认的修复 → 自动执行
- 需要确认的修复 → 展示方案，等待用户确认
- 未匹配的案例 → 提示查阅案例集锦，记录新案例

### Step 5: 重新构建

修复后自动重试构建（最多 1 次）

## 未匹配案例处理

当错误关键词未匹配到任何案例时：

1. 输出完整错误日志（最后 100 行）
2. 提示"未找到匹配案例，请手动分析"
3. 建议查阅对应案例集锦：
   - APK 构建：`cases/apk-build-errors.md`
   - 服务构建：`cases/service-build-errors.md`
   - 环境依赖：`cases/env-dependency-errors.md`
4. 询问是否记录为新案例

### 新案例记录格式

```
# CASE-[编号]

## 现象
[错误日志关键信息]

## 根因
[分析原因]

## 解决
[修复步骤]

## 预防
[预防措施]
```

## 自动触发机制

当检测到构建失败时，AI 必须：

1. 先加载 `BUILD_RED_LINES.md` 获取关键词匹配表
2. 捕获错误日志
3. 按本 Skill 流程诊断
4. 输出修复方案

```
构建失败检测
    ↓
加载 BUILD_RED_LINES.md（§4.2 关键词匹配表）
    ↓
捕获错误日志（最后 50 行 + 关键错误行）
    ↓
关键词匹配
    ↓
匹配成功 → 输出案例编号 + 修复方案
    ↓          ↓
    ↓     无需确认 → 自动执行修复
    ↓     需确认 → 展示方案等待用户确认
    ↓          ↓
    ↓     执行修复 → 重新构建（最多 1 次）
    ↓
匹配失败 → 输出完整日志 → 提示查阅案例集锦 → 询问记录新案例
```

## 与规则的绑定关系

```
构建失败 → 加载本 Skill
    ↓
加载 BUILD_RED_LINES.md（关键词匹配表 §4.2）
    ↓
加载 BUILD.md（构建流程细节）
    ↓
加载对应案例集锦
    ↓
匹配 → 修复 → 重试
    ↓
未匹配 → 输出日志 → 记录新案例
```

## 构建类型与日志路径

### APK 构建（WSL 环境）

```bash
# 日志位置
/tmp/build-$(date +%Y%m%d-%H%M%S).log

# 国际版
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh

# 国内版
wsl -d linkchest-cn -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
```

### API 服务构建

```bash
cd project/apps/api && npm run build
```

### Web 前端构建

```bash
cd project/apps/web && npm run build
```

### Chrome 扩展构建

```bash
cd project/apps/chrome-extension && npm run build
```

## 常见问题

### Q: 构建失败后可以直接重试吗？
A: 不建议。先通过本 Skill 诊断错误原因，修复后再重试，避免重复失败浪费时间。

### Q: 为什么自动修复后仍然失败？
A: 可能是多个错误叠加。查看最新日志，继续匹配下一个关键词，逐个修复。

### Q: 案例集锦中没有对应案例怎么办？
A: 记录新案例到对应分类的案例集锦文件中，帮助后续诊断覆盖更多场景。
