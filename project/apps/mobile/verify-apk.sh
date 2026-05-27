#!/bin/bash
# APK验证脚本

AAPT2=/opt/android-sdk/build-tools/34.0.0/aapt2
APK_GLOBAL=/mnt/d/trae_projects/linkchest/project/apps/mobile/build-outputs/linkchest-global-20250527.apk
APK_CHINA=/mnt/d/trae_projects/linkchest/project/apps/mobile/build-outputs/linkchest-china-20250527.apk

echo "========================================"
echo "=== 海外版APK验证 ==="
echo "========================================"
echo "--- 包名 ---"
$AAPT2 dump packagename $APK_GLOBAL
echo ""
echo "--- 应用名称 ---"
$AAPT2 dump resources $APK_GLOBAL | grep -i "app_name" | head -1
echo ""

echo "========================================"
echo "=== 国内版APK验证 ==="
echo "========================================"
echo "--- 包名 ---"
$AAPT2 dump packagename $APK_CHINA
echo ""
echo "--- 应用名称 ---"
$AAPT2 dump resources $APK_CHINA | grep -i "app_name" | head -1
echo ""

echo "========================================"
echo "=== 验证完成 ==="
echo "========================================"
