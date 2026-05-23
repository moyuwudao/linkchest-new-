---
alwaysApply: false
description: "构建红线规则 - APK构建时绝对禁止的行为，构建操作时自动加载"
---
# BUILD_RED_LINES.md — 构建红线规则

> 本文档定义构建APK时绝对禁止的行为。
> **本规则 alwaysApply: false，构建操作时自动加载。构建红线任何Agent必须遵守。**
>
> **部署相关红线**：请查阅 [HIGH_RISK.md](HIGH_RISK.md)

---

> **🔧 关联 Skill**：构建失败时请使用 `build-error-diagnose` Skill（自动匹配案例集锦并给出修复方案）。

---

## 1. 构建APK红线

### 1.1 绝对禁止的行为

| 禁止行为 | 原因 | 违规后果 |
|----------|------|----------|
| **在 Windows 本地执行 Gradle/Expo 构建** | 必须使用 WSL 构建 | 环境不兼容、依赖重复下载、构建失败 |
| **使用错误的 WSL 实例** | 国际版必须用 `linkchest-global`，国内版必须用 `linkchest-cn` | flavor 不匹配、APK 配置错误 |
| **使用 `clean` 相关命令** | 会删除已缓存的 Gradle 和 Maven 依赖 | 下次构建需重新下载，耗时极长 |
| **使用 `--clean` 参数** | `prebuild --clean` 会清除 Android 项目 | 需重新配置镜像和图标 |
| **使用 EAS 构建** | 服务器未安装 eas-cli，且无需 Expo 账号 | 构建失败，浪费时间 |
| **从官方地址下载 Gradle** | 网络极慢或超时 | 构建卡住或失败 |
| **未阅读 BUILD.md 直接构建** | 不了解镜像配置、缓存配置、WSL要求 | 构建失败或配置丢失 |
| **未设置 MARKET 环境变量构建 APK** | 高 | 构建的 APK 市场配置错误，用户看到错误的支付/登录选项 |
| **并行构建时 .env.market 未隔离** | 高 | 两个 WSL 实例竞争写入同一文件，导致 APK 配置混乱 |

### 1.2 强制检查清单

执行任何APK构建相关操作前，必须确认：

- [ ] **已阅读 BUILD.md** — 了解 WSL 环境要求、镜像配置、缓存配置
- [ ] **确认 WSL 实例** — 国际版用 `linkchest-global`，国内版用 `linkchest-cn`
- [ ] **验证镜像配置** — Gradle Wrapper 和 Maven 仓库使用国内镜像
- [ ] **启用缓存** — 确认 `org.gradle.caching=true`
- [ ] **禁止 clean** — 确认不使用 `clean` 命令
- [ ] **MARKET 隔离** — 确认 `.env.market` 已写入实例隔离路径（`/tmp/.env.market.{WSL_DISTRO_NAME}`）
- [ ] **Metro 缓存隔离** — 确认 `REACT_NATIVE_METRO_CACHE_DIR` 已设置为实例特定目录
- [ ] **构建后验证** — 国内版构建完成后验证 bundle 不包含 `linkchest.net`

### 1.3 唯一允许的构建方式

#### 双 WSL 架构

| WSL 实例 | 用途 | Flavor | MARKET |
|----------|------|--------|--------|
| `linkchest-global` | 国际版 APK | global | global |
| `linkchest-cn` | 国内版 APK | china | china |

#### 构建命令

```bash
# ✅ 方式1：通过 PowerShell 统一入口（推荐，支持并行构建）
.\project\apps\mobile\build-apk.ps1           # 并行构建两个版本（推荐）
.\project\apps\mobile\build-apk.ps1 global    # 只构建国际版
.\project\apps\mobile\build-apk.ps1 china     # 只构建国内版

# ✅ 方式2：直接通过 WSL 构建（单版本）
wsl -d linkchest-global -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
wsl -d linkchest-cn -u mayn -- bash /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh
```

#### 双版本构建策略

> **当需要同时构建国际版和国内版 APK 时，必须使用并行构建。**

| 策略 | 命令 | 耗时 | 适用场景 |
|------|------|------|----------|
| **并行构建（推荐）** | `.\project\apps\mobile\build-apk.ps1` | ~10分钟 | 需要两个版本时 |
| 串行构建 | 分别执行两个 WSL 命令 | ~20分钟 | 仅需调试单个版本时 |

**并行构建优势：**
- 两个 WSL 实例完全独立，Metro/Gradle 缓存互不干扰
- 总耗时接近单次构建，效率翻倍
- 避免 `.env.market` 文件竞争问题（单 WSL 串行构建时的根因）

**禁止的任何其他方式：**
- ❌ `npx expo prebuild --platform android --clean`
- ❌ `cd android && ./gradlew assembleRelease`
- ❌ `eas build --platform android`
- ❌ 任何在 Windows PowerShell/CMD 中执行的构建命令

---

## 2. 自动阻断机制

### 2.1 触发阻断的关键词（构建）

当检测到以下任何关键词时，**立即停止执行**，进入确认流程：

- `gradlew`、`gradle`、`assembleRelease`
- `expo prebuild`、`eas build`
- `android/app/build`
- `clean` + `gradle`/`build`（禁止 clean 相关命令）
- `.env.market` 缺失或 MARKET 值错误

> **部署相关阻断**：由 [HIGH_RISK.md](HIGH_RISK.md) 处理

### 2.2 阻断后的强制流程

```
检测到构建相关操作
    ↓
1. 【立即停止】不执行任何命令
    ↓
2. 【检查清单】确认第 1.2 节所有检查项已勾选
    ↓
3. 【阅读规则】确认已阅读 BUILD.md 第 5 节（Mobile 构建）
    ↓
4. 【确认环境】确认使用正确的 WSL 实例（global→linkchest-global, china→linkchest-cn）
    ↓
5. 【用户确认】向用户展示确认信息，等待明确回复
    ↓
6. 【执行】收到确认后才允许继续
```

### 2.3 阻断确认模板

```
⚠️ 构建操作阻断
┌─────────────────────────────────────────┐
│ 检测到 APK 构建操作                      │
│                                         │
│ 必须确认以下检查项：                    │
│   ⬜ 已阅读 BUILD.md 第 5 节            │
│   ⬜ 确认使用正确的 WSL 实例            │
│     - 国际版: linkchest-global          │
│     - 国内版: linkchest-cn              │
│   ⬜ 确认不使用 clean 参数              │
│   ⬜ 确认 Gradle 镜像已配置             │
│   ⬜ 确认 Maven 镜像已配置              │
│                                         │
│ 未全部确认前，禁止执行任何命令！        │
└─────────────────────────────────────────┘

请确认以上检查项已完成 [Y/N]
```

---

## 3. 违规处理

### 3.1 发现违规时

1. **立即停止**当前操作
2. **记录违规**到案例集锦
3. **通知用户**违规的具体行为
4. **引导正确流程**

### 3.2 案例记录

每次违规都应记录为新案例：
- 违规时间
- 违规Agent
- 违规行为
- 正确做法
- 预防措施

---

## 4. 构建失败自动处理（AI Agent 层）

### 4.1 自动检测流程

构建失败时，AI Agent **必须**按以下流程自动处理：

```
构建失败
    ↓
1. 【捕获日志】获取完整错误输出（最后 50 行 + 关键错误行）
    ↓
2. 【关键词匹配】对照 4.2 节关键词表匹配案例
    ↓
3. 【输出方案】
   - 匹配成功 → 输出案例编号 + 解决方案
   - 匹配失败 → 提示查阅案例集锦 + 记录新案例
    ↓
4. 【执行修复】按案例解决方案自动修复（如可能）
    ↓
5. 【重试构建】修复后自动重试（最多 1 次）
```

### 4.2 关键词匹配表

| 错误关键词 | 案例编号 | 自动解决建议 | 需用户确认 |
|-----------|---------|------------|-----------|
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
| `MODULE_NOT_FOUND` | CASE-S009 | 服务器本地重新构建 | ✅ 需确认 |
| `500` + `database`/`prisma` | CASE-S009 相关 | 执行 prisma db push | ✅ 需确认 |
| `heap out of memory` | CASE-S007 | 增加 Node.js 内存限制 | ❌ 自动 |
| `port` + `already in use` | CASE-S008 | 更换端口或关闭占用进程 | ❌ 自动 |
| `.env.market` 缺失 / MARKET 错误 | CASE-016 | 检查并创建 .env.market 文件 | ❌ 自动 |

### 4.3 自动修复执行标准

**无需确认自动修复：**
- 镜像配置恢复（CASE-001）
- 环境变量设置（CASE-006）
- 移除 --offline 参数（CASE-005）
- 图标恢复（CASE-003）
- 禁止 EAS 提示（CASE-011）
- 内存限制调整（CASE-S007）
- app.config.js ESM→CommonJS 修复（CASE-013）
- expo-build-properties usesCleartextTraffic 修复（CASE-014）

**需用户确认后修复：**
- 涉及代码变更（CASE-007、CASE-009）
- 涉及文件删除/重建（CASE-002、CASE-010）
- 涉及服务器操作（CASE-S009）
- 涉及数据库变更（CASE-S009 相关）

### 4.4 未匹配案例处理

当错误关键词**未匹配**到任何案例时：

```
未匹配到已知案例
    ↓
1. 输出完整错误日志（最后 100 行）
2. 提示用户："未找到匹配案例，请手动分析"
3. 建议查阅：.trae/rules/cases/apk-build-errors.md
4. 询问是否记录为新案例
    ↓
用户确认后 → 按案例格式记录并更新集锦
```

### 4.5 构建脚本集成要求

所有构建脚本**必须**支持日志捕获：

```bash
# 标准日志捕获格式
BUILD_LOG="/tmp/build-$(date +%Y%m%d-%H%M%S).log"
./gradlew assembleRelease ... 2>&1 | tee "$BUILD_LOG"

# 构建失败时自动分析
if [ $? -ne 0 ]; then
    echo "=== 构建失败，启动自动分析 ==="
    # AI Agent 读取 $BUILD_LOG 进行关键词匹配
fi
```

---

*最后更新：2026-05-21*
*版本：v3.0 — 双 WSL 架构（linkchest-global + linkchest-cn）*
*优先级：任务触发 - 构建操作时自动加载*
