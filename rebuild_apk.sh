#!/bin/bash
# 清理并重新构建APK

export ANDROID_HOME=/opt/android-sdk
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"

cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 清理之前的构建
echo "=== 清理构建缓存 ==="
./gradlew clean --no-daemon

# 删除旧的构建目录
rm -rf build-fresh build-china

# 创建 local.properties
echo "sdk.dir=/opt/android-sdk" > local.properties

echo ""
echo "=== 开始构建 ==="
./gradlew assembleChinaRelease --no-daemon

echo ""
echo "=== 构建完成 ==="
find /mnt/d/trae_projects/linkchest/project/apps/mobile/android -name '*.apk' -newer /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build.gradle 2>/dev/null | head -5
