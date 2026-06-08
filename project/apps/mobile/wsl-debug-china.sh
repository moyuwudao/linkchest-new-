#!/bin/bash
# 直接调试构建脚本执行流程
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 准备：环境变量与目录
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/build-tools/34.0.0:/usr/lib/jvm/java-17-openjdk-amd64/bin:$PATH

# 重置 .env.market
echo -n "china" > .env.market
echo -n "china" > .env.market.china
echo -n "china" > .env.market.linkchest-cn
export MARKET=china
export WSL_DISTRO_NAME=linkchest-cn

# 模拟脚本清理阶段
BUILD_DIR=build-china
TARGET_FLAVOR=china
EXPO_CONSTANTS_BUILD="/mnt/d/trae_projects/linkchest/project/apps/mobile/node_modules/expo-constants/android/build"
JS_BUNDLE_DIR="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/${BUILD_DIR}/generated/assets"
JS_BUNDLE_RES="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/${BUILD_DIR}/generated/res"

echo "--- Test cleanup commands ---"
echo "JS_BUNDLE_DIR=$JS_BUNDLE_DIR"
ls -la "$JS_BUNDLE_DIR" 2>&1
echo "JS_BUNDLE_RES=$JS_BUNDLE_RES"
ls -la "$JS_BUNDLE_RES" 2>&1
echo "EXPO_CONSTANTS_BUILD=$EXPO_CONSTANTS_BUILD"
ls -la "$EXPO_CONSTANTS_BUILD" 2>&1

echo "--- Run with bash -x and trap on ERR ---"
bash -x /mnt/d/trae_projects/linkchest/project/apps/mobile/build-gradle.sh china > /tmp/wsl-build-china-debug.log 2>&1
EXIT_CODE=$?
echo "EXIT_CODE=$EXIT_CODE"
echo "--- last 100 lines ---"
tail -100 /tmp/wsl-build-china-debug.log
