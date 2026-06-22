#!/bin/bash
# 设置环境变量
export ANDROID_HOME=/opt/android-sdk
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"

# 检查 keystore
keystore="/mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/linkchest-release.keystore"
echo "=== 检查 keystore ==="
keytool -list -v -keystore "$keystore" -alias linkchest -storepass 'LCHu192619!' | grep -E '(SHA1|SHA256)'

echo ""
echo "=== 开始构建 ==="
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

# 创建 local.properties
echo "sdk.dir=/opt/android-sdk" > local.properties

# 构建 release APK
./gradlew assembleChinaRelease --no-daemon

echo ""
echo "=== 构建完成 ==="
# 查找生成的 APK
find /mnt/d/trae_projects/linkchest/project/apps/mobile/android -name '*.apk' -newer /mnt/d/trae_projects/linkchest/project/apps/mobile/android/app/build.gradle 2>/dev/null | head -5
