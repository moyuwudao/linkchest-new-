#!/bin/bash
export ANDROID_HOME=/opt/android-sdk
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
cd /mnt/d/trae_projects/linkchest/project/apps/mobile/android

echo "=== React Native 版本 ==="
cat ../../node_modules/react-native/package.json | grep '"version"' | head -1

echo ""
echo "=== Gradle 插件目录 ==="
find ../../node_modules/@react-native/gradle-plugin -name "*.gradle" | head -10

echo ""
echo "=== Bundle 任务配置 ==="
grep -r "bundleJsAndAssets\|createBundle" ../../node_modules/@react-native/gradle-plugin/ 2>/dev/null | head -10
