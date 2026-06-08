#!/bin/bash
# 调试模式：带 trap + set -x 的最小 build
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 启用详细追踪，输出到独立文件
exec 2>/tmp/wsl-build-trace.log
set -x

# 设置 trap 捕获所有退出信号
trap 'echo "EXIT at line $LINENO with code $?" >> /tmp/wsl-build-trace.log' ERR EXIT

# 模拟 build-gradle.sh 前 200 行
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:/opt/android-sdk/platform-tools:$PATH

# === Pre-check ===
test -f /mnt/d/trae_projects/linkchest/project/apps/mobile/MARKET-OPS.md && echo "MARKET-OPS.md OK"

# === env-prep ===
JAVA_VER=$(java -version 2>&1 | head -1 | sed 's/"/\\"/g')
NODE_VER=$(node --version)
GRADLE_VER=$(./gradlew --version 2>/dev/null | grep "Gradle" | head -1 | sed 's/"/\\"/g')
DISK_FREE=$(df -BG /mnt/d | tail -1 | awk '{print $4}' | tr -d 'G')
MEM_FREE=$(free -m | grep Mem | awk '{print $7}')
echo "Java: $JAVA_VER"
echo "Node: $NODE_VER"
echo "Gradle: $GRADLE_VER"
echo "Disk: $DISK_FREE G"
echo "Mem: $MEM_FREE M"

# === .env.market ===
ENV_MARKET_SHARED="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market"
ENV_MARKET_FLAVOR="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market.china"
ENV_MARKET_ISOLATED="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market.linkchest-cn"
echo -n "china" > "$ENV_MARKET_SHARED"
echo -n "china" > "$ENV_MARKET_FLAVOR"
echo -n "china" > "$ENV_MARKET_ISOLATED"
echo "Written .env.market files"

# === Metro cache ===
METRO_CACHE_DIR=/tmp/metro-cache-linkchest-cn
mkdir -p "$METRO_CACHE_DIR"
echo "Metro cache: $METRO_CACHE_DIR"

# === Bundle cleanup ===
JS_BUNDLE_DIR="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build-china/generated/assets"
JS_BUNDLE_RES="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build-china/generated/res"
EXPO_CONSTANTS_BUILD="/mnt/d/trae_projects/linkchest/project/apps/mobile/node_modules/expo-constants/android/build"

echo "Test JS_BUNDLE_DIR: $JS_BUNDLE_DIR"
ls -la "$JS_BUNDLE_DIR" 2>&1 || echo "JS_BUNDLE_DIR does not exist"
echo "Test JS_BUNDLE_RES: $JS_BUNDLE_RES"
ls -la "$JS_BUNDLE_RES" 2>&1 || echo "JS_BUNDLE_RES does not exist"
echo "Test EXPO_CONSTANTS_BUILD: $EXPO_CONSTANTS_BUILD"
ls -la "$EXPO_CONSTANTS_BUILD" 2>&1 || echo "EXPO_CONSTANTS_BUILD does not exist"

echo "Try cleanup with [ -d ] tests..."
if [ -d "$JS_BUNDLE_DIR" ]; then
    echo "JS_BUNDLE_DIR exists, cleaning"
    rm -rf "$JS_BUNDLE_DIR"/createBundle*ReleaseJsAndAssets
    rm -rf "$JS_BUNDLE_DIR"/*Bundle*
fi
if [ -d "$JS_BUNDLE_RES" ]; then
    echo "JS_BUNDLE_RES exists, cleaning"
    rm -rf "$JS_BUNDLE_RES"/createBundle*ReleaseJsAndAssets
    rm -rf "$JS_BUNDLE_RES"/*Bundle*
fi
if [ -d "$EXPO_CONSTANTS_BUILD" ]; then
    echo "EXPO_CONSTANTS_BUILD exists, cleaning"
    rm -rf "$EXPO_CONSTANTS_BUILD"
fi

echo "Done with basic cleanup"

# === Try the loop ===
echo "Starting native module loop..."
COUNT=0
for native_module in /mnt/d/trae_projects/linkchest/project/node_modules/expo-*/android \
                     /mnt/d/trae_projects/linkchest/project/node_modules/react-native-*/android; do
    if [ -d "$native_module/build" ]; then
        echo "Cleaning $native_module/build"
        rm -rf "$native_module/build" 2>/dev/null || true
        COUNT=$((COUNT + 1))
    fi
done
echo "Cleaned $COUNT native modules"

echo "=== Script reached end at $(date) ==="
trap - ERR EXIT  # 取消 trap，让脚本正常退出
exit 0
