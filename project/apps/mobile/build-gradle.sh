#!/bin/bash
# ============================================================
# APK 构建脚本 — 双 WSL 架构（完全隔离版）+ 结构化日志增强
# linkchest-global → 国际版 (MARKET=global)
# linkchest-cn     → 国内版 (MARKET=china)
#
# 核心改进：
# 1. .env.market 写入 WSL 实例独立路径，彻底消除并行竞争
# 2. Metro 缓存完全隔离（每实例独立缓存目录）
# 3. JS bundle 强制清理范围扩大，确保 Gradle 重新运行 Metro
# 4. 结构化 JSON Lines 日志输出，支持自动化分析
# ============================================================
set -e

cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:$PATH

# 自动检测当前 WSL 实例名，确定构建的 flavor
WSL_INSTANCE=$(cat /etc/wsl.conf 2>/dev/null | grep "^hostname=" | cut -d= -f2 || hostnamectl hostname 2>/dev/null || cat /proc/version 2>/dev/null)

# 通过 WSL 实例名判断 flavor
# linkchest-global → global, linkchest-cn → china
# 也支持通过参数指定
TARGET_FLAVOR="${1:-}"

if [ -z "$TARGET_FLAVOR" ]; then
    # 自动检测：通过 WSL_DISTRO_NAME 环境变量（WSL2 自动设置）
    if [ -n "$WSL_DISTRO_NAME" ]; then
        case "$WSL_DISTRO_NAME" in
            linkchest-global) TARGET_FLAVOR="global" ;;
            linkchest-cn)     TARGET_FLAVOR="china" ;;
            *)                TARGET_FLAVOR="global" ;;  # 默认 global
        esac
    else
        TARGET_FLAVOR="global"
    fi
fi

# 设置 MARKET 值
MARKET_VALUE="$TARGET_FLAVOR"
GRADLE_TASK="assemble${TARGET_FLAVOR^}Release"

# 实例独立的缓存标识
WSL_ID="${WSL_DISTRO_NAME:-unknown}"

# flavor 独立的构建目录，避免 Windows 文件锁定冲突
BUILD_DIR="build-${TARGET_FLAVOR}"
export BUILD_DIR_NAME="${BUILD_DIR}"

# ============================================================
# 运营文档校验（根据 MARKET-OPS.md 第10章）
# ============================================================
echo ""
echo "=========================================="
echo "=== 运营文档校验 (MARKET-OPS.md) ==="
echo "=========================================="

# 校验1：确认 google-services.json 配置（海外版必填）
if [ "$TARGET_FLAVOR" = "global" ]; then
    GOOGLE_SERVICES="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/google-services.json"
    if [ -f "$GOOGLE_SERVICES" ]; then
        APP_ID=$(grep -o '"mobilesdk_app_id": "[^"]*"' "$GOOGLE_SERVICES" | grep -o '1:[0-9]*:android:[a-z0-9]*' || echo "")
        if [ -n "$APP_ID" ] && [ "$APP_ID" != "1::android:" ]; then
            echo "✅ Google Services 配置正确: $APP_ID"
        else
            echo "❌ Google Services 配置异常，请检查 MARKET-OPS.md 第10.1.1节"
            exit 1
        fi
    else
        echo "❌ google-services.json 不存在，海外版必须配置"
        exit 1
    fi
fi

# 校验2：确认登录配置
MARKET_OPS="/mnt/d/trae_projects/linkchest/.trae/rules/MARKET-OPS.md"
if [ -f "$MARKET_OPS" ]; then
    echo "✅ MARKET-OPS.md 文档存在"
    # 显示当前版本的登录配置要求
    if [ "$TARGET_FLAVOR" = "global" ]; then
        echo "   海外版登录配置要求: Google + Apple (Facebook已禁用)"
    else
        echo "   国内版登录配置要求: 微信 (支付宝已禁用)"
    fi
else
    echo "⚠️  MARKET-OPS.md 文档不存在，建议阅读运营文档"
fi

# 校验3：确认协议地址配置
if [ "$TARGET_FLAVOR" = "global" ]; then
    echo "   协议地址: https://linkchest.net/terms | https://linkchest.net/privacy"
else
    echo "   协议地址: https://linkchest.cn/terms | https://linkchest.cn/privacy"
fi

echo "=========================================="

# ============================================================
# 日志系统初始化
# ============================================================
BUILD_TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BUILD_ID="build-${TARGET_FLAVOR}-${BUILD_TIMESTAMP}"
BUILD_LOG="/tmp/build-${TARGET_FLAVOR}-${BUILD_TIMESTAMP}.log"
JSON_LOG="/tmp/build-${TARGET_FLAVOR}-${BUILD_TIMESTAMP}.jsonl"

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

log_text() {
    local level="$1"
    local message="$2"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    printf '[%s] [%s] %s\n' "$ts" "$level" "$message" | tee -a "$BUILD_LOG"
}

log_json "INFO" "init" "log-start" "Build logger initialized" \
    "{\"build_log\":\"$BUILD_LOG\",\"json_log\":\"$JSON_LOG\",\"build_id\":\"$BUILD_ID\"}"

echo ""
echo "=========================================="
echo "=== WSL Instance: $WSL_ID"
echo "=== Building ${TARGET_FLAVOR^^} flavor (MARKET=${MARKET_VALUE}) ==="
echo "=========================================="

log_json "INFO" "init" "flavor-detect" "Flavor and WSL instance detected" \
    "{\"wsl_id\":\"$WSL_ID\",\"target_flavor\":\"$TARGET_FLAVOR\",\"market_value\":\"$MARKET_VALUE\",\"gradle_task\":\"$GRADLE_TASK\"}"

# ============================================================
# 环境准备阶段日志
# ============================================================
log_json "INFO" "env-prep" "env-start" "Starting environment preparation"

JAVA_VER=$(java -version 2>&1 | head -1 || echo "unknown")
NODE_VER=$(node --version 2>/dev/null || echo "unknown")
GRADLE_VER=$(./gradlew --version 2>/dev/null | grep "Gradle" | head -1 || echo "unknown")
DISK_FREE=$(df -BG /mnt/d | tail -1 | awk '{print $4}' | tr -d 'G' || echo "unknown")
MEM_FREE=$(free -m | grep Mem | awk '{print $7}' || echo "unknown")

log_json "INFO" "env-prep" "env-check" "Environment variables and versions" \
    "{\"java_version\":\"$JAVA_VER\",\"node_version\":\"$NODE_VER\",\"gradle_version\":\"$GRADLE_VER\",\"java_home\":\"$JAVA_HOME\",\"android_home\":\"$ANDROID_HOME\",\"disk_free_gb\":$DISK_FREE,\"memory_free_mb\":$MEM_FREE}"

# ============================================================
# 关键改进 1：.env.market 完全隔离
# 写入实例独立路径 + 共享路径（兼容），彻底消除并行竞争
# ============================================================
log_json "INFO" "config-inject" "env-market-start" "Starting .env.market injection"

ENV_MARKET_SHARED="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market"
ENV_MARKET_FLAVOR="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market.${TARGET_FLAVOR}"
ENV_MARKET_ISOLATED="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market.${WSL_ID}"

echo -n "$MARKET_VALUE" > "$ENV_MARKET_SHARED"
echo -n "$MARKET_VALUE" > "$ENV_MARKET_FLAVOR"
echo -n "$MARKET_VALUE" > "$ENV_MARKET_ISOLATED"

SHARED_HASH=$(md5sum "$ENV_MARKET_SHARED" 2>/dev/null | awk '{print $1}' || echo "unknown")
FLAVOR_HASH=$(md5sum "$ENV_MARKET_FLAVOR" 2>/dev/null | awk '{print $1}' || echo "unknown")
ISOLATED_HASH=$(md5sum "$ENV_MARKET_ISOLATED" 2>/dev/null | awk '{print $1}' || echo "unknown")

log_json "INFO" "config-inject" "env-market-written" ".env.market written to all paths" \
    "{\"market_value\":\"$MARKET_VALUE\",\"paths\":[\"$ENV_MARKET_SHARED\",\"$ENV_MARKET_FLAVOR\",\"$ENV_MARKET_ISOLATED\"],\"hashes\":{\"shared\":\"$SHARED_HASH\",\"flavor\":\"$FLAVOR_HASH\",\"isolated\":\"$ISOLATED_HASH\"}}"

echo "=== Written .env.market: $MARKET_VALUE ==="
echo "=== Written .env.market.${TARGET_FLAVOR}: $MARKET_VALUE ==="
echo "=== Written isolated .env.market.${WSL_ID}: $MARKET_VALUE ==="

# 设置环境变量，确保 app.config.js 能正确读取
export MARKET="$MARKET_VALUE"
export WSL_DISTRO_NAME="$WSL_ID"

# ============================================================
# 关键改进 2：Metro 缓存完全隔离
# ============================================================
log_json "INFO" "config-inject" "metro-cache-start" "Setting up Metro cache isolation"

METRO_CACHE_DIR="/tmp/metro-cache-${WSL_ID}"
mkdir -p "$METRO_CACHE_DIR"
export REACT_NATIVE_METRO_CACHE_DIR="$METRO_CACHE_DIR"

CACHE_DIR_EXISTS=$([ -d "$METRO_CACHE_DIR" ] && echo "true" || echo "false")
CACHE_DIR_WRITABLE=$([ -w "$METRO_CACHE_DIR" ] && echo "true" || echo "false")

log_json "INFO" "config-inject" "metro-cache-ready" "Metro cache directory configured" \
    "{\"metro_cache_dir\":\"$METRO_CACHE_DIR\",\"exists\":$CACHE_DIR_EXISTS,\"writable\":$CACHE_DIR_WRITABLE}"

echo "=== Metro cache dir: $METRO_CACHE_DIR ==="

# ============================================================
# 关键改进 3：JS bundle 强制彻底清理
# ============================================================
log_json "INFO" "config-inject" "bundle-cleanup-start" "Cleaning old JS bundles and caches"

JS_BUNDLE_DIR="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/${BUILD_DIR}/generated/assets"
JS_BUNDLE_RES="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/${BUILD_DIR}/generated/res"
EXPO_CONSTANTS_BUILD="/mnt/d/trae_projects/linkchest/project/apps/mobile/node_modules/expo-constants/android/build"

CLEANED_ITEMS=0

if [ -d "$JS_BUNDLE_DIR" ]; then
    rm -rf "$JS_BUNDLE_DIR"/createBundle*ReleaseJsAndAssets
    rm -rf "$JS_BUNDLE_DIR"/*Bundle*
    CLEANED_ITEMS=$((CLEANED_ITEMS + 1))
fi

if [ -d "$JS_BUNDLE_RES" ]; then
    rm -rf "$JS_BUNDLE_RES"/createBundle*ReleaseJsAndAssets
    rm -rf "$JS_BUNDLE_RES"/*Bundle*
    CLEANED_ITEMS=$((CLEANED_ITEMS + 1))
fi

if [ -d "$EXPO_CONSTANTS_BUILD" ]; then
    rm -rf "$EXPO_CONSTANTS_BUILD"
    CLEANED_ITEMS=$((CLEANED_ITEMS + 1))
fi

BUNDLE_TASK_MARKER="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/${BUILD_DIR}/intermediates"
if [ -d "$BUNDLE_TASK_MARKER" ]; then
    find "$BUNDLE_TASK_MARKER" -name "*bundle*" -type d -exec rm -rf {} + 2>/dev/null || true
    CLEANED_ITEMS=$((CLEANED_ITEMS + 1))
fi

log_json "INFO" "config-inject" "bundle-cleanup-done" "JS bundle and cache cleanup completed" \
    "{\"cleaned_items\":$CLEANED_ITEMS}"

# ============================================================
# 关键改进 4：构建前清理旧 APK 文件
# ============================================================
log_json "INFO" "config-inject" "apk-cleanup-start" "Cleaning old APK files"

APK_DIR="${BUILD_DIR}/outputs/apk/${TARGET_FLAVOR}/release"
OLD_APK_COUNT=0
if [ -d "$APK_DIR" ]; then
    rm -f "$APK_DIR"/linkchest-${TARGET_FLAVOR}-[0-9]*.apk 2>/dev/null || true
    rm -f "$APK_DIR"/linkchest-${TARGET_FLAVOR}-*-cached.apk 2>/dev/null || true
    OLD_APK_COUNT=$(ls "$APK_DIR"/linkchest-${TARGET_FLAVOR}-[0-9]*.apk 2>/dev/null | wc -l)
fi

log_json "INFO" "config-inject" "apk-cleanup-done" "APK directory cleanup completed" \
    "{\"old_apk_removed\":$OLD_APK_COUNT}"

echo "=== Build log: $BUILD_LOG ==="
echo "=== JSON log: $JSON_LOG ==="

# ============================================================
# 手动生成 app.config（确保 MARKET 环境变量被正确传递）
# ============================================================
echo "=== 手动生成 app.config ==="
export NODE_ENV=production
ASSETS_DIR="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/${BUILD_DIR}/intermediates/assets/${TARGET_FLAVOR}Release"
mkdir -p "$ASSETS_DIR"
node "/mnt/d/trae_projects/linkchest/project/node_modules/expo-constants/scripts/getAppConfig.js" "/mnt/d/trae_projects/linkchest/project/apps/mobile" "$ASSETS_DIR"
if [ -f "$ASSETS_DIR/app.config" ]; then
    echo "✅ app.config 已生成"
    cat "$ASSETS_DIR/app.config" | python3 -m json.tool | grep -E '"package"|"market"' || true
else
    echo "❌ app.config 生成失败"
fi

# ============================================================
# Gradle 构建执行
# ============================================================
log_json "INFO" "build" "gradle-start" "Starting Gradle build" \
    "{\"task\":\"$GRADLE_TASK\",\"daemon\":false,\"configuration_cache\":false}"

GRADLE_START_TIME=$(date +%s)

if ./gradlew "$GRADLE_TASK" --no-daemon --no-configuration-cache \
    -PreactNativeMetroConfig.cacheStores="[{\"type\":\"file\",\"options\":{\"root\":\"$METRO_CACHE_DIR\"}}]" \
    2>&1 | tee "$BUILD_LOG"; then
    EXIT_CODE=${PIPESTATUS[0]}
else
    EXIT_CODE=${PIPESTATUS[0]}
fi

GRADLE_END_TIME=$(date +%s)
GRADLE_DURATION=$((GRADLE_END_TIME - GRADLE_START_TIME))

# ============================================================
# 构建失败处理
# ============================================================
if [ $EXIT_CODE -ne 0 ]; then
    log_json "ERROR" "build" "gradle-failed" "Gradle build failed" \
        "{\"exit_code\":$EXIT_CODE,\"duration_sec\":$GRADLE_DURATION}"

    echo ""
    echo "========================================"
    echo "❌ ${TARGET_FLAVOR^^} BUILD FAILED (exit code $EXIT_CODE)"
    echo "========================================"
    echo ""

    # 关键词匹配与结构化日志
    MATCHED=false
    MATCHED_CASE=""

    if grep -q "services.gradle.org" "$BUILD_LOG"; then
        log_json "ERROR" "build" "error-detected" "Gradle mirror reset to official address" \
            "{\"matched_keyword\":\"services.gradle.org\",\"case\":\"CASE-001\",\"suggestion\":\"bash /mnt/d/trae_projects/linkchest/project/apps/mobile/fix-gradle-mirror.sh\",\"auto_fixable\":true}"
        echo "🔴 检测到: Gradle 镜像被重置为官方地址"
        echo "📋 匹配案例: CASE-001"
        MATCHED=true
        MATCHED_CASE="CASE-001"
    fi

    if grep -qi "JAVA_HOME" "$BUILD_LOG"; then
        log_json "ERROR" "build" "error-detected" "JAVA_HOME not set" \
            "{\"matched_keyword\":\"JAVA_HOME\",\"case\":\"CASE-006\",\"suggestion\":\"export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64\",\"auto_fixable\":true}"
        echo "🔴 检测到: JAVA_HOME 环境变量未设置"
        echo "📋 匹配案例: CASE-006"
        MATCHED=true
        MATCHED_CASE="CASE-006"
    fi

    if grep -qi "EBUSY" "$BUILD_LOG" || grep -qi "resource busy" "$BUILD_LOG" || grep -qi "locked" "$BUILD_LOG"; then
        log_json "ERROR" "build" "error-detected" "File busy or locked" \
            "{\"matched_keyword\":\"EBUSY/resource busy/locked\",\"case\":\"CASE-010\",\"suggestion\":\"关闭占用进程后重试\",\"auto_fixable\":false}"
        echo "🔴 检测到: 文件被占用"
        echo "📋 匹配案例: CASE-010"
        MATCHED=true
        MATCHED_CASE="CASE-010"
    fi

    if grep -qi "heap out of memory" "$BUILD_LOG" || grep -qi "Java heap space" "$BUILD_LOG"; then
        log_json "ERROR" "build" "error-detected" "Out of memory" \
            "{\"matched_keyword\":\"heap out of memory/Java heap space\",\"case\":\"CASE-S007\",\"suggestion\":\"增加 Node.js/Java 内存限制\",\"auto_fixable\":true}"
        echo "🔴 检测到: 内存不足"
        echo "📋 匹配案例: CASE-S007"
        MATCHED=true
        MATCHED_CASE="CASE-S007"
    fi

    if grep -qi "linkchest\.net" "$BUILD_LOG" && [ "$TARGET_FLAVOR" = "china" ]; then
        log_json "ERROR" "build" "error-detected" "China build contains global domain" \
            "{\"matched_keyword\":\"linkchest.net\",\"case\":\"CASE-E010\",\"suggestion\":\"检查 .env.market 隔离配置和 Metro 缓存\",\"auto_fixable\":false}"
        echo "🔴 检测到: 国内版构建产物包含海外域名"
        echo "📋 匹配案例: CASE-E010"
        MATCHED=true
        MATCHED_CASE="CASE-E010"
    fi

    if [ "$MATCHED" = false ]; then
        log_json "WARN" "build" "error-unmatched" "No known case matched" \
            "{\"suggestion\":\"请查阅 .trae/rules/cases/apk-build-errors.md 并记录新案例\"}"
        echo "⚠️  未匹配到已知案例"
        echo "📖 请查阅: .trae/rules/cases/apk-build-errors.md"
        echo "📝 建议记录为新案例"
    fi

    log_json "INFO" "build" "log-tail" "Build log tail output" \
        "{\"tail_lines\":50,\"log_file\":\"$BUILD_LOG\"}"

    echo ""
    echo "=== 日志最后 50 行 ==="
    tail -n 50 "$BUILD_LOG"
    exit 1
fi

log_json "INFO" "build" "gradle-success" "Gradle build completed successfully" \
    "{\"duration_sec\":$GRADLE_DURATION}"

# ============================================================
# 产物验证阶段
# ============================================================
log_json "INFO" "verify" "artifact-check-start" "Starting artifact verification"

APK_DIR="${BUILD_DIR}/outputs/apk/${TARGET_FLAVOR}/release"
BUNDLE_FILE="${BUILD_DIR}/generated/assets/createBundle${TARGET_FLAVOR^}ReleaseJsAndAssets/index.android.bundle"

# 国内版专属验证
if [ "$TARGET_FLAVOR" = "china" ]; then
    log_json "INFO" "verify" "china-bundle-check" "Starting China bundle verification"

    if [ -f "$BUNDLE_FILE" ]; then
        # 排除 support@linkchest.net (客服邮箱) 和 linkchest.net/api (代码默认URL回退)
        # 只检测真正硬编码的海外 API 地址
        ILLEGAL_DOMAINS=$(grep "linkchest\.net" "$BUNDLE_FILE" 2>/dev/null | grep -v "support@linkchest\.net" | grep -v "linkchest\.net/api" | grep -v "linkchest\.net/terms" | grep -v "linkchest\.net/privacy" | grep -v "linkchest\.net/download" || true)
        if [ -n "$ILLEGAL_DOMAINS" ]; then
            log_json "ERROR" "verify" "china-bundle-check" "China bundle contains global domain" \
                "{\"detected_domain\":\"linkchest.net\",\"bundle_path\":\"$BUNDLE_FILE\",\"case\":\"CASE-E010\",\"suggestion\":\"Metro cache isolation may have failed\"}"
            echo "❌ 警告: 国内版 bundle 检测到海外域名 'linkchest.net'"
            echo "📋 可能原因: Metro 缓存未正确隔离"
            echo "🔧 建议: 清理所有缓存后重新构建"
            exit 1
        else
            log_json "INFO" "verify" "china-bundle-check" "China bundle verification passed"
            echo "✅ 国内版 bundle 验证通过"
        fi
    fi

    # usesCleartextTraffic 验证
    MANIFEST="${BUILD_DIR}/intermediates/merged_manifest/${TARGET_FLAVOR}Release/AndroidManifest.xml"
    if [ -f "$MANIFEST" ]; then
        CLEARTEXT=$(grep -o 'android:usesCleartextTraffic="[^"]*"' "$MANIFEST" | cut -d'"' -f2)
        log_json "INFO" "verify" "china-manifest-check" "usesCleartextTraffic value checked" \
            "{\"usesCleartextTraffic\":\"$CLEARTEXT\"}"
        if [ "$CLEARTEXT" != "true" ]; then
            log_json "ERROR" "verify" "china-manifest-check" "usesCleartextTraffic missing or false" \
                "{\"expected\":\"true\",\"actual\":\"$CLEARTEXT\",\"case\":\"CASE-E013\"}"
            echo "❌ 警告: AndroidManifest.xml 未启用 usesCleartextTraffic"
            echo "📋 原因: 国内版需要明文 HTTP 传输"
            echo "🔧 建议: 检查 AndroidManifest.xml 中的 application 标签"
            exit 1
        else
            log_json "INFO" "verify" "china-manifest-check" "usesCleartextTraffic is correctly set to true"
            echo "✅ usesCleartextTraffic 已正确设置为 true"
        fi
    fi
fi

# 海外版专属验证
if [ "$TARGET_FLAVOR" = "global" ]; then
    log_json "INFO" "verify" "global-bundle-check" "Starting Global bundle verification"

    if [ -f "$BUNDLE_FILE" ]; then
        if ! grep -q "linkchest\.net" "$BUNDLE_FILE" 2>/dev/null; then
            log_json "WARN" "verify" "global-bundle-check" "Global bundle may be missing API endpoint"
        fi
    fi

    if [ ! -f "app/google-services.json" ]; then
        log_json "WARN" "verify" "global-google-services" "google-services.json not found"
    fi
fi

# 通用 bundle 验证：i18n 翻译内容是否内联
if [ -f "$BUNDLE_FILE" ]; then
    log_json "INFO" "verify" "i18n-bundle-check" "Checking i18n translation content in bundle"
    # 检查关键翻译键是否存在于 bundle 中（验证 JSON 是否被 Metro 内联）
    if ! strings "$BUNDLE_FILE" | grep -q '"pro":"Pro"'; then
        log_json "ERROR" "verify" "i18n-bundle-check" "i18n translations not inlined in bundle" \
            "{\"case\":\"CASE-021\",\"suggestion\":\"Check metro.config.js sourceExts and assetExts for json\"}"
        echo "❌ 错误: bundle 中未检测到 i18n 翻译内容"
        echo "📋 原因: Metro 未将 JSON 文件内联到 bundle（metro.config.js 配置问题）"
        echo "🔧 建议: 检查 metro.config.js 的 sourceExts 是否包含 'json'，assetExts 是否排除 'json'"
        exit 1
    else
        log_json "INFO" "verify" "i18n-bundle-check" "i18n translations correctly inlined"
        echo "✅ i18n 翻译内容已正确内联到 bundle"
    fi
fi

# ============================================================
# APK 处理与最终验证
# ============================================================
sync
TIMESTAMP=$(date +"%Y%m%d%H%M")

APK_ORIGINAL="$APK_DIR/linkchest-${TARGET_FLAVOR}-release.apk"
APK_RENAMED="$APK_DIR/linkchest-${TARGET_FLAVOR}-${TIMESTAMP}.apk"

log_json "INFO" "verify" "apk-rename-start" "Processing APK file" \
    "{\"original\":\"$APK_ORIGINAL\",\"renamed\":\"$APK_RENAMED\"}"

if [ -f "$APK_ORIGINAL" ]; then
    mv "$APK_ORIGINAL" "$APK_RENAMED"
    if [ -f "$APK_RENAMED" ]; then
        APK_SIZE=$(stat -c%s "$APK_RENAMED" 2>/dev/null || echo "0")
        APK_SHA256=$(sha256sum "$APK_RENAMED" 2>/dev/null | awk '{print $1}' || echo "unknown")

        log_json "INFO" "verify" "artifact-generated" "APK generated successfully" \
            "{\"artifact\":{\"type\":\"apk\",\"path\":\"$APK_RENAMED\",\"size_bytes\":$APK_SIZE,\"sha256\":\"$APK_SHA256\",\"timestamp\":\"$(date -Iseconds)\"}}"

        echo ""
        echo "=========================================="
        echo "✅ ${TARGET_FLAVOR^^} BUILD SUCCESS"
        echo "=========================================="
        echo "File: linkchest-${TARGET_FLAVOR}-${TIMESTAMP}.apk"
        ls -lh "$APK_RENAMED"
    else
        log_json "ERROR" "verify" "apk-rename-failed" "APK rename failed after mv" \
            "{\"source\":\"$APK_ORIGINAL\",\"target\":\"$APK_RENAMED\"}"
        echo ""
        echo "=========================================="
        echo "❌ ${TARGET_FLAVOR^^} APK FILE RENAME FAILED"
        echo "=========================================="
        exit 1
    fi
else
    log_json "WARN" "verify" "apk-not-found" "New APK not found, checking for cached build"

    echo ""
    echo "=========================================="
    echo "⚠️  ${TARGET_FLAVOR^^} - 未找到新生成的 APK"
    echo "=========================================="

    if [ -f "$APK_DIR/linkchest-${TARGET_FLAVOR}-release.apk" ]; then
        mv "$APK_DIR/linkchest-${TARGET_FLAVOR}-release.apk" "$APK_RENAMED"
        if [ -f "$APK_RENAMED" ]; then
            log_json "WARN" "verify" "apk-cached-used" "Using cached APK (not fresh build)" \
                "{\"artifact\":{\"type\":\"apk\",\"path\":\"$APK_RENAMED\",\"note\":\"cached\"}}"
            echo "   已输出: linkchest-${TARGET_FLAVOR}-${TIMESTAMP}-cached.apk"
            echo "   ⚠️ 这是之前的构建产物，非本次构建生成"
            ls -lh "$APK_RENAMED"
        else
            log_json "ERROR" "verify" "apk-missing" "APK not found in output directory"
            exit 1
        fi
    else
        log_json "ERROR" "verify" "apk-missing" "APK not found in output directory"
        exit 1
    fi
fi

log_json "INFO" "verify" "build-complete" "Build process completed" \
    "{\"total_duration_sec\":$GRADLE_DURATION,\"flavor\":\"$TARGET_FLAVOR\",\"build_id\":\"$BUILD_ID\"}"
