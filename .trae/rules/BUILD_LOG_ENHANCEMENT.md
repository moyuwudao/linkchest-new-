---
alwaysApply: false
description: APK与WEB端调试日志增强方案 - 构建异常率降低专项
---

# APK 与 WEB 端调试日志增强方案

> 为解决 APK 和 WEB 端国内/国外版本构建异常率高的问题，制定本调试日志增强方案。
> 方案覆盖日志收集范围、内容规范、输出方式、分级策略、国内外版本适配、实施步骤及预期成果。
>
> **适用范围**：`apps/mobile`（APK 构建）、`apps/web`（WEB 构建）、`apps/api`（API 构建）
> **关联规则**：[BUILD.md](BUILD.md)、[BUILD_RED_LINES.md](BUILD_RED_LINES.md)、[HIGH_RISK.md](HIGH_RISK.md)
> **关联 Skill**：`build-error-diagnose`

---

## 1. 日志收集范围

### 1.1 APK 构建环节（Mobile）

| 环节 | 关键节点 | 当前日志覆盖 | 需增强内容 |
|------|----------|-------------|-----------|
| **环境准备** | WSL 实例启动、环境变量设置 | 部分 | JAVA_HOME/ANDROID_HOME 验证值、WSL_DISTRO_NAME 检测值 |
| **配置注入** | `.env.market` 写入、MARKET 值确认 | 有 | 三处写入路径的确认值、文件内容校验 |
| **缓存隔离** | Metro 缓存目录创建、Gradle 缓存状态 | 有 | 缓存目录权限、磁盘剩余空间 |
| **JS Bundle** | Metro Bundler 启动、打包进度 | 无 | Metro 完整输出日志、打包耗时、内存占用 |
| **Gradle 构建** | 依赖解析、编译、打包、签名 | 有（tee 捕获） | 每个 Task 的耗时、UP-TO-DATE 判定原因 |
| **产物验证** | APK 生成、包名校验、bundle 内容检查 | 部分 | APK 文件大小、SHA256、时间戳一致性 |
| **并行构建** | 两个 WSL 实例的协调状态 | 无 | 实例间竞争检测、文件锁状态 |

### 1.2 WEB 构建环节（Web）

| 环节 | 关键节点 | 当前日志覆盖 | 需增强内容 |
|------|----------|-------------|-----------|
| **环境准备** | Node.js 版本、npm 版本、环境变量加载 | 无 | `process.env` 关键变量快照（脱敏） |
| **依赖安装** | `npm install` / `npm ci` | 无 | 安装耗时、peer 依赖冲突警告、lock 文件一致性 |
| **Turbo 构建** | 任务调度、缓存命中、并行执行 | 部分 | 每个子任务的详细耗时、缓存失效原因 |
| **Next.js 构建** | 页面编译、静态生成、代码分割 | 部分 | 每页构建耗时、动态导入解析日志 |
| **类型检查** | TypeScript `tsc --noEmit` | 有 | 错误分级统计、类型检查耗时 |
| **产物验证** | `.next` 目录完整性、静态资源 | 无 | 产物大小趋势、关键文件存在性检查 |

### 1.3 API 构建环节（API）

| 环节 | 关键节点 | 当前日志覆盖 | 需增强内容 |
|------|----------|-------------|-----------|
| **Prisma 生成** | Client 生成、类型定义 | 无 | 生成耗时、schema 变更检测 |
| **TypeScript 编译** | `tsc` 编译过程 | 有 | 编译耗时、增量编译命中率 |
| **产物验证** | `dist` 目录完整性 | 无 | 入口文件存在性、依赖打包完整性 |

---

## 2. 日志内容规范

### 2.1 通用字段（所有日志必须包含）

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `timestamp` | ISO 8601 | 日志产生时间 | `2026-05-22T14:30:00.123+08:00` |
| `level` | string | 日志级别 | `DEBUG` / `INFO` / `WARN` / `ERROR` |
| `stage` | string | 构建阶段 | `env-prep` / `config-inject` / `build` / `verify` |
| `step` | string | 具体步骤 | `write-env-market` / `metro-bundle` / `gradle-task` |
| `flavor` | string | 构建版本 | `global` / `china` / `N/A` |
| `wsl_instance` | string | WSL 实例名（APK） | `linkchest-global` / `linkchest-cn` |
| `build_id` | string | 构建唯一标识 | `build-20260522-143000-global` |
| `message` | string | 日志内容 | `Gradle task :app:compileReleaseKotlin completed` |

### 2.2 结构化数据字段（按场景附加）

**环境信息（stage=env-prep）**

```json
{
  "env": {
    "java_version": "17.0.8",
    "node_version": "20.12.0",
    "gradle_version": "8.8",
    "wsl_distro": "linkchest-global",
    "disk_free_gb": 45.2,
    "memory_free_mb": 2048
  }
}
```

**配置信息（stage=config-inject）**

```json
{
  "config": {
    "market_value": "global",
    "env_market_paths": [
      "/mnt/d/trae_projects/.../.env.market",
      "/tmp/.env.market.linkchest-global"
    ],
    "env_market_content_hash": "a3f5c2...",
    "metro_cache_dir": "/tmp/metro-cache-linkchest-global",
    "metro_cache_dir_exists": true,
    "metro_cache_dir_writable": true
  }
}
```

**构建任务信息（stage=build）**

```json
{
  "task": {
    "name": ":app:compileReleaseKotlin",
    "duration_ms": 12500,
    "up_to_date": false,
    "cache_hit": false,
    "result": "SUCCESS"
  }
}
```

**错误信息（level=ERROR）**

```json
{
  "error": {
    "code": "CASE-001",
    "category": "apk-build",
    "message": "Gradle 镜像被重置为官方地址",
    "matched_keyword": "services.gradle.org",
    "stack_trace": "...",
    "suggestion": "执行 fix-gradle-mirror.sh 恢复镜像",
    "auto_fixable": true
  }
}
```

**产物信息（stage=verify）**

```json
{
  "artifact": {
    "type": "apk",
    "path": "app/build/outputs/apk/global/release/linkchest-global-202605221430.apk",
    "size_bytes": 75342123,
    "sha256": "a1b2c3...",
    "timestamp": "2026-05-22T14:30:00.000+08:00",
    "package_name": "com.linkchest.app",
    "version_name": "1.0.0",
    "version_code": 1
  }
}
```

### 2.3 日志格式

**文件日志格式（JSON Lines）**

```json
{"timestamp":"2026-05-22T14:30:00.123+08:00","level":"INFO","stage":"build","step":"gradle-task","flavor":"global","wsl_instance":"linkchest-global","build_id":"build-20260522-143000-global","message":"Task :app:compileReleaseKotlin completed in 12.5s","task":{"name":":app:compileReleaseKotlin","duration_ms":12500,"up_to_date":false,"cache_hit":false,"result":"SUCCESS"}}
```

**控制台输出格式（人类可读）**

```
[2026-05-22 14:30:00] [INFO] [build:gradle-task] [global@linkchest-global] Task :app:compileReleaseKotlin completed in 12.5s
```

---

## 3. 日志输出方式

### 3.1 APK 端日志输出

| 渠道 | 用途 | 配置 |
|------|------|------|
| **构建日志文件** | 完整构建过程记录 | `/tmp/build-{flavor}-{timestamp}.log`（现有） |
| **结构化日志文件** | 机器解析、自动化分析 | `/tmp/build-{flavor}-{timestamp}.jsonl`（新增） |
| **控制台输出** | 实时观察构建进度 | `tee` 同时输出到控制台和日志文件 |
| **Gradle Build Scan** | Gradle 官方构建分析 | 可选启用 `--scan` |
| **WSL 系统日志** | WSL 实例级问题排查 | `dmesg` / `/var/log/syslog` |

**构建脚本日志增强（`build-gradle.sh` 改造）**

```bash
# 在 build-gradle.sh 中新增日志初始化
BUILD_ID="build-${TARGET_FLAVOR}-${BUILD_TIMESTAMP}"
JSON_LOG="/tmp/build-${TARGET_FLAVOR}-${BUILD_TIMESTAMP}.jsonl"

# 日志写入函数
log_json() {
    local level="$1"
    local stage="$2"
    local step="$3"
    local message="$4"
    local extra="${5:-{}}"
    
    printf '{"timestamp":"%s","level":"%s","stage":"%s","step":"%s","flavor":"%s","wsl_instance":"%s","build_id":"%s","message":"%s","extra":%s}\n' \
        "$(date -Iseconds)" "$level" "$stage" "$step" "$TARGET_FLAVOR" "$WSL_ID" "$BUILD_ID" "$message" "$extra" \
        >> "$JSON_LOG"
}

# 使用示例
log_json "INFO" "env-prep" "check-java" "Java version check" \
    "{\"java_version\":\"$(java -version 2>&1 | head -1)\",\"java_home\":\"$JAVA_HOME\"}"
```

### 3.2 WEB 端日志输出

| 渠道 | 用途 | 配置 |
|------|------|------|
| **构建日志文件** | 完整构建过程记录 | `apps/web/.build-logs/build-{timestamp}.log` |
| **结构化日志文件** | 机器解析、自动化分析 | `apps/web/.build-logs/build-{timestamp}.jsonl` |
| **控制台输出** | 实时观察构建进度 | `npm run build` 标准输出 |
| **Next.js 分析** | 构建产物分析 | `ANALYZE=true npm run build` |
| **Turbo 日志** | Monorepo 构建分析 | `turbo run build --summarize` |

**package.json 脚本增强**

```json
{
  "scripts": {
    "build": "node scripts/build-with-log.js",
    "build:raw": "next build",
    "build:analyze": "ANALYZE=true next build"
  }
}
```

### 3.3 统一日志收集脚本

**新增 `scripts/build-logger.js`**（monorepo 根目录）

```javascript
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class BuildLogger {
  constructor(options) {
    this.buildId = options.buildId || `build-${Date.now()}`;
    this.flavor = options.flavor || 'N/A';
    this.app = options.app || 'unknown';
    this.logDir = options.logDir || '.build-logs';
    this.jsonLogPath = path.join(this.logDir, `${this.buildId}.jsonl`);
    this.textLogPath = path.join(this.logDir, `${this.buildId}.log`);
    
    // 确保日志目录存在
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(level, stage, step, message, extra = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      stage,
      step,
      flavor: this.flavor,
      app: this.app,
      build_id: this.buildId,
      message,
      ...extra
    };
    
    // JSON Lines 格式写入
    fs.appendFileSync(this.jsonLogPath, JSON.stringify(entry) + '\n');
    
    // 人类可读格式写入
    const textLine = `[${entry.timestamp}] [${level}] [${stage}:${step}] [${this.flavor}] ${message}\n`;
    fs.appendFileSync(this.textLogPath, textLine);
    
    // 控制台输出（ERROR/WARN 级别输出到 stderr）
    if (level === 'ERROR' || level === 'WARN') {
      process.stderr.write(textLine);
    } else {
      process.stdout.write(textLine);
    }
  }

  info(stage, step, message, extra) { this.log('INFO', stage, step, message, extra); }
  warn(stage, step, message, extra) { this.log('WARN', stage, step, message, extra); }
  error(stage, step, message, extra) { this.log('ERROR', stage, step, message, extra); }
  debug(stage, step, message, extra) { this.log('DEBUG', stage, step, message, extra); }
}

module.exports = { BuildLogger };
```

---

## 4. 日志分级策略

### 4.1 日志级别定义

| 级别 | 使用场景 | 输出渠道 | 保留策略 |
|------|----------|----------|----------|
| **DEBUG** | 详细的调试信息：环境变量值、缓存目录内容、Gradle Task 输入输出哈希 | 仅文件日志 | 构建成功后保留 7 天 |
| **INFO** | 正常的构建进度：步骤开始/完成、关键配置值、产物生成确认 | 文件日志 + 控制台 | 保留 30 天 |
| **WARN** | 潜在问题但不阻断构建：缓存未命中、UP-TO-DATE 异常、配置值与预期不符 | 文件日志 + 控制台 + stderr | 保留 90 天 |
| **ERROR** | 构建失败或严重问题：任务失败、环境缺失、产物验证失败 | 文件日志 + 控制台 + stderr + 告警 | 永久保留 |

### 4.2 各级别使用示例

**DEBUG 级别**

```javascript
// 环境变量详细值（可能敏感，需脱敏）
logger.debug('env-prep', 'env-dump', 'Environment variables', {
  env: {
    PATH: process.env.PATH?.split(':').slice(0, 3).join(':') + '...',
    NODE_ENV: process.env.NODE_ENV,
    // 敏感值不记录原始值，只记录是否存在
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'UNSET',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'UNSET'
  }
});

// Gradle Task 输入文件列表
logger.debug('build', 'gradle-inputs', 'Task input files', {
  task: ':app:compileReleaseKotlin',
  input_files_count: 150,
  input_hash: 'a3f5c2...'
});
```

**INFO 级别**

```javascript
// 构建步骤开始/完成
logger.info('build', 'gradle-start', 'Starting Gradle build', {
  task: 'assembleGlobalRelease',
  gradle_version: '8.8',
  daemon: false
});

// 产物生成
logger.info('verify', 'artifact-generated', 'APK generated successfully', {
  artifact: {
    path: '.../linkchest-global-202605221430.apk',
    size_bytes: 75342123,
    sha256: 'a1b2c3...'
  }
});
```

**WARN 级别**

```javascript
// 缓存未命中（可能影响构建速度）
logger.warn('build', 'cache-miss', 'Gradle build cache miss', {
  task: ':app:compileReleaseKotlin',
  expected_cache_key: 'abc123...',
  reason: 'Input file changed: src/MainActivity.kt'
});

// 配置值与预期不符（构建仍能继续）
logger.warn('config-inject', 'env-market-check', '.env.market content mismatch', {
  expected: 'china',
  actual: 'global',
  path: '/tmp/.env.market.linkchest-cn',
  suggestion: 'Check if parallel build caused race condition'
});
```

**ERROR 级别**

```javascript
// 构建失败
logger.error('build', 'gradle-failed', 'Gradle build failed', {
  task: 'assembleChinaRelease',
  exit_code: 1,
  error: {
    code: 'CASE-001',
    matched_keyword: 'services.gradle.org',
    message: 'Gradle 镜像被重置为官方地址',
    suggestion: '执行 fix-gradle-mirror.sh 恢复镜像'
  }
});

// 产物验证失败
logger.error('verify', 'bundle-check-failed', 'China bundle contains global domain', {
  flavor: 'china',
  detected_domain: 'linkchest.net',
  bundle_path: '.../index.android.bundle',
  suggestion: 'Metro cache isolation may have failed'
});
```

---

## 5. 国内外版本差异化日志策略

### 5.1 差异化收集策略

| 维度 | 国内版 (`china`) | 海外版 (`global`) | 原因 |
|------|------------------|-------------------|------|
| **网络相关日志** | 详细记录：镜像地址、下载耗时、重试次数 | 标准记录 | 国内依赖国内镜像，网络问题更频繁 |
| **HTTP/HTTPS 配置** | 详细记录：`usesCleartextTraffic` 值、明文流量检测 | 标准记录 | 国内版使用 HTTP，需严格验证 |
| **域名验证** | 强制验证：bundle 中不含 `linkchest.net` | 可选验证 | 国内版绝不能包含海外域名 |
| **缓存隔离** | 详细记录：Metro 缓存目录、实例隔离状态 | 标准记录 | 国内版缓存隔离失败影响更大 |
| **登录组件** | 详细记录：第三方登录按钮渲染、市场配置回退 | 标准记录 | 国内版依赖 `/market/config` API |
| **构建环境** | 记录 WSL 实例 `linkchest-cn` 特有配置 | 记录 WSL 实例 `linkchest-global` 配置 | 双 WSL 架构需分别追踪 |

### 5.2 国内版专属日志检查点

```bash
# 在 build-gradle.sh 中新增国内版专属验证

if [ "$TARGET_FLAVOR" = "china" ]; then
    log_json "INFO" "verify" "china-bundle-check" "Starting China bundle verification"
    
    # 1. 验证 bundle 不含海外域名
    if grep -q "linkchest\.net" "$BUNDLE_FILE" 2>/dev/null; then
        log_json "ERROR" "verify" "china-bundle-check" "China bundle contains global domain" \
            "{\"detected_domain\":\"linkchest.net\",\"case\":\"CASE-E010\"}"
        exit 1
    fi
    
    # 2. 验证 usesCleartextTraffic 配置
    MANIFEST="app/build/intermediates/merged_manifest/release/AndroidManifest.xml"
    if [ -f "$MANIFEST" ]; then
        CLEARTEXT=$(grep -o 'android:usesCleartextTraffic="[^"]*"' "$MANIFEST" | cut -d'"' -f2)
        log_json "INFO" "verify" "china-manifest-check" "usesCleartextTraffic value" \
            "{\"usesCleartextTraffic\":\"$CLEARTEXT\"}"
        if [ "$CLEARTEXT" != "true" ]; then
            log_json "ERROR" "verify" "china-manifest-check" "usesCleartextTraffic must be true for China" \
                "{\"actual\":\"$CLEARTEXT\",\"expected\":\"true\"}"
            exit 1
        fi
    fi
    
    # 3. 验证包名
    APK_PACKAGE=$(aapt dump badging "$APK_RENAMED" 2>/dev/null | grep package | head -1)
    log_json "INFO" "verify" "china-package-check" "APK package name" \
        "{\"package_info\":\"$APK_PACKAGE\"}"
fi
```

### 5.3 海外版专属日志检查点

```bash
# 海外版专属验证

if [ "$TARGET_FLAVOR" = "global" ]; then
    # 1. 验证 HTTPS 配置
    log_json "INFO" "verify" "global-https-check" "Verifying HTTPS configuration"
    
    # 2. 验证 Google Services 配置存在
    if [ ! -f "app/google-services.json" ]; then
        log_json "WARN" "verify" "global-google-services" "google-services.json not found"
    fi
    
    # 3. 验证 bundle 包含海外域名（预期行为）
    if ! grep -q "linkchest\.net" "$BUNDLE_FILE" 2>/dev/null; then
        log_json "WARN" "verify" "global-bundle-check" "Global bundle may be missing API endpoint"
    fi
fi
```

---

## 6. 实施步骤

### 6.1 第一阶段：日志基础设施（Week 1）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| 创建 `scripts/build-logger.js` 统一日志库 | 开发 | 可复用的 Node.js 日志类 |
| 改造 `build-gradle.sh` 增加结构化日志 | 开发 | 支持 JSON Lines 输出的构建脚本 |
| 创建 `apps/web/scripts/build-with-log.js` | 开发 | WEB 端带日志的构建入口 |
| 创建 `.build-logs/.gitignore` | 开发 | 日志目录配置 |
| 验证日志格式正确性 | 测试 | 日志文件可解析、字段完整 |

### 6.2 第二阶段：关键节点覆盖（Week 2）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| APK 构建：环境准备阶段日志 | 开发 | JAVA_HOME/ANDROID_HOME/WSL 检测日志 |
| APK 构建：配置注入阶段日志 | 开发 | `.env.market` 三处写入确认日志 |
| APK 构建：Metro Bundler 日志捕获 | 开发 | Metro 完整输出重定向到日志文件 |
| APK 构建：Gradle Task 耗时日志 | 开发 | 每个 Task 的开始/结束/耗时 |
| APK 构建：产物验证阶段日志 | 开发 | APK 大小/SHA256/包名验证日志 |
| WEB 构建：环境变量快照日志 | 开发 | 构建前环境状态记录 |
| WEB 构建：Turbo 任务日志 | 开发 | 子任务耗时和缓存状态 |
| WEB 构建：Next.js 构建日志 | 开发 | 页面编译耗时和错误 |

### 6.3 第三阶段：自动化分析（Week 3）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| 创建 `scripts/analyze-build-log.js` | 开发 | 日志分析脚本 |
| 实现错误关键词自动匹配 | 开发 | 基于现有 CASE 库的关键词匹配 |
| 实现构建耗时趋势统计 | 开发 | 各环节耗时统计和趋势图 |
| 实现异常率统计 | 开发 | 按 flavor/阶段/错误类型统计 |
| 集成到 `build-error-diagnose` Skill | 开发 | Skill 读取结构化日志进行诊断 |

### 6.4 第四阶段：监控告警（Week 4）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| 构建失败自动通知 | 开发 | 构建失败时输出结构化错误报告 |
| 构建耗时异常检测 | 开发 | 耗时超过历史均值 150% 时 WARN |
| 缓存命中率监控 | 开发 | 缓存命中率低于 50% 时 WARN |
| 产物大小异常检测 | 开发 | APK/WEB 产物大小变化超过 20% 时 WARN |

### 6.5 第五阶段：持续优化（Week 5+）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| 基于日志数据优化构建流程 | 开发 | 识别耗时瓶颈并优化 |
| 补充未覆盖的案例 | 开发 | 新错误模式记录到案例集锦 |
| 日志数据驱动规则更新 | 维护 | 高频问题提炼为规则 |
| 构建异常率回顾 | 团队 | 周报/月报分析 |

---

## 7. 预期成果

### 7.1 量化目标

| 指标 | 当前基线 | 目标值 | 衡量方式 |
|------|----------|--------|----------|
| **APK 构建异常率** | ~30%（基于历史案例频率估算） | < 10% | 构建失败次数 / 总构建次数 |
| **WEB 构建异常率** | ~20% | < 5% | 构建失败次数 / 总构建次数 |
| **平均问题定位时间** | 15-30 分钟（手动查案例） | < 5 分钟 | 从构建失败到确定根因的时间 |
| **首次构建成功率** | ~60% | > 85% | 首次构建即成功的比例 |
| **国内版配置错误率** | ~15%（bundle 含海外域名等） | < 2% | 国内版产物验证失败次数 |

### 7.2 定性目标

1. **可观测性**：任何构建失败都能在 30 秒内从日志中定位到具体阶段和原因
2. **可预防性**：通过日志趋势分析，在构建失败前发现潜在问题（如缓存命中率下降）
3. **可复现性**：通过日志中的环境快照，能够 100% 复现构建环境
4. **自动化**：80% 的常见问题能够通过日志自动匹配案例并给出修复建议

### 7.3 成果验证方式

**日志质量检查清单**

- [ ] 每次构建产生完整的 JSON Lines 日志文件
- [ ] 日志包含所有必需字段（timestamp/level/stage/step/flavor/build_id）
- [ ] ERROR 级别日志包含错误码和修复建议
- [ ] 构建失败时日志最后 50 行包含明确的错误定位信息
- [ ] 国内版构建日志包含 bundle 域名验证结果
- [ ] 并行构建时两个实例的日志可区分（通过 build_id 和 wsl_instance）

**异常率统计脚本**

```bash
#!/bin/bash
# analyze-build-stats.sh
# 统计最近 N 次构建的异常率

LOG_DIR="/tmp"
DAYS=${1:-7}

echo "=== 构建异常率统计（最近 ${DAYS} 天）==="

for flavor in global china; do
    TOTAL=$(find "$LOG_DIR" -name "build-${flavor}-*.jsonl" -mtime -$DAYS | wc -l)
    FAILED=$(find "$LOG_DIR" -name "build-${flavor}-*.jsonl" -mtime -$DAYS -exec grep -l '"level":"ERROR"' {} \; | wc -l)
    
    if [ "$TOTAL" -gt 0 ]; then
        RATE=$(echo "scale=2; $FAILED * 100 / $TOTAL" | bc)
        echo "  ${flavor}: ${FAILED}/${TOTAL} (${RATE}%)"
    else
        echo "  ${flavor}: 无数据"
    fi
done
```

---

## 8. 关联文件与规则

| 文件 | 关系 | 说明 |
|------|------|------|
| [BUILD.md](BUILD.md) | 父规则 | 构建流程基础规范 |
| [BUILD_RED_LINES.md](BUILD_RED_LINES.md) | 关联规则 | 构建红线与关键词匹配表 |
| [HIGH_RISK.md](HIGH_RISK.md) | 关联规则 | 部署安全红线 |
| [cases/apk-build-errors.md](cases/apk-build-errors.md) | 案例库 | APK 构建异常案例 |
| [cases/service-build-errors.md](cases/service-build-errors.md) | 案例库 | 服务构建异常案例 |
| `build-error-diagnose` Skill | 关联 Skill | 构建错误自动诊断 |

---

*最后更新：2026-05-22*
*版本：v1.0*
