#!/bin/bash
# 海外版构建 - 阶段1: 注入 MARKET 配置 + 清理缓存
set -e
cd /mnt/d/trae_projects/linkchest/project/apps/mobile

TARGET_FLAVOR=global
WSL_ID=linkchest-global
MARKET_VALUE=global

ENV_MARKET_SHARED="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market"
ENV_MARKET_FLAVOR="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market.${TARGET_FLAVOR}"
ENV_MARKET_ISOLATED="/mnt/d/trae_projects/linkchest/project/apps/mobile/.env.market.${WSL_ID}"

echo -n "$MARKET_VALUE" > "$ENV_MARKET_SHARED"
echo -n "$MARKET_VALUE" > "$ENV_MARKET_FLAVOR"
echo -n "$MARKET_VALUE" > "$ENV_MARKET_ISOLATED"

export MARKET="$MARKET_VALUE"
export WSL_DISTRO_NAME="$WSL_ID"

echo "STAGE1_INJECT_DONE"
echo "SHARED: $(cat $ENV_MARKET_SHARED)"
echo "FLAVOR: $(cat $ENV_MARKET_FLAVOR)"
echo "ISOLATED: $(cat $ENV_MARKET_ISOLATED)"
echo "MARKET=$MARKET"
echo "WSL_DISTRO_NAME=$WSL_DISTRO_NAME"

# 清理 bundle 缓存
METRO_CACHE_DIR="/tmp/metro-cache-${WSL_ID}"
if [ -d "$METRO_CACHE_DIR" ]; then
    rm -rf "$METRO_CACHE_DIR"/*
    echo "METRO_CACHE_CLEANED: $METRO_CACHE_DIR"
fi

# 清理 expo-constants 编译缓存
EXPO_CONSTANTS_BUILD="/mnt/d/trae_projects/linkchest/project/apps/mobile/node_modules/expo-constants/android/build"
if [ -d "$EXPO_CONSTANTS_BUILD" ]; then
    rm -rf "$EXPO_CONSTANTS_BUILD"
    echo "EXPO_CONSTANTS_CLEANED"
fi

# 清理所有 expo-*/react-native-*/android/build
for native_module in /mnt/d/trae_projects/linkchest/project/node_modules/expo-*/android \
                     /mnt/d/trae_projects/linkchest/project/node_modules/react-native-*/android; do
    if [ -d "$native_module/build" ]; then
        rm -rf "$native_module/build" 2>/dev/null || true
    fi
done
echo "NATIVE_MODULES_CLEANED"

# 清理 android/app/build-global
rm -rf /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build-global
rm -rf /mnt/d/trae_projects/linkchest/project/apps/mobile/android/build-global
echo "OLD_BUILD_GLOBAL_REMOVED"

echo "STAGE1_DONE"
