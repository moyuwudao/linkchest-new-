#!/bin/bash
exec > /tmp/wsl-debug-output.log 2>&1
echo "=== Debug start at $(date) ==="
echo "User: $(whoami)"
echo "PWD: $(pwd)"
echo "WSL_DISTRO_NAME: $WSL_DISTRO_NAME"

cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android
echo "After cd: $(pwd)"

# 模拟脚本中可能导致失败的命令
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# 测试 Java
echo "Java test:"
java -version

# 测试 Gradle
echo "Gradle test:"
./gradlew --version 2>&1 | head -10

# 模拟 BUILD_DIR 变量
BUILD_DIR=build-china
echo "BUILD_DIR: $BUILD_DIR"
ls -la "app/${BUILD_DIR}/generated" 2>&1
ls -la "app/${BUILD_DIR}/generated/assets" 2>&1
ls -la "app/${BUILD_DIR}/intermediates" 2>&1

# 模拟 rm -rf 命令（可能出问题的位置）
echo "--- bundle cleanup simulation ---"
JS_BUNDLE_DIR="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/${BUILD_DIR}/generated/assets"
JS_BUNDLE_RES="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/${BUILD_DIR}/generated/res"
EXPO_CONSTANTS_BUILD="/mnt/d/trae_projects/linkchest/project/apps/mobile/node_modules/expo-constants/android/build"

echo "Try rm with set -e:"
set -e
rm -rf "$JS_BUNDLE_DIR"/createBundle*ReleaseJsAndAssets
echo "JS_BUNDLE_DIR cleanup done"
rm -rf "$JS_BUNDLE_DIR"/*Bundle*
echo "JS_BUNDLE_DIR Bundle cleanup done"
rm -rf "$JS_BUNDLE_RES"/createBundle*ReleaseJsAndAssets
echo "JS_BUNDLE_RES cleanup done"
rm -rf "$JS_BUNDLE_RES"/*Bundle*
echo "JS_BUNDLE_RES Bundle cleanup done"
rm -rf "$EXPO_CONSTANTS_BUILD"
echo "EXPO_CONSTANTS cleanup done"

echo "=== Debug end at $(date) ==="
