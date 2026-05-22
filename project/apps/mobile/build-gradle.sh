#!/bin/bash
# ============================================================
# APK 构建脚本 — 双 WSL 架构
# linkchest-global → 国际版 (MARKET=global)
# linkchest-cn     → 国内版 (MARKET=china)
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

echo ""
echo "=========================================="
echo "=== WSL Instance: ${WSL_DISTRO_NAME:-unknown}"
echo "=== Building ${TARGET_FLAVOR^^} flavor (MARKET=${MARKET_VALUE}) ==="
echo "=========================================="

# 写入 .env.market 文件，app.config.js 会在 Metro 打包时读取
ENV_MARKET_FILE="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market"
echo -n "$MARKET_VALUE" > "$ENV_MARKET_FILE"
echo "=== Written .env.market: $MARKET_VALUE ==="

# 设置环境变量（双重保险）
export MARKET="$MARKET_VALUE"

# 日志捕获配置
BUILD_TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BUILD_LOG="/tmp/build-${TARGET_FLAVOR}-${BUILD_TIMESTAMP}.log"
echo "=== Build log: $BUILD_LOG ==="

# 执行构建
if ./gradlew "$GRADLE_TASK" --no-daemon --no-configuration-cache 2>&1 | tee "$BUILD_LOG"; then
    EXIT_CODE=${PIPESTATUS[0]}
else
    EXIT_CODE=${PIPESTATUS[0]}
fi

# 构建失败时自动分析
if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "❌ ${TARGET_FLAVOR^^} BUILD FAILED (exit code $EXIT_CODE)"
    echo "========================================"
    echo ""

    # 关键词匹配
    MATCHED=false

    if grep -q "services.gradle.org" "$BUILD_LOG"; then
        echo "🔴 检测到: Gradle 镜像被重置为官方地址"
        echo "📋 匹配案例: CASE-001"
        echo "🔧 解决: bash /mnt/d/trae_projects/linkchest/project/apps/mobile/fix-gradle-mirror.sh"
        MATCHED=true
    fi

    if grep -qi "JAVA_HOME" "$BUILD_LOG"; then
        echo "🔴 检测到: JAVA_HOME 环境变量未设置"
        echo "📋 匹配案例: CASE-006"
        echo "🔧 解决: export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
        MATCHED=true
    fi

    if grep -qi "EBUSY" "$BUILD_LOG" || grep -qi "resource busy" "$BUILD_LOG" || grep -qi "locked" "$BUILD_LOG"; then
        echo "🔴 检测到: 文件被占用"
        echo "📋 匹配案例: CASE-010"
        echo "🔧 解决: 关闭占用进程后重试"
        MATCHED=true
    fi

    if grep -qi "heap out of memory" "$BUILD_LOG" || grep -qi "Java heap space" "$BUILD_LOG"; then
        echo "🔴 检测到: 内存不足"
        echo "📋 匹配案例: CASE-S007"
        echo "🔧 解决: 增加 Node.js/Java 内存限制"
        MATCHED=true
    fi

    if [ "$MATCHED" = false ]; then
        echo "⚠️  未匹配到已知案例"
        echo "📖 请查阅: .trae/rules/cases/apk-build-errors.md"
        echo "📝 建议记录为新案例"
    fi

    echo ""
    echo "=== 日志最后 50 行 ==="
    tail -n 50 "$BUILD_LOG"
    exit 1
fi

# 构建成功，处理 APK
TIMESTAMP=$(date +"%Y%m%d-%H%M")
APK_DIR="app/build/outputs/apk/${TARGET_FLAVOR}/release"
APK_ORIGINAL="$APK_DIR/app-${TARGET_FLAVOR}-release.apk"

if [ -f "$APK_ORIGINAL" ]; then
    APK_RENAMED="$APK_DIR/linkchest-${TARGET_FLAVOR}-${TIMESTAMP}.apk"
    mv "$APK_ORIGINAL" "$APK_RENAMED"
    echo ""
    echo "=========================================="
    echo "✅ ${TARGET_FLAVOR^^} BUILD SUCCESS"
    echo "=========================================="
    echo "File: linkchest-${TARGET_FLAVOR}-${TIMESTAMP}.apk"
    ls -lh "$APK_RENAMED"
else
    # 检查是否已有重命名过的 APK
    EXISTING=$(ls "$APK_DIR"/linkchest-${TARGET_FLAVOR}-*.apk 2>/dev/null | head -1)
    if [ -n "$EXISTING" ]; then
        echo ""
        echo "=========================================="
        echo "✅ ${TARGET_FLAVOR^^} APK already exists"
        echo "=========================================="
        ls -lh "$EXISTING"
    else
        echo "=== APK NOT FOUND ==="
        echo "Looking in $APK_DIR:"
        ls -lh "$APK_DIR/" 2>/dev/null || echo "(directory not found)"
        exit 1
    fi
fi
